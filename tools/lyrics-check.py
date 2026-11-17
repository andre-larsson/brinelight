#!/usr/bin/env python3
"""Check the Jukebox lyrics (js/lyrics.js) against what Gemini actually sang, for the review page.

  ~/code/qwen3-asr/.venv/bin/python tools/lyrics-check.py [song keys...]   (all songs with lyrics if none given)
  node tools/lyrics-review.js                                              (then open the page it prints)

Needs a Python with torch + torchaudio (CUDA) and the qwen-asr package, ffmpeg, and a whisper.cpp build with
ggml-large-v3-turbo.bin (--whisper DIR, default ~/code/whisper.cpp). For each song it:
  1. splits the voice off the mix (torchaudio's Hybrid Demucs);
  2. cuts the voice into sung phrases at its silences;
  3. transcribes each phrase blind, with two unrelated models: Qwen3-ASR-1.7B (GPU) and whisper large-v3-turbo (CPU);
  4. works out which written parts were sung, in what order, from Qwen's words (an alignment that may jump from the
     end of any line to the start of any part, so a chorus sung first or twice is found), and whisper's order too;
  5. times every line of that sung order with MMS forced alignment on the voice;
  6. lines each model's words up against the sung order and marks every line:
       ok      both models heard exactly the written words;
       likely  one of them did;
       changed both heard the same thing, and it differs from the written words;
       check   neither heard the written words, and they disagree with each other;
     plus "extra" rows where both models heard words, between the same two lines, that match no written line.
Writes .lyrics/ (git-ignored): audio/<key>-voice.mp3, work/<key>/ (phrase clips and transcripts, reused while the
song file is unchanged) and data.json, which tools/lyrics-review.js serves.
A model's word that differs only in spelling (walkin'/walking, 25/twenty-five) counts as the same word."""
import argparse, hashlib, json, math, os, re, subprocess, sys, time
from difflib import SequenceMatcher
from functools import lru_cache

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, '.lyrics')
SR = 16000
MAX_CLIP = 20     # seconds: Qwen and whisper both hear best in clips of a few lines
CLIPS_VERSION = 2  # bump when phrases() changes, so cached clips and transcripts are redone

# ---------------------------------------------------------------- the songs and their written words

def load_songs():
    js = ("globalThis.BL={};require('./js/lyrics.js');process.stdout.write(JSON.stringify(BL.LYRICS))")
    lyrics = json.loads(subprocess.run(['node', '-e', js], cwd=ROOT, capture_output=True, text=True, check=True).stdout)
    ui = open(os.path.join(ROOT, 'js', 'ui.js'), encoding='utf-8').read()
    songs = {}
    for m in re.finditer(r"^\s*(\w+): \{ src: '(music/songs/[^']+\.mp3)'.*?name: (?:'([^']*)'|\"([^\"]*)\")", ui, re.M):
        key, src, name = m.group(1), m.group(2), m.group(3) or m.group(4)
        if key in lyrics:
            songs[key] = {'key': key, 'src': src, 'name': name, 'text': lyrics[key]}
    return songs


def parse_parts(text):
    """[{heading, lines:[str]}] in written order."""
    parts, cur = [], None
    for raw in text.split('\n'):
        ln = raw.strip()
        if not ln:
            continue
        if ln.startswith('[') and ln.endswith(']'):
            cur = {'heading': ln[1:-1], 'lines': []}
            parts.append(cur)
        else:
            if cur is None:
                cur = {'heading': '', 'lines': []}
                parts.append(cur)
            cur['lines'].append(ln)
    return parts

# ---------------------------------------------------------------- words

ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split()
TENS = 'x x twenty thirty forty fifty sixty seventy eighty ninety'.split()

def num_words(n):
    if n < 20: return [ONES[n]]
    if n < 100: return [TENS[n // 10]] + ([ONES[n % 10]] if n % 10 else [])
    if n < 1000: return [ONES[n // 100], 'hundred'] + (num_words(n % 100) if n % 100 else [])
    return [str(n)]

SAME = {'cause': 'because', 'cuz': 'because', 'em': 'them', 'til': 'till', 'until': 'till', 'okay': 'ok',
        'ya': 'you', 'yeah': 'yes', 'gonna': 'going', 'oh': 'o', 'ooh': 'o', 'whoa': 'o', 'woah': 'o'}

def ck(w):
    """Comparison key: how a word sounds, near enough. walkin' = walking, 'cause = because."""
    w = w.lower().replace('’', "'")
    w = re.sub(r"[^a-z0-9']", '', w)
    if w.endswith("in'"):
        w = w[:-1] + 'g'
    w = w.replace("'", '')
    return SAME.get(w, w)


def split_words(text):
    """Words of a line or a transcript as [(raw, key, optional)]. Words in (parentheses) are backing vocals:
    optional. Digits become words. Hyphens and dashes split words."""
    out, depth = [], 0
    for piece in re.findall(r"\(|\)|[^\s()\-—–]+", text):
        if piece == '(':
            depth += 1; continue
        if piece == ')':
            depth = max(0, depth - 1); continue
        m = re.fullmatch(r"(\D*)(\d+)(\D*)", piece)
        if m:
            for i, nw in enumerate(num_words(int(m.group(2)))):
                out.append((piece if i == 0 else '', nw, depth > 0))
            continue
        k = ck(piece)
        if k:
            out.append((piece, k, depth > 0))
    return out


def mms_word(w):
    w = w.lower().replace('’', "'")
    return re.sub(r"[^a-z']", '', w).strip("'") or ''


@lru_cache(maxsize=None)
def sim(a, b):
    if a == b:
        return 2.0
    if SequenceMatcher(None, a, b).ratio() >= 0.75:
        return 0.5
    return -1.0

# ---------------------------------------------------------------- audio

def decode(path, sr, ch):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', str(ch), '-ar', str(sr), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, ch).T.copy()


def encode(arr, sr, path, extra=()):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ac', str(arr.shape[0]), '-ar', str(sr), '-i', '-',
                    *extra, path], input=np.ascontiguousarray(arr.T).astype(np.float32).tobytes(), check=True)


class Separator:
    def __init__(self, torch, torchaudio):
        self.torch, self.ta = torch, torchaudio
        self.model = torchaudio.pipelines.HDEMUCS_HIGH_MUSDB_PLUS.get_model().to('cuda').eval()

    def vocals(self, mix):  # (2, n) at 44.1 kHz -> (2, n)
        torch = self.torch
        seg, ov = 10 * 44100, 44100
        mixt = torch.from_numpy(mix)
        ref = mixt.mean(0)
        x = ((mixt - ref.mean()) / ref.std()).unsqueeze(0).to('cuda')
        n = x.shape[-1]
        acc = torch.zeros(len(self.model.sources), 2, n, device='cuda')
        fade = self.ta.transforms.Fade(fade_in_len=0, fade_out_len=ov, fade_shape='linear')
        start, end = 0, seg + ov
        with torch.no_grad():
            while start < n - ov:
                o = fade(self.model(x[:, :, start:end]))[0]
                acc[:, :, start:start + o.shape[-1]] += o
                if start == 0:
                    fade.fade_in_len = ov; start += seg - ov
                else:
                    start += seg
                end += seg
        acc = acc * ref.std().to('cuda') + ref.mean().to('cuda')
        return acc[self.model.sources.index('vocals')].cpu().numpy()


def phrases(voice, hop=320):
    """Sung stretches of a 16 kHz voice track, as (start, end) seconds, merged into clips of up to ~10 s."""
    n = len(voice) // hop
    rms = np.sqrt(np.mean(voice[:n * hop].reshape(n, hop) ** 2, axis=1))
    db = 20 * np.log10(rms + 1e-9)
    ref = np.percentile(db[db > -80], 95) if np.any(db > -80) else -20
    on = db > ref - 28
    fps = SR / hop
    runs, i = [], 0
    while i < n:
        if on[i]:
            j = i
            while j < n and on[j]: j += 1
            runs.append([i, j]); i = j
        else:
            i += 1
    merged = []
    for r in runs:  # close gaps under 0.3 s
        if merged and r[0] - merged[-1][1] < 0.3 * fps:
            merged[-1][1] = r[1]
        else:
            merged.append(r)
    merged = [(a / fps, b / fps) for a, b in merged if b - a >= 0.25 * fps]
    clips = []
    for a, b in merged:
        if clips and b - clips[-1][0] <= 10 and a - clips[-1][1] <= 1.2:
            clips[-1][1] = b
        else:
            clips.append([a, b])
    # a rap barely breathes: cut any clip over MAX_CLIP s at its quietest 0.1 s, away from the ends
    smooth = np.convolve(rms, np.ones(5) / 5, mode='same')
    out, todo = [], [(a, b, 0.2, 0.2) for a, b in clips[::-1]]  # (start, end, padding before, after)
    while todo:
        a, b, pa, pb = todo.pop()
        if b - a <= MAX_CLIP:
            out.append((a - pa, b + pb)); continue
        lo, hi = int((a + 6) * fps), int((b - 6) * fps)
        cut = (lo + int(np.argmin(smooth[lo:hi]))) / fps
        todo += [(cut, b, 0.0, pb), (a, cut, pa, 0.0)]  # no padding at a cut, so no word is heard twice
    dur = len(voice) / SR
    return [(max(0.0, a), min(dur, b)) for a, b in out]

# ---------------------------------------------------------------- transcription

JUNK = re.compile(r"thank you|see you next time|transcription by|castingwords|subtitles by|amara\.org|please subscribe", re.I)

def clean_transcript(text):
    text = re.sub(r"\[[^\]]*\]|\([^)]*\)|♪|\*[^*]*\*", ' ', text)
    if JUNK.search(text) and len(text.split()) <= 8:
        return ''
    return re.sub(r'\s+', ' ', text).strip()


def run_whisper(whisper_dir, files, threads):
    cli = os.path.join(whisper_dir, 'build', 'bin', 'whisper-cli')
    model = os.path.join(whisper_dir, 'models', 'ggml-large-v3-turbo.bin')
    cmd = [cli, '-m', model, '-l', 'en', '-mc', '0', '-t', str(threads), '-oj', '-np']
    for f in files:
        cmd += ['-f', f]
    return subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def read_whisper(f):
    try:
        d = json.load(open(f + '.json', encoding='utf-8'))
    except (OSError, ValueError):
        return ''
    return clean_transcript(' '.join(s.get('text', '') for s in d.get('transcription', [])))

# ---------------------------------------------------------------- order: which parts were sung, in what order

INS, DEL, DEL_OPT, X_INS, ENTER_X, LEAVE_X = -1.0, -0.7, -0.1, -0.6, -2.5, -2.5
PART_COST = 8.0  # what each sung part must win back in the two transcripts to count
FILLER = {'o', 'ah', 'uh', 'um', 'hey', 'mm', 'mmm', 'hmm', 'huh', 'la', 'na', 'da'}  # sung sounds: never an error


def sung_order(parts, toks):
    """parts: [[(key, optional, line_no)]] distinct parts; toks: [key] transcript words in time order.
    Returns (sequence of part indices, score). A path may leave a part at the end of any line, take words that
    match nothing (extra singing, or a model making things up) and enter any part at its start."""
    sizes = [len(p) for p in parts]
    bounds = []  # per part: is position j a line boundary (between lines, or at either end)
    for p in parts:
        b = [True] + [p[j][2] != p[j - 1][2] for j in range(1, len(p))] + [True]
        bounds.append(b)
    NEG = -1e18
    T = len(toks)
    # column = {state: (score, back)}; state = (k, j) or 'X'; back = (op, prev_state)
    cols = []

    def deletions(col):
        for k, p in enumerate(parts):  # left to right
            for j in range(sizes[k]):
                s = col.get((k, j))
                if s is None: continue
                c = s[0] + (DEL_OPT if p[j][1] else DEL)
                t = col.get((k, j + 1))
                if t is None or c > t[0]:
                    col[(k, j + 1)] = (c, ('D', (k, j)))

    def settle(col):
        deletions(col)
        best, arg = NEG, None
        for (st, v) in col.items():
            if st != 'X' and bounds[st[0]][st[1]] and v[0] > best:
                best, arg = v[0], st
        if arg is not None:
            x = col.get('X')
            if x is None or best + ENTER_X > x[0]:
                col['X'] = (best + ENTER_X, ('EX', arg))
        x = col.get('X')
        if x is not None:
            changed = False
            for k in range(len(parts)):
                c = x[0] + LEAVE_X
                t = col.get((k, 0))
                if t is None or c > t[0]:
                    col[(k, 0)] = (c, ('LX', 'X')); changed = True
            if changed:  # deletions again from the new starts (all costs are negative, so no loop back to X pays)
                deletions(col)
        return col

    col0 = {'X': (0.0, ('S', None))}
    for k in range(len(parts)):
        col0[(k, 0)] = (0.0, ('S', None))
    cols.append(settle(col0))
    for i in range(T):
        prev, col, w = cols[-1], {}, toks[i]
        floor = prev.get('X', (NEG,))[0] - 40  # prune hopeless states
        for st, (sc, _) in prev.items():
            if st == 'X':
                c = sc + X_INS
                if 'X' not in col or c > col['X'][0]:
                    col['X'] = (c, ('XI', 'X'))
                continue
            if sc < floor:
                continue
            k, j = st
            c = sc + INS
            if st not in col or c > col[st][0]:
                col[st] = (c, ('I', st))
            if j < sizes[k]:
                c = sc + sim(w, parts[k][j][0])
                nt = (k, j + 1)
                if nt not in col or c > col[nt][0]:
                    col[nt] = (c, ('M', st))
        cols.append(settle(col))
    last = cols[-1]  # end: any boundary state or X
    best, arg = NEG, None
    for st, v in last.items():
        if (st == 'X' or bounds[st[0]][st[1]]) and v[0] > best:
            best, arg = v[0], st
    seq, i, st = [], T, arg
    while st is not None:
        sc, (op, prev) = cols[i][st]
        if op == 'S':
            if st != 'X':
                seq.append(st[0])
            break
        if op == 'LX':
            seq.append(st[0])
        if op in ('M', 'I', 'XI'):
            i -= 1
        st = prev
    seq.reverse()
    return seq, best

# ---------------------------------------------------------------- line up a model's words with the sung lines

def line_up(lyr, toks):
    """lyr: [(key, optional, line_id)] in sung order; toks: [(raw, key, clip)] in time order.
    Global alignment. Returns (score, ops), ops [(op, [lyr index], [tok index])]: M (a heard word for a written one),
    M2 (two heard words that make one written word: brine light = brinelight), S2 (one heard word for two written
    ones), D (a written word not heard), I (a heard word not written)."""
    L, T = len(lyr), len(toks)
    NEG = -1e18
    sc = [[NEG] * (L + 1) for _ in range(T + 1)]
    bk = [[0] * (L + 1) for _ in range(T + 1)]
    dl = [DEL_OPT if x[1] else DEL for x in lyr]
    lk = [x[0] for x in lyr]
    tk = [t[1] for t in toks]
    sc[0][0] = 0.0
    for j in range(1, L + 1):
        sc[0][j] = sc[0][j - 1] + dl[j - 1]; bk[0][j] = 2
    for i in range(1, T + 1):
        wi = tk[i - 1]
        row, prow, brow = sc[i], sc[i - 1], bk[i]
        pair = tk[i - 2] + wi if i >= 2 else None
        pprow = sc[i - 2] if i >= 2 else None
        row[0] = prow[0] + X_INS; brow[0] = 1
        for j in range(1, L + 1):
            lw = lk[j - 1]
            best, b = prow[j - 1] + sim(wi, lw), 0
            c = prow[j] + X_INS
            if c > best: best, b = c, 1
            c = row[j - 1] + dl[j - 1]
            if c > best: best, b = c, 2
            if pair is not None and pair[0] == lw[0] and len(pair) >= len(lw) - 2:
                s = sim(pair, lw)
                if s > 0 and pprow[j - 1] + s > best: best, b = pprow[j - 1] + s, 3
            if j >= 2 and wi == lk[j - 2] + lw:
                c = prow[j - 2] + 2.0
                if c > best: best, b = c, 4
            row[j], brow[j] = best, b
    ops, i, j = [], T, L
    while i > 0 or j > 0:
        b = bk[i][j]
        if b == 0: ops.append(('M', [j - 1], [i - 1])); i -= 1; j -= 1
        elif b == 1: ops.append(('I', [], [i - 1])); i -= 1
        elif b == 2: ops.append(('D', [j - 1], [])); j -= 1
        elif b == 3: ops.append(('M2', [j - 1], [i - 2, i - 1])); i -= 2; j -= 1
        else: ops.append(('S2', [j - 2, j - 1], [i - 1])); i -= 1; j -= 2
    ops.reverse()
    return sc[T][L], ops


def evidence(lines, lyr, toks, ops):
    """Per sung line: the heard words (each ok, near, sub or ins), its error count, and what was heard at each written
    word ('at': its key, '' if missed, None if unknown); plus the runs of 3+ heard words between lines that fit no
    line (gaps, keyed by the line before them, None at the start)."""
    nwords, first_of = {}, {}
    for idx, (_, _, lid) in enumerate(lyr):
        nwords[lid] = nwords.get(lid, 0) + 1
        first_of.setdefault(lid, idx)
    per = {ln['id']: {'words': [], 'err': 0, 'at': [None] * nwords.get(ln['id'], 0), 'raw': [None] * nwords.get(ln['id'], 0)}
           for ln in lines}
    first_clip = {}  # line -> clip of its first heard word
    for op, ls, ts in ops:
        if ls and ts:
            first_clip.setdefault(lyr[ls[0]][2], toks[ts[0]][2])
    gaps, pending, cur, done = {}, [], None, {}

    def add_ins(lid, t):
        per[lid]['words'].append({'w': toks[t][0], 's': 'ins'})
        per[lid]['err'] += toks[t][1] not in FILLER

    def flush(next_line):
        # a run of 3+ words between lines is a gap; a shorter one joins the next line if it is in the same clip
        nonlocal pending
        if pending:
            if len(pending) >= 3:
                gaps.setdefault(cur, []).extend(pending)
            else:
                target = cur
                if next_line is not None and (cur is None or first_clip.get(next_line) == toks[pending[0]][2]):
                    target = next_line
                if target is not None:
                    for t in pending:
                        add_ins(target, t)
        pending = []

    for op, ls, ts in ops:
        if op == 'I':
            if cur is not None and done.get(cur, 0) < nwords[cur]:
                add_ins(cur, ts[0])
            else:
                pending.append(ts[0])
            continue
        lid = lyr[ls[0]][2]
        if lid != cur:
            flush(lid)
            cur = lid
        for li in ls:
            done[lyr[li][2]] = done.get(lyr[li][2], 0) + 1
        if op == 'D':
            li = ls[0]
            per[lid]['at'][li - first_of[lid]] = ''
            if not lyr[li][1]:
                per[lid]['err'] += 1
        elif op == 'M':
            li, t = ls[0], ts[0]
            s = sim(toks[t][1], lyr[li][0])
            kind = 'ok' if s == 2.0 else ('near' if s == 0.5 else 'sub')
            per[lid]['words'].append({'w': toks[t][0], 's': kind})
            per[lid]['at'][li - first_of[lid]] = toks[t][1]
            per[lid]['raw'][li - first_of[lid]] = toks[t][0]
            per[lid]['err'] += kind != 'ok'
        elif op == 'M2':
            li = ls[0]
            joined = toks[ts[0]][1] + toks[ts[1]][1]
            kind = 'ok' if joined == lyr[li][0] else 'near'
            for t in ts:
                per[lid]['words'].append({'w': toks[t][0], 's': kind})
            per[lid]['at'][li - first_of[lid]] = joined
            per[lid]['raw'][li - first_of[lid]] = toks[ts[0]][0] + ' ' + toks[ts[1]][0]
            per[lid]['err'] += kind != 'ok'
        else:  # S2: one heard word for two written ones, maybe across two lines
            per[lid]['words'].append({'w': toks[ts[0]][0], 's': 'ok'})
            for li in ls:
                l2 = lyr[li][2]
                per[l2]['at'][li - first_of[l2]] = lyr[li][0]
            cur = lyr[ls[-1]][2]
    flush(None)
    return per, gaps

# ---------------------------------------------------------------- MMS timing

class Timer:
    def __init__(self, torch, torchaudio):
        self.torch, self.F = torch, torchaudio.functional
        b = torchaudio.pipelines.MMS_FA
        self.model = b.get_model(with_star=True).to('cuda').eval()
        self.dict = b.get_dict(star='*')

    def emissions(self, voice16):
        torch = self.torch
        x = torch.from_numpy(voice16).unsqueeze(0)
        win, pad, n = 20 * SR, 2 * SR, x.shape[-1]
        parts = []
        with torch.no_grad():
            for s in range(0, n, win):
                a, b = max(0, s - pad), min(n, s + win + pad)
                em, _ = self.model(x[:, a:b].to('cuda'))
                em = em[0]
                fr = em.shape[0] / (b - a)
                parts.append(em[int(round((s - a) * fr)):int(round((min(n, s + win) - a) * fr))])
        return torch.cat(parts), n / SR

    def time_lines(self, em, dur, line_words):
        """line_words: [[mms word]] per line in sung order -> [(start, end)] seconds."""
        torch = self.torch
        words, owner = ['*'], [-1]
        for i, ws in enumerate(line_words):
            for w in ws:
                words.append(w); owner.append(i)
            words.append('*'); owner.append(-1)
        tokens = [self.dict[c] for w in words for c in w if c in self.dict]
        ali, scores = self.F.forced_align(em.unsqueeze(0), torch.tensor([tokens], dtype=torch.int32, device='cuda'), blank=0)
        spans = self.F.merge_tokens(ali[0], scores[0].exp())
        spf = dur / em.shape[0]
        out = [[None, None] for _ in line_words]
        i = 0
        for w, o in zip(words, owner):
            n = len([c for c in w if c in self.dict])
            sp = spans[i:i + n]; i += n
            if o < 0 or not sp:
                continue
            a, b = sp[0].start * spf, sp[-1].end * spf
            if out[o][0] is None: out[o][0] = a
            out[o][1] = b
        last = 0.0
        for o in out:  # a line without letters gets its neighbour's time
            if o[0] is None: o[0] = o[1] = last
            last = o[1]
        return [(round(a, 2), round(b, 2)) for a, b in out]

# ---------------------------------------------------------------- per song

def status_of(q, w, written_keys, agree):
    if q['err'] == 0 and w['err'] == 0 and (q['words'] or w['words']):
        return 'ok'
    if (q['err'] == 0 and q['words']) or (w['err'] == 0 and w['words']):
        return 'likely'
    qk = [ck(x['w']) for x in q['words'] if ck(x['w'])]
    wk = [ck(x['w']) for x in w['words'] if ck(x['w'])]
    if agree or (qk and qk == wk and qk != written_keys):
        return 'changed'
    return 'check'


def heading_for(parts, distinct_of, k, nth):
    """The n-th sung instance of distinct part k takes the heading of its n-th written instance (or its last)."""
    written = [i for i, d in enumerate(distinct_of) if d == k]
    return parts[written[min(nth, len(written) - 1)]]['heading']


def analyse(song, clips, qtexts, wtexts, timer, voice16):
    parts = parse_parts(song['text'])
    distinct, distinct_of, by_key = [], [], {}  # parts with the same words are one part, sung any number of times
    for p in parts:
        keyed = tuple(k for ln in p['lines'] for (_, k, _) in split_words(ln))
        if keyed not in by_key:
            by_key[keyed] = len(distinct)
            distinct.append(p)
        distinct_of.append(by_key[keyed])
    dparts = [[(k, opt, li) for li, ln in enumerate(p['lines']) for (_, k, opt) in split_words(ln)] for p in distinct]

    def toks_of(texts):
        return [(raw, k, ci) for ci, t in enumerate(texts) for raw, k, _ in split_words(t)]

    def build(seq):
        rows, lines, lyr, seen = [], [], [], {}
        for k in seq:
            nth = seen.get(k, 0); seen[k] = nth + 1
            rows.append({'type': 'part', 'heading': heading_for(parts, distinct_of, k, nth)})
            for ln in distinct[k]['lines']:
                line = {'type': 'line', 'id': len(lines), 'text': ln}
                for (_, kk, opt) in split_words(ln):
                    lyr.append((kk, opt, line['id']))
                lines.append(line); rows.append(line)
        return rows, lines, lyr

    qt, wt = toks_of(qtexts), toks_of(wtexts)
    qseq, _ = sung_order(dparts, [t[1] for t in qt])
    wseq, _ = sung_order(dparts, [t[1] for t in wt])
    # the order that best explains both transcripts: the written one, Qwen's or whisper's, then without any part
    # that doesn't pay for itself (each sung part costs PART_COST, so a repeated last line isn't a whole part)
    tried = {}

    def score(s):
        s = tuple(s)
        if s not in tried:
            rows, lines, lyr = build(s)
            qs, qops = line_up(lyr, qt)
            ws, wops = line_up(lyr, wt)
            tried[s] = (qs + ws - PART_COST * len(s), rows, lines, lyr, qops, wops)
        return tried[s][0]

    cands = {}
    for name, s in (('written', distinct_of), ('qwen', qseq), ('whisper', wseq)):
        if s:
            cands.setdefault(tuple(s), []).append(name)
    seq = max(cands, key=score)
    found_by = cands[seq]
    while len(seq) > 1:
        fewer = max((seq[:i] + seq[i + 1:] for i in range(len(seq))), key=score)
        if score(fewer) <= score(seq):
            break
        seq, found_by = fewer, found_by + ['dropped a part']
    _, rows, lines, lyr, qops, wops = tried[seq]

    qp, qgaps = evidence(lines, lyr, qt, qops)
    wp, wgaps = evidence(lines, lyr, wt, wops)

    em, dur = timer.emissions(voice16)
    times = timer.time_lines(em, dur, [[w for w in (mms_word(r) for r in re.split(r"[\s\-—–]+", ln['text'])) if w] for ln in lines])
    for ln, (a, b) in zip(lines, times):
        ln['start'], ln['end'] = a, b
        ww = split_words(ln['text'])
        written_keys = [k for (_, k, _) in ww]
        q, w = qp[ln['id']], wp[ln['id']]
        agree = [{'i': i, 'written': ww[i][0].strip('.,;:!?"'), 'heard': re.sub(r"^[^\w']+|[^\w']+$", '', q['raw'][i])}
                 for i, (a, b2) in enumerate(zip(q['at'], w['at'])) if a and b2 and a == b2 and a != written_keys[i]]
        ln['q'] = {'words': q['words'], 'err': q['err']}
        ln['w'] = {'words': w['words'], 'err': w['err']}
        ln['agree'] = agree
        ln['status'] = status_of(q, w, written_keys, agree)

    # extra rows: singing heard between the same two lines that fits no written line
    extra_rows = {}
    for after in set(qgaps) | set(wgaps):
        qa, wa = qgaps.get(after, []), wgaps.get(after, [])
        # both models must hear 2+ different real words: one model alone mostly makes lines up over the band
        # ("Satsang with Mooji", "We'll be right back"), and runs of oh, whoa or clang are not words to add
        if len({qt[t][1] for t in qa} - FILLER) < 2 or len({wt[t][1] for t in wa} - FILLER) < 2:
            continue
        ts = [clips[qt[t][2]] for t in qa] + [clips[wt[t][2]] for t in wa]
        extra_rows[after] = {'type': 'extra', 'start': round(min(a for a, _ in ts), 2), 'end': round(max(b for _, b in ts), 2),
                             'qtext': ' '.join(qt[t][0] for t in qa), 'wtext': ' '.join(wt[t][0] for t in wa),
                             'both': bool(qa) and bool(wa)}
    out_rows = [extra_rows[None]] if None in extra_rows else []
    for r in rows:
        out_rows.append(r)
        if r['type'] == 'line' and r['id'] in extra_rows:
            out_rows.append(extra_rows[r['id']])
    for i, r in enumerate(x for x in out_rows if x['type'] == 'extra'):
        r['id'] = 'x%d' % i

    def order_names(s):
        nth, out = {}, []
        for k in s:
            n = nth.get(k, 0); nth[k] = n + 1
            out.append(heading_for(parts, distinct_of, k, n))
        return out

    written_order = [p['heading'] for p in parts]
    sung = order_names(seq)
    counts = {}
    for ln in lines:
        counts[ln['status']] = counts.get(ln['status'], 0) + 1
    counts['extra'] = sum(1 for r in out_rows if r['type'] == 'extra')
    return {
        'key': song['key'], 'name': song['name'], 'mix': song['src'], 'voice': '.lyrics/audio/%s-voice.mp3' % song['key'],
        'duration': round(dur, 2), 'written': song['text'],
        'writtenHash': hashlib.sha1(song['text'].encode('utf-8')).hexdigest(),
        'writtenOrder': written_order, 'sungOrder': sung, 'orderFoundBy': found_by,
        'qwenOrder': order_names(qseq), 'whisperOrder': order_names(wseq),
        'orderChanged': sung != written_order,
        'clips': [[round(a, 2), round(b, 2)] for a, b in clips], 'qwen': qtexts, 'whisper': wtexts,
        'counts': counts, 'rows': out_rows,
    }

# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('keys', nargs='*')
    ap.add_argument('--whisper', default=os.path.expanduser('~/code/whisper.cpp'))
    ap.add_argument('--threads', type=int, default=12, help='whisper.cpp CPU threads')
    ap.add_argument('--fresh', action='store_true', help='ignore cached voices and transcripts')
    a = ap.parse_args()

    songs = load_songs()
    keys = a.keys or list(songs)
    bad = [k for k in keys if k not in songs]
    if bad:
        sys.exit('no song with lyrics: %s (have: %s)' % (', '.join(bad), ', '.join(songs)))
    os.makedirs(os.path.join(OUT, 'audio'), exist_ok=True)

    import torch, torchaudio
    t0 = time.time()
    sep = None
    work = {}
    for k in keys:  # 1-2: voice and phrase clips
        s = songs[k]
        src = os.path.join(ROOT, s['src'])
        st = os.stat(src)
        stamp = '%d-%d' % (st.st_size, int(st.st_mtime))
        d = os.path.join(OUT, 'work', k)
        os.makedirs(d, exist_ok=True)
        meta_f = os.path.join(d, 'meta.json')
        meta = json.load(open(meta_f)) if os.path.exists(meta_f) else {}
        if a.fresh or meta.get('stamp') != stamp or not os.path.exists(os.path.join(d, 'voice16.wav')):
            if sep is None:
                sep = Separator(torch, torchaudio)
            voc = sep.vocals(decode(src, 44100, 2))
            encode(voc, 44100, os.path.join(OUT, 'audio', k + '-voice.mp3'), ['-b:a', '128k'])
            encode(voc.mean(0, keepdims=True), 44100, os.path.join(d, 'voice16.wav'), ['-ar', str(SR), '-c:a', 'pcm_s16le'])
            for f in os.listdir(d):
                if f.startswith('clip'):
                    os.remove(os.path.join(d, f))
            meta = {'stamp': stamp}
        voice16 = decode(os.path.join(d, 'voice16.wav'), SR, 1)[0]
        if meta.get('clipsVersion') != CLIPS_VERSION:
            for f in os.listdir(d):
                if f.startswith('clip'):
                    os.remove(os.path.join(d, f))
            meta = {'stamp': stamp, 'clipsVersion': CLIPS_VERSION}
            meta['clips'] = phrases(voice16)
            for i, (ca, cb) in enumerate(meta['clips']):
                encode(voice16[None, int(ca * SR):int(cb * SR)], SR, os.path.join(d, 'clip%03d.wav' % i), ['-c:a', 'pcm_s16le'])
            json.dump(meta, open(meta_f, 'w'))
        work[k] = {'dir': d, 'meta': meta, 'meta_f': meta_f, 'voice16': voice16,
                   'files': [os.path.join(d, 'clip%03d.wav' % i) for i in range(len(meta['clips']))]}
        print('%-9s voice and %d clips (%.0f s)' % (k, len(meta['clips']), time.time() - t0), flush=True)
    del sep
    torch.cuda.empty_cache()

    # 3: whisper on the CPU in the background, Qwen on the GPU meanwhile
    need_w = [f for k in keys for f in work[k]['files'] if a.fresh or not os.path.exists(f + '.json')]
    proc = run_whisper(a.whisper, need_w, a.threads) if need_w else None
    need_q = [k for k in keys if a.fresh or 'qwen' not in work[k]['meta']]
    if need_q:
        from qwen_asr import Qwen3ASRModel
        asr = Qwen3ASRModel.from_pretrained('Qwen/Qwen3-ASR-1.7B', dtype=torch.bfloat16, device_map='cuda:0',
                                            max_inference_batch_size=16, max_new_tokens=512)
        for k in need_q:
            v, clips = work[k]['voice16'], work[k]['meta']['clips']
            res = asr.transcribe(audio=[(v[int(ca * SR):int(cb * SR)], SR) for ca, cb in clips], language='English')
            work[k]['meta']['qwen'] = [clean_transcript(r.text) for r in res]
            json.dump(work[k]['meta'], open(work[k]['meta_f'], 'w'))
            print('%-9s Qwen3-ASR done (%.0f s)' % (k, time.time() - t0), flush=True)
        del asr
        torch.cuda.empty_cache()
    if proc:
        print('waiting for whisper.cpp on %d clips...' % len(need_w), flush=True)
        proc.wait()
        print('whisper.cpp done (%.0f s)' % (time.time() - t0), flush=True)

    # 4-6
    timer = Timer(torch, torchaudio)
    data_f = os.path.join(OUT, 'data.json')
    data = json.load(open(data_f)) if os.path.exists(data_f) else {'songs': {}}
    for k in keys:
        w = work[k]
        wtexts = [read_whisper(f) for f in w['files']]
        res = analyse(songs[k], w['meta']['clips'], w['meta']['qwen'], wtexts, timer, w['voice16'])
        data['songs'][k] = res
        c = res['counts']
        print('%-9s %3d lines: ok %d, likely %d, changed %d, check %d, extra rows %d%s' % (
            k, sum(v for kk, v in c.items() if kk != 'extra'), c.get('ok', 0), c.get('likely', 0), c.get('changed', 0),
            c.get('check', 0), c.get('extra', 0),
            '' if not res['orderChanged'] else '  | sung order differs: ' + ' > '.join(res['sungOrder'])), flush=True)
    order = list(songs)
    data['songs'] = {k: data['songs'][k] for k in order if k in data['songs']}
    data['generated'] = time.strftime('%Y-%m-%d %H:%M')
    json.dump(data, open(data_f, 'w'), indent=1)
    print('wrote %s (%.0f s)' % (os.path.relpath(data_f, ROOT), time.time() - t0))


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Run image jobs on a local ComfyUI (http://127.0.0.1:8188) over its HTTP API, one at a time.

  python3 tools/comfy-gen.py JOBS.json
JOBS.json is a list of jobs: {"model", "prompt", "out", "w", "h", "seed", "steps", "refs", "edit", "res", "neg"}.
A job whose "out" exists is skipped unless it has "force": true.
model: qwen (Qwen-Image 2.1, 25 steps), qwen-turbo (8 steps), zimage (Z-Image Turbo, 8 steps),
       klein (FLUX.2 Klein 4B, 4 steps).
refs:  reference or edit images. Qwen sees them as image 1, 2, ... in the prompt. With "edit": true the output
       takes the first reference's size, so an edit keeps its framing ("res": 1248 makes a 2:3 picture 1024x1536).
       Klein adds them as reference latents.
Qwen keeps alpha (its VAE has four channels); Z-Image and Klein give opaque pictures. cfg is 1, so "neg" does nothing.
Qwen-Image 2.1 is under the Qwen Research License (research and evaluation only; shipping its pictures needs a
commercial licence). Z-Image Turbo and FLUX.2 Klein 4B are Apache 2.0. ComfyUI lives outside the repo in
~/code/ComfyUI (or $COMFYUI); GAME_NOTES.md, "Keeper and costume drafts", says how it was set up and what it gave.
"""
import json, os, shutil, sys, time, urllib.request

COMFY = os.environ.get('COMFYUI', os.path.expanduser('~/code/ComfyUI'))
URL = 'http://127.0.0.1:8188'


def post(path, data):
    req = urllib.request.Request(URL + path, json.dumps(data).encode(), {'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req))


def get(path):
    return json.load(urllib.request.urlopen(URL + path))


class G:
    def __init__(self): self.n, self.g = 0, {}
    def add(self, cls, **inputs):
        self.n += 1
        self.g[str(self.n)] = {'class_type': cls, 'inputs': inputs}
        return str(self.n)


def load_ref(g, path, i):
    name = f'bl_{i}_{os.path.basename(path)}'
    shutil.copy(path, os.path.join(COMFY, 'input', name))
    li = g.add('LoadImage', image=name)
    return g.add('JoinImageWithAlpha', image=[li, 0], alpha=[li, 1])


def qwen(j, turbo):
    g = G()
    unet = g.add('UNETLoader', unet_name='qwen_image_2.1_turbo_int8_convrot.safetensors' if turbo else 'qwen_image_2.1_int8_convrot.safetensors', weight_dtype='default')
    clip = g.add('CLIPLoader', clip_name='qwen3vl_8b_int8_convrot.safetensors', type='qwen_image', device='default')
    vae = g.add('VAELoader', vae_name='qwen_image_2.1_vae_bf16.safetensors')
    model = g.add('QwenImage21Cache', model=[unet, 0], device='auto', dtype='default')
    enc = dict(clip=[clip, 0], prompt=j['prompt'], negative_prompt=j.get('neg', ''), resolution=j.get('res', 1024), vae=[vae, 0])
    for i, r in enumerate(j.get('refs', []), 1):
        enc[f'images.image_{i}'] = [load_ref(g, r, i), 0]
    te = g.add('TextEncodeQwenImage21', **enc)
    lat = [te, 2] if j.get('edit') else [g.add('EmptyLatentImage', width=j.get('w', 1024), height=j.get('h', 1536), batch_size=1), 0]
    ks = g.add('KSampler', model=[model, 0], positive=[te, 0], negative=[te, 1], latent_image=lat, seed=j.get('seed', 1),
               steps=j.get('steps', 8 if turbo else 25), cfg=j.get('cfg', 1.0), sampler_name='euler', scheduler='simple', denoise=1.0)
    dec = g.add('VAEDecode', samples=[ks, 0], vae=[vae, 0])
    g.add('SaveImage', images=[dec, 0], filename_prefix='bl/' + os.path.splitext(os.path.basename(j['out']))[0])
    return g.g


def zimage(j):
    g = G()
    unet = g.add('UNETLoader', unet_name='z_image_turbo_int8_convrot.safetensors', weight_dtype='default')
    clip = g.add('CLIPLoader', clip_name='qwen_3_4b.safetensors', type='lumina2', device='default')
    vae = g.add('VAELoader', vae_name='ae.safetensors')
    model = g.add('ModelSamplingAuraFlow', model=[unet, 0], shift=3.0)
    pos = g.add('CLIPTextEncode', clip=[clip, 0], text=j['prompt'])
    neg = g.add('ConditioningZeroOut', conditioning=[pos, 0])
    lat = g.add('EmptySD3LatentImage', width=j.get('w', 1024), height=j.get('h', 1536), batch_size=1)
    ks = g.add('KSampler', model=[model, 0], positive=[pos, 0], negative=[neg, 0], latent_image=[lat, 0], seed=j.get('seed', 1),
               steps=j.get('steps', 8), cfg=1.0, sampler_name='res_multistep', scheduler='simple', denoise=1.0)
    dec = g.add('VAEDecode', samples=[ks, 0], vae=[vae, 0])
    g.add('SaveImage', images=[dec, 0], filename_prefix='bl/' + os.path.splitext(os.path.basename(j['out']))[0])
    return g.g


def klein(j):
    g = G()
    unet = g.add('UNETLoader', unet_name='flux-2-klein-4b.safetensors', weight_dtype='default')
    clip = g.add('CLIPLoader', clip_name='qwen_3_4b.safetensors', type='flux2', device='default')
    vae = g.add('VAELoader', vae_name='flux2-vae.safetensors')
    pos = g.add('CLIPTextEncode', clip=[clip, 0], text=j['prompt'])
    neg = g.add('ConditioningZeroOut', conditioning=[pos, 0])
    w, h = j.get('w', 1024), j.get('h', 1536)
    for i, r in enumerate(j.get('refs', []), 1):
        li = g.add('LoadImage', image=f'bl_{i}_{os.path.basename(r)}')
        shutil.copy(r, os.path.join(COMFY, 'input', f'bl_{i}_{os.path.basename(r)}'))
        sc = g.add('ImageScaleToTotalPixels', image=[li, 0], upscale_method='lanczos', megapixels=1.0, resolution_steps=16)
        enc = g.add('VAEEncode', pixels=[sc, 0], vae=[vae, 0])
        pos = g.add('ReferenceLatent', conditioning=[pos, 0], latent=[enc, 0])
        neg = g.add('ReferenceLatent', conditioning=[neg, 0], latent=[enc, 0])
    lat = g.add('EmptyFlux2LatentImage', width=w, height=h, batch_size=1)
    noise = g.add('RandomNoise', noise_seed=j.get('seed', 1))
    guider = g.add('CFGGuider', model=[unet, 0], positive=[pos, 0], negative=[neg, 0], cfg=1.0)
    sampler = g.add('KSamplerSelect', sampler_name='euler')
    sig = g.add('Flux2Scheduler', steps=j.get('steps', 4), width=w, height=h)
    s = g.add('SamplerCustomAdvanced', noise=[noise, 0], guider=[guider, 0], sampler=[sampler, 0], sigmas=[sig, 0], latent_image=[lat, 0])
    dec = g.add('VAEDecode', samples=[s, 0], vae=[vae, 0])
    g.add('SaveImage', images=[dec, 0], filename_prefix='bl/' + os.path.splitext(os.path.basename(j['out']))[0])
    return g.g


def run(j):
    m = j['model']
    graph = qwen(j, m == 'qwen-turbo') if m.startswith('qwen') else zimage(j) if m == 'zimage' else klein(j)
    t0 = time.time()
    r = post('/prompt', {'prompt': graph})
    if r.get('node_errors'): raise SystemExit(json.dumps(r, indent=1))
    pid = r['prompt_id']
    while True:
        h = get('/history/' + pid)
        if pid in h and h[pid].get('status', {}).get('completed') is not None or (pid in h and h[pid].get('outputs')):
            break
        time.sleep(1)
    st = h[pid].get('status', {})
    if st.get('status_str') == 'error': raise SystemExit(json.dumps(st.get('messages'), indent=1)[:3000])
    for out in h[pid]['outputs'].values():
        for im in out.get('images', []):
            src = os.path.join(COMFY, 'output', im.get('subfolder', ''), im['filename'])
            os.makedirs(os.path.dirname(os.path.abspath(j['out'])), exist_ok=True)
            shutil.copy(src, j['out'])
            print(f"{j['out']}  {time.time() - t0:.0f}s", flush=True)
            return


if __name__ == '__main__':
    for j in json.load(open(sys.argv[1])):
        if os.path.exists(j['out']) and not j.get('force'):
            print('have', j['out']); continue
        run(j)

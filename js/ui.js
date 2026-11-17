/* Brinelight — rendering, input (mouse, touch, keyboard), animation, sound, saving. */
(function () {
  'use strict';
  const BL = window.BL;
  const E = BL.E;
  const SAVE_KEY = 'brinelight.save.v1';
  const PREF_KEY = 'brinelight.prefs.v1';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const screenEl = $('#screen');
  const overlayEl = $('#overlay');
  const tipEl = $('#tip');
  const fxLayer = $('#fx-layer');
  const toastEl = $('#toast');

  let run = null;
  let Teach = null; // tutorial and first-time hints (js/tutorial.js), created at boot
  const ui = {
    sel: null, target: null, hover: null, busy: false, tonicSel: null, drag: null,
    mapFocus: 0, lastPointer: (window.matchMedia && matchMedia('(pointer: coarse)').matches) ? 'touch' : 'mouse', combatRef: null, cw: 140, overlayOnClose: null, overlayLocked: false, tipFor: null,
    kitFrom: 'workshop', kitSlot: null, kitScroll: 0, // the kit screens: which one is open, its chosen slot, its scroll while buying
  };
  let prefs = { sound: true, music: true, fast: false, soundVol: 0.8, musicVol: 0.8, jukeShuffle: false }; // volumes are slider positions, 0 to 1
  const BEST_KEY = 'brinelight.best.v1';
  const VERSION_KEY = 'brinelight.version.v1'; // the last version whose What's new the player has seen
  const META_KEY = 'brinelight.meta.v1'; // the Workshop and the Lazaret: Salvage, kit owned and worn, achievements, keepsakes kept
  const MT = BL.META_TEXT; // working names (Salvage, Workshop, Kit), kept in js/data.js
  const getNum = (k) => { try { return +(localStorage.getItem(k) || 0); } catch (e) { return 0; } };
  const setNum = (k, v) => { try { localStorage.setItem(k, String(v)); } catch (e) { /* ignore */ } };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem(PREF_KEY) || '{}')); } catch (e) { /* ignore */ }
  ['soundVol', 'musicVol'].forEach((k) => { const v = +prefs[k]; prefs[k] = isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.8; });
  let meta = E.newMeta();
  try {
    const m = JSON.parse(localStorage.getItem(META_KEY) || '{}');
    const raw = { salvage: 0, earned: 0, owned: [], ach: [] };
    ['salvage', 'earned'].forEach((k) => { if (typeof m[k] === 'number') raw[k] = m[k]; });
    ['owned', 'packed', 'ach', 'lazaret', 'bring', 'currents', 'heard', 'told'].forEach((k) => { if (Array.isArray(m[k])) raw[k] = m[k].filter((x) => typeof x === 'string'); });
    if (typeof m.reached === 'number') raw.reached = m.reached;
    if (m.kit && typeof m.kit === 'object') raw.kit = m.kit;
    raw.lazOpen = !!m.lazOpen;
    if (m.record && typeof m.record === 'object') raw.record = m.record;
    meta = E.migrateMeta(raw); // gear from before v0.10.0 becomes kit
  } catch (e) { /* ignore */ }
  const saveMeta = () => { try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) { /* ignore */ } };
  const savePrefs = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ } };
  /* Story so far: the marks the player has earned, the entries they have read, and whether the opening has played */
  const STORY_KEY = 'brinelight.story.v1';
  const story = { marks: [], read: [], scenes: [], opening: false }; // scenes: the story scenes that have played
  try {
    const st = JSON.parse(localStorage.getItem(STORY_KEY) || '{}');
    ['marks', 'read', 'scenes'].forEach((k) => { if (Array.isArray(st[k])) story[k] = st[k].filter((x) => typeof x === 'string'); });
    story.opening = !!st.opening;
  } catch (e) { /* ignore */ }
  const saveStory = () => { try { localStorage.setItem(STORY_KEY, JSON.stringify(story)); } catch (e) { /* ignore */ } };
  const storyMarks = () => story.marks.slice();
  const storyUnread = () => { const marks = storyMarks(); return E.storyEntries().filter((en) => en.when && E.storyOpen(en, marks) && story.read.indexOf(en.id) < 0); };

  /* A level has a name once Wren knows of it: the Shallows always, and a deeper one once she has been there or has
     broken the pin above it (a story mark, so it lasts). Until then it shows as "?" and the texts that describe it stay
     shut (the user, v0.33.0: the Belfry is the last level, so it should not be named before it is found). */
  const levelKnown = (lv) => lv <= 0 || (meta.reached || 0) >= lv || story.marks.indexOf('won:' + (lv - 1)) >= 0
    || (!!E.LEVELS[lv] && !!E.LEVELS[lv].needs && E.ownsKit(meta, E.LEVELS[lv].needs)) // whoever owns the dress knows what it is for
    || (!!run && !run.tutorial && ((run.level || 0) >= lv || (run.cleared || []).indexOf(lv - 1) >= 0));
  const allLevelsKnown = () => E.LEVELS.every((L, i) => levelKnown(i));
  const wait = (ms) => new Promise((r) => setTimeout(r, prefs.fast ? ms * 0.5 : ms));
  const isTouchUI = () => ui.lastPointer === 'touch' || ui.lastPointer === 'pen';

  /* ================================================================== *
   *  Icons (inline SVG)
   * ================================================================== */
  const svg = (inner, vb) => `<svg viewBox="${vb || '0 0 24 24'}" aria-hidden="true" fill="currentColor">${inner}</svg>`;
  const ICON = {
    play: svg('<path d="M8 5.5v13l10.5-6.5z"/>'),
    pause: svg('<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>'),
    prev: svg('<path d="M5.5 5H8v14H5.5zM19 5.5v13L9.5 12z"/>'),
    next: svg('<path d="M16 5h2.5v14H16zM5 5.5v13L14.5 12z"/>'),
    shuffle: svg('<path d="M3 7.5h3c2.2 0 3.5 1.1 4.8 3.2l1.6 2.6c1.3 2.1 2.6 3.2 4.8 3.2H20M3 16.5h3c1.4 0 2.4-.5 3.3-1.4M14.4 8.9c.9-.9 1.9-1.4 3.3-1.4H20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M17.5 4.5l3 3-3 3M17.5 13.5l3 3-3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
    volume: svg('<path d="M3.5 9.5H7l4.5-4v13l-4.5-4H3.5z"/><path d="M15 9.2a4 4 0 0 1 0 5.6M17.8 6.6a7.6 7.6 0 0 1 0 10.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
    note: svg('<path d="M9 17.5V6.6L19 4.2v11" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="6.6" cy="17.6" r="2.6"/><circle cx="16.6" cy="15.3" r="2.6"/>'),
    heart: svg('<path d="M12 21s-7.6-4.6-9.6-9.4C.9 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.6.8-1.4 2.3-2.6 4.4-2.6 3.6 0 5.7 3.7 4.2 7.1C19.6 16.4 12 21 12 21z"/>'),
    pearl: svg('<circle cx="12" cy="12" r="8.5" fill="#e9dfcf"/><circle cx="12" cy="12" r="8.5" fill="none" stroke="#a89b85" stroke-width="1"/><circle cx="9" cy="9" r="2.6" fill="#fff" opacity=".85"/>'),
    anchor: svg('<circle cx="12" cy="5" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v13M7 11h10M4 14c1 4 4.5 6 8 6s7-2 8-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
    deck: svg('<rect x="7" y="2.5" width="12" height="16" rx="2" opacity=".45"/><rect x="4.5" y="5.5" width="12" height="16" rx="2"/>'),
    discard: svg('<rect x="3" y="5" width="11" height="15" rx="2" opacity=".5"/><path d="M14 8h6m0 0-2.5-2.5M20 8l-2.5 2.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="8" y="9" width="10" height="13" rx="2"/>'),
    sunk: svg('<path d="M3 8c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 11v9m0 0-3-3m3 3 3-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
    menu: svg('<path d="M4 6.5h16M4 12h16M4 17.5h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
    attack: svg('<path d="M4.5 19.5 16 8" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M13.5 3.5H20.5V10.5L18 8 16.4 9.6 14.4 7.6 16 6z"/><path d="M3 17.5l3.5 3.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
    defend: svg('<path d="M12 2.2 20 5.2v6.2c0 5.4-3.6 9.2-8 10.6-4.4-1.4-8-5.2-8-10.6V5.2z"/>'),
    buff: svg('<path d="M12 3.5 19.5 11H15v9.5H9V11H4.5z"/>'),
    debuff: svg('<path d="M12 20.5 4.5 13H9V3.5h6V13h4.5z"/>'),
    summon: svg('<circle cx="12" cy="12" r="9" opacity=".35"/><path d="M12 7v10M7 12h10" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'),
    fight: svg('<path d="M5 19 16.5 7.5M19 19 7.5 7.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M14 3.5h6.5V10L18 7.6zM10 3.5H3.5V10L6 7.6z"/>'),
    elite: svg('<path d="M12 2.5a8 8 0 0 0-8 8c0 2.7 1.2 4.6 3 5.7V20h10v-3.8c1.8-1.1 3-3 3-5.7a8 8 0 0 0-8-8z"/><circle cx="9" cy="10.8" r="2" fill="#0b1e2b"/><circle cx="15" cy="10.8" r="2" fill="#0b1e2b"/><path d="M10 16.5h1.2V20H10zM12.8 16.5H14V20h-1.2z" fill="#0b1e2b"/><path d="M4.5 6 2 2.5l4.5 1.8M19.5 6 22 2.5l-4.5 1.8"/>'),
    // a campfire: the Cove's fire under the kettle (until v0.30.1 a lantern, which read as a bottle at map size)
    rest: svg('<path d="M12 2.6c.7 2.5 2.5 3.7 3.7 5.4 1.1 1.6 1.4 3.3.9 4.9-.6 2-2.5 3.3-4.6 3.3s-4-1.3-4.6-3.3c-.4-1.4-.2-2.9.7-4.2.3 1.1 1 1.9 1.9 2.2-.4-2.9.7-5.7 2-8.3z"/><path d="M12 10.4c.9 1 1.6 1.8 1.6 2.9a1.6 1.6 0 0 1-3.2 0c0-.9.6-1.8 1.6-2.9z" fill="#0b1e2b"/><path d="M4.6 21.2 19.4 17.4M4.6 17.4 19.4 21.2" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
    shop: svg('<path d="M9 2.5h6l-1.6 3.2h-2.8z"/><path d="M8.2 6.6h7.6c3 3 4.2 6.2 4.2 9.2a4.4 4.4 0 0 1-4.4 4.4H8.4A4.4 4.4 0 0 1 4 15.8c0-3 1.2-6.2 4.2-9.2z"/><circle cx="12" cy="14" r="2.6" fill="#0b1e2b"/>'),
    event: svg('<path d="M8.6 8.8a3.6 3.6 0 1 1 5.2 3.2c-1.1.6-1.8 1.3-1.8 2.6v.8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="19.6" r="1.7"/>'),
    treasure: svg('<path d="M3 11h18v9H3z"/><path d="M4 10c0-3.3 2.2-5.5 8-5.5S20 6.7 20 10z" opacity=".75"/><rect x="10.4" y="12" width="3.2" height="4.4" rx=".8" fill="#0b1e2b"/>'),
    // a lesser bell in the Belfry, with air under it (v0.37.0)
    pocket: svg('<path d="M12 3.2a5.4 5.4 0 0 1 5.4 5.4v3.9l2.1 3.1H4.5l2.1-3.1V8.6A5.4 5.4 0 0 1 12 3.2z" opacity=".5"/><circle cx="12" cy="10.2" r="1.7"/><circle cx="9.4" cy="12.9" r="1.1"/><circle cx="14.5" cy="13.2" r="1"/><path d="M3 20.4c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>'),
    // a toll bell (v0.41.0): a bell hung from a beam across the way
    toll: svg('<path d="M2.5 3.6h19" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M12 4.6v1.6"  stroke="currentColor" stroke-width="2"/><path d="M12 6.4a5.2 5.2 0 0 1 5.2 5.2v3.4l2.2 3H4.6l2.2-3v-3.4A5.2 5.2 0 0 1 12 6.4z"/><circle cx="13.6" cy="20.3" r="1.8"/><path d="M19.8 9.2c1 1 1.5 2.2 1.5 3.6M4.2 9.2c-1 1-1.5 2.2-1.5 3.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>'),
    boss: svg('<path d="M12 2a1.6 1.6 0 0 1 1.6 1.6v.8A6.2 6.2 0 0 1 18.2 10.4v4.8l2.3 3.2H3.5l2.3-3.2v-4.8a6.2 6.2 0 0 1 4.6-6v-.8A1.6 1.6 0 0 1 12 2z"/><circle cx="12" cy="20.6" r="2"/>'),
    might: svg('<path d="M4.5 19.5 16 8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M13.5 3.5H20.5V10.5L18 8 16.4 9.6 14.4 7.6 16 6z"/>'),
    spines: svg('<path d="M12 1.8l2 6.2 6-2.4-3.4 5.4 5.6 3-6.3.6 1.1 6.3-5-4.1-5 4.1 1.1-6.3-6.3-.6 5.6-3L4 5.6 10 8z"/>'),
    soaked: svg('<path d="M12 2.5c3.3 4.3 6.3 7.6 6.3 11.4a6.3 6.3 0 0 1-12.6 0c0-3.8 3-7.1 6.3-11.4z"/>'),
    chilled: svg('<path d="M12 2v20M3.4 7l17.2 10M3.4 17 20.6 7M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'),
    brine: svg('<circle cx="8.5" cy="15" r="4.6"/><circle cx="15.5" cy="7.5" r="3.4"/><circle cx="17.4" cy="16.4" r="2.3"/>'),
    moon: svg('<path d="M15.5 2.5a9.5 9.5 0 1 0 6 16.2A7.8 7.8 0 0 1 15.5 2.5z"/>'),
    shell: svg('<path d="M12 3c5.2 0 9 4 9 9h-3.2a5.8 5.8 0 0 0-5.8-5.8 3.8 3.8 0 0 0-3.8 3.8 2.4 2.4 0 0 0 2.4 2.4V15.6A5.6 5.6 0 0 1 5 10 7 7 0 0 1 12 3z"/><path d="M3 21h18" stroke="currentColor" stroke-width="2"/>'),
    vortex: svg('<path d="M20 12a8 8 0 1 1-8-8M16.5 12A4.5 4.5 0 1 1 12 7.5M13 12a1 1 0 1 1-1-1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
    beam: svg('<path d="M10 9h4l1.5 13h-7z"/><rect x="9.4" y="5" width="5.2" height="3.4" rx="1"/><path d="M15 6.5 22 3v7zM9 6.5 2 3v7z" opacity=".55"/>'),
    bond: svg('<path d="M10 14a4 4 0 0 1 0-5.7l2.3-2.3a4 4 0 0 1 5.7 5.7l-1.2 1.2M14 10a4 4 0 0 1 0 5.7l-2.3 2.3a4 4 0 0 1-5.7-5.7l1.2-1.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
    flame: svg('<path d="M12 2c3.2 4.2 6.2 6.8 6.2 11.2a6.2 6.2 0 0 1-12.4 0c0-3.1 1.6-5.2 3.1-6.7.3 2 1.1 3.1 2.3 3.6C11 7.6 11 5.1 12 2z"/>'),
    wave: svg('<path d="M2 15c2.5-4 5.5-4 8 0s5.5 4 8 0c1-1.6 2.2-2.5 4-2.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M2 9c2.5-4 5.5-4 8 0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>'),
    sound: svg('<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
    echo: svg('<path d="M4 12a8 8 0 0 1 8-8M20 12a8 8 0 0 1-8 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M8 12a4 4 0 0 1 4-4M16 12a4 4 0 0 1-4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="12" r="1.6"/>'),
    music: svg('<path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.8"/><circle cx="17.5" cy="16" r="2.8"/>'),
    close: svg('<path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'),
    salvage: '<img class="salv" src="img/icons/g_salvage.webp" alt="">',
    lock: svg('<rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.2"/>'),
    /* empty kit slots, one per place (BL.KIT_PLACES); a new place falls back to the pack */
    slot_harpoon: svg('<path d="M5 19 17.5 6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M20.5 3.5 13 6.6l1.6.8.9 1.6.8 1.6z"/><path d="M4 16.5c1.4.2 2.6 1.4 2.8 2.8" fill="none" stroke="currentColor" stroke-width="1.6"/>'),
    slot_bell: svg('<path d="M12 3.5a1.4 1.4 0 0 1 1.4 1.4v.5a5.6 5.6 0 0 1 4.2 5.4v4.4l2 2.8H4.4l2-2.8v-4.4a5.6 5.6 0 0 1 4.2-5.4v-.5A1.4 1.4 0 0 1 12 3.5z"/><circle cx="12" cy="20" r="1.8"/>'),
    slot_coat: svg('<path d="M9 3.5 12 6l3-2.5 5 2.3-1.6 6.2-2.2-.7V20.5H7.8V11.3l-2.2.7L4 5.8z"/><path d="M12 6v14.5" stroke="#0b1f2c" stroke-width="1.2" fill="none"/>'),
    slot_pocket: svg('<path d="M6 6.5h12v6.8a6 6 0 0 1-12 0z"/><path d="M6 9.5h12" stroke="#0b1f2c" stroke-width="1.4" fill="none"/><circle cx="12" cy="9.5" r="1.4" fill="#0b1f2c"/>'),
    slot_ditty: svg('<path d="M9.5 6.2c-.6-1.6.4-2.7 2.5-2.7s3.1 1.1 2.5 2.7"  fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8.6 6.5h6.8c2.6 2.4 4.1 5.6 4.1 9a5 5 0 0 1-5 5H9.5a5 5 0 0 1-5-5c0-3.4 1.5-6.6 4.1-9z"/><path d="M8.4 9h7.2" stroke="#0b1f2c" stroke-width="1.4" fill="none"/>'),
    pack: svg('<path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="4" y="7" width="16" height="14" rx="3" fill="currentColor" opacity=".9"/><path d="M4 12h16M10 12v2.5h4V12" fill="none" stroke="#0b1f2c" stroke-width="1.6"/>'),
    charge: svg('<path d="M12 2.5c3.3 4.3 6.3 7.6 6.3 11.4a6.3 6.3 0 0 1-12.6 0c0-3.8 3-7.1 6.3-11.4z" opacity=".4"/><path d="M12 8.2l1.3 2.8 3 .4-2.2 2 .6 3-2.7-1.5-2.7 1.5.6-3-2.2-2 3-.4z"/>'),
    doused: svg('<path d="M12 3c2.6 3.4 5 6 5 9.2a5 5 0 0 1-10 0c0-1.5.6-2.8 1.5-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 4l16 16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
    submerged: svg('<path d="M2 8c2.5-2 5-2 7.5 0s5 2 7.5 0 3.5-1.5 5-1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M12 11v9m0 0-3.5-3.5M12 20l3.5-3.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
    swallowed: svg('<path d="M3 12c3-6 15-6 18 0-3 6-15 6-18 0z" fill="none" stroke="currentColor" stroke-width="2"/><rect x="9" y="9" width="6" height="7" rx="1"/>'),
    // the Belfry: a Glimmer Bladder's Burst (a bursting bubble), and Breathless (a diving helmet's window with a crack)
    burst: svg('<circle cx="12" cy="12" r="5.2" opacity=".85"/><path d="M12 2v3.4M12 18.6V22M2 12h3.4M18.6 12H22M4.9 4.9l2.4 2.4M16.7 16.7l2.4 2.4M4.9 19.1l2.4-2.4M16.7 7.3l2.4-2.4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
    air: svg('<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="4.6" opacity=".45"/><path d="M8.5 6.5l2.6 4.2-2 2.2 3.4 4.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>'),
    chevron: svg('<path d="M6 9.5l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  };
  const NODE_ICON = { fight: ICON.fight, elite: ICON.elite, rest: ICON.rest, shop: ICON.shop, event: ICON.event, treasure: ICON.treasure, toll: ICON.toll, boss: ICON.boss, pocket: ICON.pocket };
  const SHORT_NAME = { fight: 'Skirmish', elite: 'Dread', rest: 'Cove', shop: 'Shop', event: 'Fog', treasure: 'Wreck', toll: 'Toll', boss: 'Boss', pocket: 'Air' };
  const NODE_NAME = { fight: 'Skirmish', elite: 'Dread (elite)', rest: 'Sheltered Cove (rest)', shop: "Barnaby's Shop", event: 'Fog (unknown)', treasure: 'Wreck (treasure)', toll: 'Toll bell (pay to pass)', boss: 'Boss', pocket: 'A lesser bell (air: choose one)' };
  /* Who waits on the last landing. After the Heart is home, the Belfry's last landing holds the keeper's own fear,
     so the map names it vaguely; in the fight it is the boss creature's own name. */
  const bossName = () => {
    const c = run.combat, B = E.band(run);
    const boss = c && c.kind === 'boss' && c.enemies.find((e) => BL.ENEMIES[e.id].boss);
    if (boss) return boss.name;
    return run.heartHome && E.lastLevel(run) && B.finalBoss ? B.finalBoss : B.boss;
  };

  /* ================================================================== *
   *  Sound and music, on one AudioContext. The sound effects are js/sfx.js. The music is the score in
   *  js/music-score.js (from music/brinelight.scrim), played by musicbox (js/vendor/musicbox). Nothing is
   *  made until the first click or key press, since browsers keep audio locked until then.
   * ================================================================== */
  const Sound = (function () {
    let ctx = null, kit = null, sfxBus = null, musicBus = null, music = null, musicBroken = false, playing = false;
    // The score plays at this musicbox volume. At 0.8 (musicbox's default) it is mastered like a record, -12 to
    // -16 LUFS, and buries the sound effects; 0.12 puts a fight at about -32 LUFS, under an ordinary blow,
    // as the old music sat. GAME_NOTES.md has the measurements.
    const MUSIC_LEVEL = 0.12;
    /* A cue that plays quieter than the rest is lifted (v0.40.0, the user: "Music volume for bosses too low?"). Rendered
       offline and measured: the Tolling Buoy's own piece was about 3 dB under the other pins' cue and 1.5 dB under an
       ordinary fight, so it gets +3 dB. */
    const CUE_GAIN = { buoy: 1.41 };
    const cueLevel = (cue) => MUSIC_LEVEL * (CUE_GAIN[cue] || 1);
    const now = { cue: 'title', depth: 0, band: null, density: 0, song: null, loop: null };
    // a slider position to a level: 80% (the default) is the balance above, 100% is +4 dB, 50% is -8 dB, 0 is silent
    const gain = (v) => { v = Math.max(0, Math.min(1, +v || 0)) / 0.8; return v * v; };
    /* Songs generated with Google Gemini (music/songs). A screen with a song plays it in place of the score
       (updateSound says which). Leaving fades it out; a song that `resume`s carries on from there next time, and a
       pin's starts again with each fight. When a song ends, the score plays for the rest of that visit. The Jukebox
       plays the ones you have heard, and High Tide Departure only there, once the Heart is home. The files are normalised to -16 LUFS, and SONG_LEVEL plays
       them at about -30 LUFS, level with the score. They play through the music bus, so its switch and slider work,
       on a phone too (iOS ignores an <audio> element's own volume). From file:// the browser won't let Web Audio read
       the file, so there the element plays straight out at a volume set from the slider, with no fades.
       The title screen has a list of songs (`now.loop`) and plays them in turn, round and round, each from the top.
       `secs` is the length, for the Jukebox's list before a file has loaded. */
    const SONGS = {
      title: { src: 'music/songs/the-great-light-turning-slow.mp3', resume: true, secs: 177, name: 'The Great Light Turning Slow', where: 'The title screen' },
      bells: { src: 'music/songs/harbour-bells-at-dawn.mp3', resume: true, secs: 138, name: 'Harbour Bells at Dawn', where: 'The Heart comes home, and the title screen' }, // wordless
      shop: { src: 'music/songs/no-haggling-no-biting.mp3', resume: true, secs: 176, name: 'No Haggling, No Biting', where: "Barnaby's shop" },
      shell: { src: 'music/songs/pop-the-shell.mp3', resume: true, secs: 165, name: 'Pop the Shell', where: "Barnaby's shop" }, // Barnaby raps it (Gemini called it No Hagglin', No Bitin')
      hermit: { src: 'music/songs/the-hermits-heavy-toll.mp3', resume: false, secs: 178, name: "The Hermit's Heavy Toll", where: 'The Harbour Hermit and the title screen' },
      // Wren's own song (her little bell answers the big one). It played against the Tolling Buoy until v0.36.0, when the
      // user heard that it is about Wren: the Buoy has its own music-box cue now ('buoy')
      buoy: { src: 'music/songs/tide-swings-its-tongue.mp3', resume: true, secs: 148, name: 'Tide Swings Its Tongue', where: 'The title screen' },
      deep: { src: 'music/songs/ring-for-the-deep.mp3', resume: false, secs: 174, name: 'Ring for the Deep', where: 'The Harbour Hermit, from your second meeting' }, // the two bells rap it; one of the Hermit's two songs (fightSong)
      bell: { src: 'music/songs/the-toll-of-the-sunken-stair.mp3', resume: false, secs: 178, name: 'The Toll of the Sunken Stair', where: 'The Drowned Bellwether' },
      departure: { src: 'music/songs/high-tide-departure.mp3', resume: true, secs: 179, name: 'High Tide Departure', where: 'Only in the Jukebox', jukeOnly: true },
      watch: { src: 'music/songs/it-went-dark-on-my-watch.mp3', resume: true, secs: 158, name: 'It Went Dark on My Watch', where: 'The title screen' }, // its last verse is a fall
      /* v0.45.0: the Buoy's singer, the Dreads and the Dark Watch's call (FIGHT_SONGS, fightSong). A Dread's song
         `resume`s, so a fight over in a turn or two still gets further into it each time (the user's call); a pin's
         starts again. What the Bell Is Saying lost its sung stage directions (see GAME_NOTES, "Songs for the Buoy,
         the Dreads and the Dark Watch"). */
      hush: { src: 'music/songs/what-the-bell-is-saying.mp3', resume: false, secs: 164, name: 'What the Bell Is Saying', where: 'The Tolling Buoy' }, // the singer in the cage, a sea waltz
      chain: { src: 'music/songs/down-on-the-chain.mp3', resume: false, secs: 178, name: 'Down on the Chain', where: 'The Tolling Buoy' }, // the singer in the cage, djent
      gardener: { src: 'music/songs/the-gardener.mp3', resume: true, secs: 179, name: 'The Gardener', where: 'The Garden Strider' }, // the Strider sings, mostly sung
      putback: { src: 'music/songs/put-it-back.mp3', resume: true, secs: 168, name: 'Put It Back', where: 'The Garden Strider' }, // the same song, half-spoken, other verses
      herring: { src: 'music/songs/king-of-the-herrings.mp3', resume: true, secs: 179, name: 'King of the Herrings', where: 'The Crowned Oarfish' },
      eye: { src: 'music/songs/remember-the-eye.mp3', resume: true, secs: 176, name: 'Remember the Eye', where: 'The Bell Yearling' }, // the user's words
      cantor: { src: 'music/songs/ring-it-once-again.mp3', resume: true, secs: 178, name: 'Ring It Once Again', where: 'The Drowned Cantor' },
      nobody: { src: 'music/songs/nobody-in-the-dress.mp3', resume: false, secs: 161, name: 'Nobody in the Dress', where: 'The Dark Watch, once Nobody Comes Home' }, // the Hollow Divers sing it
    };
    const SONG_LEVEL = 0.2, SONG_FADE = 1.2;
    /* A screen's own song (a pin's, Barnaby's) goes round, the user's call (v0.30.0): it fades out over its last LOOP_OUT
       seconds and starts again from the top, fading in over LOOP_IN. Before, the score took over when it ended. The
       title screen goes on to its next song instead, and the Jukebox to the next one heard. */
    const LOOP_OUT = 8, LOOP_IN = 4;
    // the songs loaded so far: { el, amp (its gain into the music bus, or null), to (the level it is heading for),
    // done, broken, timer, out (fading out to stop), tail (fading out at its end, to go round) }
    const songs = {};
    let songOn = null; // the song playing or fading in
    let loopAt = null; // the title screen's song now, or the one it comes back to
    /* The Jukebox's pick, from the moment one is made until a descent starts: { song or cue, paused, depth }. While
       it holds, nothing else plays. A song that ends goes on to the next (jukeEnd); a piece of the score loops. */
    let juke = null, jukeEnd = null;
    let heardFn = null; // told of each song and cue of the score as it plays, for the Jukebox ('song:shop', 'cue:fight')
    let nowFn = null, nowKey = null; // told when what plays changes: 'song:<key>', 'cue:<cue>' or null (silence), for the now-playing chip
    const heard = (k) => { if (heardFn) heardFn(k); };
    const songVol = () => Math.min(1, (prefs.music ? gain(prefs.musicVol) : 0) * SONG_LEVEL); // an element's own volume
    const levels = () => {
      if (!ctx) return;
      const t = ctx.currentTime;
      sfxBus.gain.setTargetAtTime(prefs.sound ? gain(prefs.soundVol) : 0, t, 0.03);
      musicBus.gain.setTargetAtTime(prefs.music ? gain(prefs.musicVol) : 0, t, 0.05);
      for (const k in songs) if (!songs[k].amp && !songs[k].el.paused) songs[k].el.volume = songVol();
    };
    /* Phones and tablets (v0.36.0). The user's Android playtest: the sound crackled and distorted, and after switching
       apps it went on for a while, then crackled and stopped. So on a phone the context asks for the larger buffer meant
       for steady playback (fewer underruns while the music box and the effects synthesize at once; a few more ms before
       a sound), and everything stops while the game is out of sight (hide/show below). A computer keeps 'interactive'
       and plays on in a background tab, as a music player would. */
    const PHONE = typeof navigator !== 'undefined' && (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '') || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent || '')));
    function ac() {
      if (away) return null; // out of sight on a phone: nothing plays until it is back
      if (!ctx) {
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          try { ctx = new AC({ latencyHint: PHONE ? 'playback' : 'interactive' }); } catch (e) { ctx = new AC(); }
          sfxBus = ctx.createGain(); sfxBus.connect(ctx.destination);
          musicBus = ctx.createGain(); musicBus.connect(ctx.destination);
          sfxBus.gain.value = 0; musicBus.gain.value = 0;
          levels();
          kit = BL.SFX.create(ctx, sfxBus);
          kit.setDepth(now.depth);
        } catch (e) { ctx = null; return null; }
      }
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume().catch(() => {});
      return ctx;
    }
    // a song that can't play: the Jukebox stops on it, and a screen plays the score for the rest of the visit
    function songFailed(key) {
      if (juke && juke.song === key) juke.paused = true;
      else if (songs[key]) songs[key].done = true;
      sync();
    }
    function loadSong(key) {
      if (songs[key]) return songs[key];
      const s = (songs[key] = { el: new Audio(), amp: null, to: 0, done: false, broken: false, timer: 0, out: false, tail: false });
      s.el.preload = 'auto';
      if (location.protocol !== 'file:') {
        try {
          const src = ctx.createMediaElementSource(s.el);
          s.amp = ctx.createGain();
          s.amp.gain.value = 0;
          src.connect(s.amp);
          s.amp.connect(musicBus);
        } catch (e) { s.amp = null; }
      }
      // a screen's own song, near its end, fades out slowly; `ended` then starts it again
      s.el.addEventListener('timeupdate', () => {
        const d = s.el.duration;
        if (s.tail || s.out || songOn !== key || !goesRound(key) || !(d > LOOP_OUT * 2) || s.el.currentTime < d - LOOP_OUT) return;
        s.tail = true;
        fadeSong(s, 0, Math.max(0.3, d - s.el.currentTime));
      });
      s.el.addEventListener('ended', () => {
        s.el.currentTime = 0;
        if (juke && juke.song === key) { if (jukeEnd) jukeEnd(key); else { juke.paused = true; sync(); } return; }
        if (now.song === key) {
          if (now.loop) { // the title screen's next song, from the top
            loopAt = now.song = now.loop[(now.loop.indexOf(key) + 1) % now.loop.length];
            if (songs[loopAt]) { songs[loopAt].done = false; songs[loopAt].el.currentTime = 0; }
          } else if (songOn === key && prefs.music) { // a screen's own song: round again, fading in from silence
            s.tail = false;
            songPlay(key, LOOP_IN, 0);
            return;
          }
          sync();
        }
      });
      s.el.addEventListener('error', () => { s.broken = true; songFailed(key); });
      s.el.addEventListener('playing', () => heard('song:' + key));
      s.el.src = SONGS[key].src;
      return s;
    }
    // a song that goes round when it ends: the screen's own, not the title screen's list or the Jukebox's pick
    const goesRound = (key) => now.song === key && !now.loop && !(juke && juke.song === key);
    // ramp a song's level to `to` over `secs`, from where it is (or from `from`)
    function fadeSong(s, to, secs, from) {
      s.to = to;
      if (!s.amp) { s.el.volume = to ? songVol() : 0; return; }
      const g = s.amp.gain, t = ctx.currentTime;
      g.cancelScheduledValues(t);
      g.setValueAtTime(from === undefined ? g.value : from, t);
      g.linearRampToValueAtTime(to, t + secs);
    }
    function songPlay(key, secs, from) {
      const s = loadSong(key);
      clearTimeout(s.timer);
      // sync() runs on every render: a song already playing keeps its fade, a slow one in or out too
      if (!s.out && !s.el.paused && (s.to === SONG_LEVEL || s.tail)) return;
      s.out = false;
      fadeSong(s, SONG_LEVEL, secs || SONG_FADE, from);
      if (!s.el.paused) return;
      const p = s.el.play();
      // refused (no click yet) or unplayable; a pause while it starts is fine
      if (p && p.catch) p.catch((e) => { if (!e || e.name !== 'AbortError') songFailed(key); });
    }
    function songStop(key, secs) {
      const s = songs[key];
      if (!s) return;
      clearTimeout(s.timer);
      s.out = true; // fading out
      s.tail = false;
      fadeSong(s, 0, secs);
      s.timer = setTimeout(() => { s.el.pause(); if (!SONGS[key].resume) s.el.currentTime = 0; }, s.amp ? secs * 1000 + 50 : 0);
    }
    /* Make what plays match what should: with the music on, the Jukebox's pick (or nothing while it's paused), else the
       screen's song unless it has played out this visit or can't play, else the score's cue for the screen. */
    function sync() {
      if (!ctx || away) return;
      let want = null, cue = null, depth = now.depth;
      if (prefs.music) {
        if (juke) {
          if (juke.paused) { /* silence */ } else if (juke.song) want = juke.song; else if (juke.cue) { cue = juke.cue; depth = juke.depth; }
        } else {
          const s = now.song && songs[now.song];
          if (now.song && !(s && (s.done || s.broken))) want = now.song; else cue = now.cue;
        }
      }
      if (songOn && songOn !== want) { songStop(songOn, juke ? 0.4 : SONG_FADE); songOn = null; }
      if (want) { songPlay(want); songOn = want; }
      if (cue && !musicBroken) {
        try {
          if (!music) {
            music = new window.Musicbox.MusicPlayer({ context: ctx, destination: musicBus, volume: MUSIC_LEVEL, intensity: depth });
            music.load(BL.MUSIC_SCORE);
          }
          if (music.opts.volume !== cueLevel(cue)) music.setVolume(cueLevel(cue));
          if (playing) { music.setIntensity(depth); music.goto(cue); } else { music.play(cue, { intensity: depth }); playing = true; }
          heard('cue:' + cue);
        } catch (e) { musicBroken = true; music = null; playing = false; } // no Web Audio, or a broken score: play on without music
      } else if (playing) { music.stop(want ? SONG_FADE : 0.8); playing = false; }
      const np = want ? 'song:' + want : cue && playing ? 'cue:' + cue : null;
      if (np !== nowKey) { nowKey = np; if (nowFn) nowFn(np); }
    }
    // what is playing, or chosen, now: a song or a cue of the score
    const current = () => juke || { song: songOn, cue: songOn ? null : playing ? now.cue : null, paused: false, depth: now.depth };
    /* Out of sight on a phone (another app, the screen locked): the songs pause and the context is suspended, so the music
       box's queue stops where it is instead of running dry under throttled timers. Back in sight, both go on. */
    let away = false, awaySongs = [];
    function hide() {
      if (away || !PHONE) return;
      away = true;
      awaySongs = Object.keys(songs).filter((k) => !songs[k].el.paused);
      awaySongs.forEach((k) => songs[k].el.pause());
      // the place's own sounds stop too: each one would wake the context (sfx.js resumes it to play)
      if (kit && ambOn) { kit.ambience(null); ambOn = ''; }
      if (ctx && ctx.state === 'running' && ctx.suspend) ctx.suspend().catch(() => {});
    }
    function show() {
      if (!away) return;
      away = false;
      if (!ctx) return;
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume().catch(() => {});
      awaySongs.forEach((k) => { const p = songs[k].el.play(); if (p && p.catch) p.catch(() => {}); });
      awaySongs = [];
      sync();
      ambience();
    }
    // the place's own sounds (gulls, drips, the bell's hum) every few seconds: fewer in a fight, none in a pin
    let ambOn = ''; // what the kit's ambience plays now, 'band/density', or '' for none
    function ambience() {
      if (!kit) return;
      const want = prefs.sound && now.band ? now.band + '/' + now.density : '';
      if (want === ambOn) return;
      ambOn = want;
      kit.ambience(want ? now.band : null, now.density);
    }
    return {
      play(name, arg) { if (!prefs.sound || !ac()) return; try { kit.play(name, arg); } catch (e) { /* audio unavailable */ } },
      /* where Wren is: a cue of the score, the depth (0 the Shallows, 1 Dark Water, 2 the Belfry), the ambience,
         and the screen's recorded song, if it has one (a key of SONGS), or its songs to play in turn (a list of keys) */
      scene(cue, depth, band, density, song) {
        now.band = density ? band : null; now.density = density || 0;
        if (kit && depth !== now.depth) kit.setDepth(depth);
        now.cue = cue; now.depth = depth;
        const loop = Array.isArray(song) && song.length ? song : null;
        if (loop) song = loop.indexOf(loopAt) >= 0 ? loopAt : loop[0];
        song = song && SONGS[song] ? song : null;
        if (song !== now.song) {
          if (song && songs[song]) songs[song].done = false; // a new visit plays it again
          now.song = song;
        }
        now.loop = loop;
        if (loop) loopAt = song;
        if (juke && !loop) juke = null; // a descent has started: the game chooses the music again
        sync();
        ambience();
      },
      hide, show,
      unlock() {
        if (!prefs.sound && !prefs.music) return;
        if (!ac()) return;
        sync();
        ambience();
      },
      /* the menu's switches and sliders (a click, so audio may start here) */
      changed() {
        if (prefs.sound || prefs.music) ac();
        levels();
        sync();
        ambience();
      },
      /* The Jukebox on the title screen. pick(): the playing one again pauses or carries on (or always plays, with
         `play`); another starts from the top. depth(): the score's depth, 0 to 2. */
      juke: {
        SONGS,
        pick(kind, key, play) {
          if (!ac()) return;
          const cur = current(), same = kind === 'song' ? cur.song === key : !cur.song && cur.cue === key;
          if (same) juke = Object.assign({}, cur, { paused: play ? false : !cur.paused });
          else {
            juke = { song: kind === 'song' ? key : null, cue: kind === 'song' ? null : key, paused: false, depth: cur.depth };
            if (kind === 'song') {
              const s = loadSong(key);
              clearTimeout(s.timer);
              s.el.currentTime = 0;
              s.done = false;
            }
          }
          sync();
        },
        depth(n) { juke = Object.assign({}, current(), { depth: Math.max(0, Math.min(2, n | 0)) }); sync(); },
        // move within the song playing (or paused): to `t` seconds, or `by` seconds on from where it is
        seek(t, by) {
          const cur = current(), s = cur.song && songs[cur.song];
          if (!s) return;
          juke = Object.assign({}, cur);
          const end = s.el.duration > 0 ? s.el.duration : SONGS[cur.song].secs;
          s.el.currentTime = Math.max(0, Math.min(end - 0.25, by ? s.el.currentTime + by : t));
        },
        onEnd(fn) { jukeEnd = fn; },
        onHeard(fn) { heardFn = fn; },
        onNow(fn) { nowFn = fn; },
        state() {
          const cur = current(), s = cur.song && songs[cur.song];
          return { song: cur.song, cue: cur.cue, paused: !!cur.paused || !prefs.music, depth: cur.depth,
            at: s ? s.el.currentTime : 0, secs: s && s.el.duration > 0 ? s.el.duration : cur.song ? SONGS[cur.song].secs : 0 };
        },
      },
      state: () => {
        const s = songOn && songs[songOn], on = !!(s && !s.el.paused && !s.out);
        return { ctx: ctx ? ctx.state : null, music: playing ? music.state : null, cue: now.cue, depth: now.depth, ambience: ambOn,
          song: on ? songOn : null, songAt: on ? s.el.currentTime : 0, songGain: on && s.amp ? s.amp.gain.value : null, loop: now.loop ? now.loop.join(',') : null };
      },
      // for the UI test: the song playing to a second before its end
      // tests: to `secs` (1 unless given) before the end of the song playing
      toEnd(secs) { const s = songOn && songs[songOn], b = secs || 1; if (s && s.el.duration > b) s.el.currentTime = s.el.duration - b; },
    };
  })();
  const sfx = (n, arg) => Sound.play(n, arg);
  // where an element sits on screen as a stereo position, for a sound that comes from it: -0.7 left to 0.7 right
  const panOf = (el) => {
    if (!el || !el.getBoundingClientRect) return undefined;
    const r = el.getBoundingClientRect();
    return Math.max(-0.7, Math.min(0.7, ((r.left + r.width / 2) / (window.innerWidth || 1)) * 2 - 1));
  };

  /* ================================================================== *
   *  Helpers: save/load, toast, tooltip
   * ================================================================== */
  function save() {
    if (!run || run.tutorial) return; // the tutorial is never saved
    if (run.screen === 'victory' || run.screen === 'defeat') { clearSave(); return; } // the end screen lists its own story entries
    noteStory().forEach((en) => toast(`New in Story so far: ${en.title}`, 3500));
    if (run.combat && (run.combat.phase !== 'player' || run.combat.won || run.combat.lost)) return;
    try {
      E.tick(run);
      localStorage.setItem(SAVE_KEY, JSON.stringify(run, (k, v) => (k === 'fx' ? [] : v)));
    } catch (e) { /* storage unavailable */ }
  }
  function loadSave() {
    try {
      const s = localStorage.getItem(SAVE_KEY);
      if (!s) return null;
      const r = JSON.parse(s);
      if (!r || r.version !== E.RUN_VERSION || !r.map) return null; // a run saved before the Belfry (v0.20.0) is dropped
      if (r.screen === 'victory' || r.screen === 'defeat') return null;
      r.stats.lastTick = Date.now();
      return r;
    } catch (e) { return null; }
  }
  /* Record what this run has met and return the Story so far entries that opened. The tutorial and debug-cheated runs open nothing. */
  function noteStory() {
    if (!run || run.tutorial || run.cheated) return [];
    const before = storyMarks();
    const fresh = E.storyMarks(run).filter((m) => before.indexOf(m) < 0);
    if (!fresh.length) return [];
    story.marks.push(...fresh);
    saveStory();
    return E.storyEntries().filter((en) => en.when && fresh.indexOf(en.when) >= 0);
  }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }

  /* Progress as a whole: every brinelight.* key in this browser. Settings (PREF_KEY), the What's new marker and the
     debug switches are not progress, so a reset keeps them; a backup carries the settings but not the debug switches. */
  const BACKUP_KIND = 'brinelight-backup';
  const NOT_PROGRESS = [PREF_KEY, VERSION_KEY, 'brinelight.debug.v1', 'brinelight.debugopts.v1'];
  const ourKeys = () => { try { return Object.keys(localStorage).filter((k) => k.indexOf('brinelight.') === 0); } catch (e) { return []; } };
  function backupData() {
    const data = {};
    ourKeys().filter((k) => k.indexOf('brinelight.debug') !== 0).forEach((k) => { data[k] = localStorage.getItem(k); });
    return { kind: BACKUP_KIND, version: BL.VERSION, saved: new Date().toISOString(), data };
  }
  function downloadBackup() {
    const json = JSON.stringify(backupData(), null, 1);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = `brinelight-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast('Backup downloaded');
  }
  /* A backup file's contents, checked: null unless it is a Brinelight backup with only brinelight.* text entries. */
  function readBackup(text) {
    let b;
    try { b = JSON.parse(text); } catch (e) { return null; }
    if (!b || b.kind !== BACKUP_KIND || !b.data || typeof b.data !== 'object') return null;
    const keys = Object.keys(b.data);
    if (!keys.length || keys.some((k) => k.indexOf('brinelight.') !== 0 || k.indexOf('brinelight.debug') === 0 || typeof b.data[k] !== 'string')) return null;
    return b;
  }
  function wipeProgress() {
    try { ourKeys().filter((k) => NOT_PROGRESS.indexOf(k) < 0).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
  }
  function restoreBackup(b) {
    wipeProgress();
    try { Object.keys(b.data).forEach((k) => localStorage.setItem(k, b.data[k])); } catch (e) { /* ignore */ }
    location.reload();
  }
  function pickBackupFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', () => {
      const f = input.files && input.files[0];
      if (!f) return;
      f.text().then(askRestore);
    });
    input.click();
  }
  function askRestore(text) {
    const b = readBackup(text);
    if (!b) { openOverlay(modal('Not a Brinelight backup', '<p>This file is not a backup from Brinelight, or it is damaged. Nothing was changed.</p>', '<button class="btn primary" data-act="close" autofocus>OK</button>', 'narrow')); return; }
    ui.pendingBackup = b;
    const when = b.saved ? new Date(b.saved).toLocaleString() : 'an unknown date';
    openOverlay(modal('Restore this backup?', `<p>A backup from ${when}${b.version ? `, made in v${b.version}` : ''}.</p><p>It replaces all the progress in this browser, and the game starts again from the title screen.</p>`,
      '<button class="btn" data-act="close" autofocus>Cancel</button><button class="btn primary" data-act="importconfirm">Restore</button>', 'narrow'));
  }

  function toast(msg, ms) {
    const d = document.createElement('div');
    d.className = 'toast-msg';
    d.textContent = msg;
    if (ms) d.style.animationDuration = ms / 1000 + 's';
    // fights keep messages up top; other screens have their title there, so messages go to the bottom
    // (a story scene has its text at the bottom, so there they go up top too)
    toastEl.classList.toggle('low', !(run && run.screen === 'combat') && !ui.opening);
    toastEl.appendChild(d);
    while (toastEl.children.length > 3) toastEl.firstChild.remove();
    setTimeout(() => d.remove(), (ms || 2200) + 100);
  }

  const KW_RE = /\b(Strand|Surge|Ebb|Ward|Soaked|Chilled|Brine|Sink|Float|Might|Spines|Crest|Light|Swell|Seep)\b/g;
  const kwClass = (k) => 'k-' + k.toLowerCase().replace(/\s/g, '');
  function markKeywords(text) {
    return text.replace(KW_RE, (m) => `<span class="kw ${kwClass(m)}">${m}</span>`);
  }
  function keywordsOf(card) {
    const d = BL.CARDS[card.id];
    const plain = d.text(E.vals(card), { d: (n) => n, tide: null }).replace(/<[^>]+>/g, '');
    const found = [];
    (plain.match(KW_RE) || []).forEach((k) => { if (found.indexOf(k) < 0) found.push(k); });
    // each end of the Swell right after the word that reaches it
    if (found.indexOf('Surge') >= 0 && found.indexOf('Crest') < 0) found.splice(found.indexOf('Surge') + 1, 0, 'Crest');
    if (found.indexOf('Ebb') >= 0 && found.indexOf('Strand') < 0) found.splice(found.indexOf('Ebb') + 1, 0, 'Strand');
    if (d.type === 'rite') found.unshift('Rite');
    return found.filter((k) => BL.KEYWORDS[k] && k !== 'Light' && k !== 'Swell');
  }

  function statusTip(o, key) {
    const s = BL.STATUSES[key];
    if (!s) return '';
    const n = o.st[key] > 1 || (s.kind !== 'rite' && NO_COUNT.indexOf(key) < 0) ? o.st[key] : '';
    const held = key === 'swallowed' && o.mem && o.mem.swallowed ? `<div class="tip-row">Inside it: ${o.mem.swallowed.map((x) => `<b>${E.cardName(x)}</b>`).join(', ')}.</div>` : '';
    return `<b>${s.name} ${n}</b><br>${s.desc(o.st[key])}${held}`;
  }
  function tipContent(key) {
    const parts = key.split(':');
    const c = run && run.combat;
    switch (parts[0]) {
      case 'hp': return `<b>Health</b><br>${run.hp} of ${run.maxHp}. If it reaches 0, the run is over.`;
      case 'pearls': return `<b>Pearls</b><br>Spend them at Barnaby's shop.`;
      case 'floor': return `<b>${LevelName(run.level)}, landing ${run.floor} of ${E.mapRows(run) + 1}</b><br>${bossName()} waits on the last landing.${!E.lastLevel(run) ? (E.deepestReachable(run) === (run.level || 0) ? ' Below it the stair runs under the sea, and you have nothing to dive in: this pin is as deep as this expedition can go.' : ' Break it, then go home or go deeper.') : run.heartHome ? ' Beat it to quiet the Belfry and come home.' : ' Break it to bring the Heart home.'}`;
      case 'ks': { const k = BL.KEEPSAKES[parts[1]]; return `<b>${k.name}</b> <span class="k-charge">Roil ${k.charge}</span><br>${k.desc}${k.deep ? `<div class="tip-row muted">${foundIn(parts[1])}</div>` : ''}`; }
      case 'kit': return `<b>Your ${MT.item.toLowerCase()}</b>${E.kitIds(run).filter((id) => BL.KIT[id].place !== 'bell').map((id) => `<div class="tip-row"><b>${BL.KIT[id].name}:</b> ${BL.KIT[id].desc}</div>`).join('')}`;
      case 'bell': { const b = BL.KIT[E.bell(run)]; return b ? `<b>${b.name}</b><br>${b.desc}` : ''; }
      case 'charge': {
        const ch = E.charge(run), h = E.hold(run), rf = E.roil(run);
        return `<b>Roil ${ch} of ${h}</b><br>Your keepsakes stir the aether: ${ch} Roil. The aether around you holds ${h}: your Hold. It is <b>${rf.steps ? 'Roiled' : 'Calm'}</b>.` +
          `<div class="tip-row">${rf.steps ? `In every fight: <b>${roilWords(rf)}</b>, and <b>${roilPay(rf)}</b> after it. ` : `Past ${h} the aether is Roiled. `}${ROIL_LADDER}. ${ROIL_PAYS}.</div>` +
          '<div class="tip-row">Tap a keepsake between fights to drop it. At a Cove or on the stair you can give one to the sea instead, and the sea pays for it.</div>';
      }
      case 'tonic': {
        const t = run.tonics[+parts[1]];
        if (!t) return '<b>Empty tonic slot</b><br>Tonics are found after fights and sold by Barnaby.';
        return `<b>${BL.TONICS[t].name}</b><br>${BL.TONICS[t].desc}<br><span class="muted">Click to use.</span>`;
      }
      case 'light': return `<b>Light: ${c ? c.light : 0}</b><br>${BL.KEYWORDS.Light}`;
      case 'tide': return `<b>Swell: ${c ? c.tide : 3}</b><br>${BL.KEYWORDS.Swell}<div class="tip-row"><b>Crest</b> (at 6): ${BL.KEYWORDS.Crest.split(': ')[1] || BL.KEYWORDS.Crest}</div><div class="tip-row"><b>Strand</b> (at 0): ${BL.KEYWORDS.Strand.split(': ')[1] || BL.KEYWORDS.Strand}</div>`;
      case 'kw': return `<b>${parts[1]}</b><br>${BL.KEYWORDS[parts[1]]}`;
      case 'st': {
        const o = parts[1] === 'p' ? c.player : E.enemyByUid(c, parts[1]);
        return o ? statusTip(o, parts[2]) : '';
      }
      case 'spent': { const sp = c && spentNow(c).find((x) => x[0] === parts[1]); return sp ? spentTip(sp[0], sp[1]) : ''; }
      case 'ward': return `<b>Ward</b><br>${BL.KEYWORDS.Ward}`;
      case 'echo': return `<b>Echo ${c ? c.echo : ''}</b><br>Your next card is played twice.`;
      case 'incoming': return `<b>Incoming damage</b><br>What the enemies intend to hit you for this turn${c && c.thrash ? `, and Thrash ${c.thrash} at the start of your next turn,` : ','} after your current Ward.`;
      case 'intent': {
        const e = E.enemyByUid(c, parts[1]);
        if (!e) return '';
        const info = E.intentInfo(run, e);
        return `<b>Intends: ${info.name}</b><br>${info.parts.join('. ')}.`;
      }
      case 'unit': {
        const isP = parts[1] === 'p';
        const o = isP ? c.player : E.enemyByUid(c, parts[1]);
        if (!o) return '';
        let html = `<b>${isP ? 'Wren, the Keeper' : o.name}</b> ${isP ? run.hp + '/' + run.maxHp : o.hp + '/' + o.maxHp} HP`;
        if (o.ward) html += `, ${o.ward} Ward`;
        if (!isP && o.roil) html += '<div class="tip-row">It followed your Roil here.</div>';
        if (!isP && o.follower) html += '<div class="tip-row">It followed you from the Glimmer Garden.</div>';
        if (!isP) { const info = E.intentInfo(run, o); if (info) html += `<div class="tip-row"><b>Intends: ${info.name}</b><br>${info.parts.join('. ')}.</div>`; }
        Object.keys(o.st).forEach((k) => { if (o.st[k]) html += `<div class="tip-row">${statusTip(o, k)}</div>`; });
        if (isP) spentNow(c).forEach(([k, n]) => { html += `<div class="tip-row">${spentTip(k, n)}</div>`; });
        return html;
      }
      case 'pile': return `<b>${{ draw: 'Draw pile', discard: 'Discard pile', sunk: 'Sunk cards' }[parts[1]]}</b><br>Click to view.`;
      case 'node': return `<b>${parts[1] === 'boss' ? bossName() : NODE_NAME[parts[1]]}</b>`;
    }
    return '';
  }
  function showTip(target, html) {
    if (!html) return hideTip();
    tipEl.innerHTML = html;
    tipEl.hidden = false;
    const r = target.getBoundingClientRect();
    const tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
    let x = r.left + r.width / 2 - tw / 2;
    let y = r.top - th - 8;
    if (y < 6) y = r.bottom + 8;
    x = Math.max(6, Math.min(innerWidth - tw - 6, x));
    y = Math.max(6, Math.min(innerHeight - th - 6, y));
    tipEl.style.left = x + 'px';
    tipEl.style.top = y + 'px';
  }
  function hideTip() { tipEl.hidden = true; ui.tipFor = null; }

  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const t = e.target.closest('[data-tip]');
    if (!t) { hideTip(); return; }
    if (ui.drag && ui.drag.moved) return;
    showTip(t, tipContent(t.dataset.tip));
  });
  document.addEventListener('pointerdown', (e) => {
    ui.lastPointer = e.pointerType || 'mouse';
    Sound.unlock();
    if (e.pointerType !== 'mouse' && !e.target.closest('[data-tip]')) hideTip();
  }, true);
  // a tap's pointerdown doesn't let a page start audio (a mouse press does); the tap's touchend and click do
  ['touchend', 'click'].forEach((ev) => document.addEventListener(ev, () => Sound.unlock(), { capture: true, passive: true }));

  /* ================================================================== *
   *  Cards
   * ================================================================== */
  function combatFmt(target, boost) {
    const c = run.combat;
    return {
      tide: c.tide,
      ward: c.player.ward,
      d: (base) => {
        const v = E.attackValue(c.player, target || null, base);
        if (v > base || boost) return `<span class="num-up">${v}</span>`;
        if (v < base) return `<span class="num-down">${v}</span>`;
        return String(v);
      },
    };
  }
  const plainFmt = { d: (n) => String(n), tide: null, ward: null };
  const TYPE_LABEL = { attack: 'Attack', skill: 'Skill', rite: 'Rite', status: 'Status', curse: 'Curse' };

  function cardInner(card, inCombat, target) {
    const d = BL.CARDS[card.id];
    const cost = E.cost(card, inCombat ? run.combat : null);
    const v = inCombat ? E.playVals(run, card) : E.vals(card);
    const text = markKeywords(d.text(v, inCombat ? combatFmt(target, v.dmg > E.vals(card).dmg) : plainFmt));
    const baseCost = d.cost;
    const long = text.replace(/<[^>]+>/g, '').length > 58;
    const name = E.cardName(card);
    return `<div class="frame"><div class="c-art" style="background-image:url(img/cards/${d.art}.webp)"></div>` +
      `<div class="c-name${name.length >= 14 ? ' long' : ''}"><span>${name}</span></div><div class="c-type">${TYPE_LABEL[d.type]}</div>` +
      `<div class="c-text${long ? ' long' : ''}"><div>${text}</div></div></div>` +
      `<div class="c-cost${cost == null ? ' none' : ''}${cost != null && cost < baseCost ? ' changed' : ''}">${cost == null ? '' : cost}</div>`;
  }
  function cardClass(card) {
    const d = BL.CARDS[card.id];
    return `card t-${d.type} r-${d.rarity}${card.up ? ' up' : ''}`;
  }
  function cardLabel(card) {
    const d = BL.CARDS[card.id];
    const cost = E.cost(card);
    const t = d.text(E.vals(card), plainFmt).replace(/<[^>]+>/g, '');
    return `${E.cardName(card)}, ${TYPE_LABEL[d.type]}${cost != null ? ', costs ' + cost : ''}. ${t}`;
  }
  function staticCard(card, extra, attrs) {
    return `<div class="${cardClass(card)} static ${extra || ''}" ${attrs || ''} data-kws="${keywordsOf(card).join('|')}" aria-label="${cardLabel(card).replace(/"/g, '&quot;')}">${cardInner(card, false)}</div>`;
  }
  /* The keywords on a set of cards to choose from (reward, shop, event picks), explained once each.
     In a fight the same lines show next to a raised card. Pointing at or focusing a card lights its own. */
  function keywordLegend(cards) {
    const seen = [];
    cards.forEach((card) => keywordsOf(card).forEach((k) => { if (seen.indexOf(k) < 0) seen.push(k); }));
    if (!seen.length) return '';
    return `<dl class="kw-legend" aria-label="Keywords on these cards">${seen.map((k) => `<div data-kw="${k}"><dt class="kw ${kwClass(k)}">${k}</dt><dd>${BL.KEYWORDS[k]}</dd></div>`).join('')}</dl>`;
  }
  /* Choosing one of a few (v0.36.0). The user: "pressing card does not lock choice, until continue is pressed. Selecting
     a card shows explanations of effects for that card only. Same with choosing keepsake/potion." A tap, a click, Enter
     or a number key marks one card or keepsake as the pick (`data-act="pick"`, a `data-scope` and a `data-key`); another
     tap moves it, and the screen's Continue or Take (`data-act="pickok"`) takes it. Until then nothing is taken.
     ui.picks[scope] = { key, of }, one for each offer on the screen (a reward's card and its keepsakes): `of` is what the
     pick belongs to (the reward, the chest, the choice), so a pick never outlives its screen. The keyword legend under the cards explains the picked card's words, and only those. */
  const pickOf = (scope, of) => { const p = (ui.picks || {})[scope]; return p && p.of === of ? p.key : null; };
  const PICK_HINT = '<p class="kw-hint">Choose a card to see what its words mean.</p>';
  function pickLegend(scope, card) {
    const kws = card ? keywordsOf(card) : [];
    const inner = !card ? PICK_HINT : kws.length
      ? `<dl class="kw-legend" aria-label="Keywords on ${E.cardName(card)}">${kws.map((k) => `<div data-kw="${k}"><dt class="kw ${kwClass(k)}">${k}</dt><dd>${BL.KEYWORDS[k]}</dd></div>`).join('')}</dl>`
      : `<p class="kw-hint">${E.cardName(card)} has no special words.</p>`;
    return `<div class="pick-legend" data-scope="${scope}" aria-live="polite">${inner}</div>`;
  }
  // the label of the button that takes the pick: before a pick it says what to do, after it what will be taken
  const PICK_OK = {
    'rw-card': (key) => (key == null ? 'Choose a card' : `Take ${E.cardName(pseudo(run.rewards.cards[+key].id, run.rewards.cards[+key].up))}`),
    'rw-ks': (key) => (key == null ? 'Choose a keepsake' : `Take the ${BL.KEEPSAKES[key].name}`),
    // a Dread's one pick (v0.40.0): a card's index or the keepsake's id
    'rw-one': (key) => (key == null ? 'Choose a card or the keepsake' : /^\d+$/.test(key) ? PICK_OK['rw-card'](key) : PICK_OK['rw-ks'](key)),
    'tr-ks': (key) => (key == null ? 'Choose a keepsake' : `Take the ${BL.KEEPSAKES[key].name}`),
    'fall-ks': (key) => (key == null ? 'Choose one to keep' : `Keep the ${BL.KEEPSAKES[key].name}`),
    choice: (key) => (key == null ? 'Choose a card' : `Take ${E.cardName(pseudo(key))}`),
  };
  const pickOkBtn = (scope, key, cls) => `<button class="btn primary${cls ? ' ' + cls : ''}" data-act="pickok" data-scope="${scope}"${key == null ? ' disabled' : ''}>${PICK_OK[scope](key)}</button>`;
  // mark `el` as the pick, without drawing the screen again (the cards' rise would play again)
  function setPick(el, of) {
    const scope = el.dataset.scope, key = el.dataset.key;
    (ui.picks || (ui.picks = {}))[scope] = { key, of };
    const root = el.closest('.scene-inner, .modal') || document;
    $$(`[data-act="pick"][data-scope="${scope}"]`, root).forEach((o) => { const on = o === el; o.classList.toggle('picked', on); o.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    const lg = $(`.pick-legend[data-scope="${scope}"]`, root);
    if (lg && el.classList.contains('card')) lg.outerHTML = pickLegend(scope, scope === 'choice' ? pseudo(key) : pseudo(run.rewards.cards[+key].id, run.rewards.cards[+key].up));
    else if (lg) lg.outerHTML = pickLegend(scope, null); // a keepsake marked in a Dread's one pick: its words are on its tile
    const ok = $(`[data-act="pickok"][data-scope="${scope}"]`, root);
    if (ok) { ok.disabled = false; ok.textContent = PICK_OK[scope](key); }
    sfx('select');
  }
  function lightLegend(card) {
    const scope = card && card.closest('.scene-inner, .modal');
    $$('.kw-legend').forEach((lg) => {
      const kws = scope && scope.contains(lg) ? card.dataset.kws.split('|') : null;
      lg.classList.toggle('focus', !!kws);
      $$('[data-kw]', lg).forEach((row) => row.classList.toggle('on', !!kws && kws.indexOf(row.dataset.kw) >= 0));
    });
  }
  document.addEventListener('pointerover', (e) => { if (e.pointerType === 'mouse') lightLegend(e.target.closest('.card.static[data-kws]')); });
  document.addEventListener('focusin', (e) => { if (e.target.closest) lightLegend(e.target.closest('.card.static[data-kws]')); });
  const pseudo = (id, up) => ({ uid: -1, id, up: up ? 1 : 0 });
  function sortDeck(cards) {
    const order = { attack: 0, skill: 1, rite: 2, status: 3, curse: 4 };
    return cards.slice().sort((a, b) => {
      const da = BL.CARDS[a.id], db = BL.CARDS[b.id];
      return order[da.type] - order[db.type] || da.name.localeCompare(db.name) || b.up - a.up;
    });
  }

  /* ================================================================== *
   *  Overlays (modals)
   * ================================================================== */
  function openOverlay(html, opts) {
    opts = opts || {};
    hideTip();
    overlayEl.innerHTML = html;
    overlayEl.hidden = false;
    ui.overlayOnClose = opts.onClose || null;
    ui.overlayLocked = !!opts.locked;
    const f = (opts.focus && overlayEl.querySelector(opts.focus)) || overlayEl.querySelector('[autofocus]') || overlayEl.querySelector('button, [tabindex="0"]');
    if (f) setTimeout(() => f.focus({ preventScroll: true }), 30);
  }
  function closeOverlay(force) {
    if (overlayEl.hidden) return;
    if (ui.overlayLocked && !force) return;
    overlayEl.hidden = true;
    overlayEl.innerHTML = '';
    const cb = ui.overlayOnClose;
    ui.overlayOnClose = null;
    ui.overlayLocked = false;
    if (cb) cb();
  }
  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl) closeOverlay();
  });
  // the menu's volume sliders: heard while dragged, saved when let go (with a click to judge the sound effects by)
  overlayEl.addEventListener('input', (e) => {
    const r = e.target;
    if (r.matches && r.matches('input.juke-pos')) { // the Jukebox's slider: move through the song as it is dragged
      Sound.juke.seek(+r.value);
      ui.jukeSeekAt = Date.now();
      const t = $('.jp-t', overlayEl);
      if (t) t.textContent = `${mmss(+r.value)} / ${mmss(+r.max)}`;
      return;
    }
    if (!r.matches || !r.matches('input[data-vol]')) return;
    prefs[r.dataset.vol + 'Vol'] = +r.value / 100;
    const o = r.parentElement.querySelector('output');
    if (o) o.textContent = r.value + '%';
    if (r.parentElement.classList.contains('jp-vol-track')) r.parentElement.style.setProperty('--v', r.value + '%'); // the Jukebox's volume wedge fills to here
    Sound.changed();
  });
  overlayEl.addEventListener('change', (e) => {
    const r = e.target;
    if (r.matches && r.matches('.juke-depth select')) { jukeDepth(+r.value); return; }
    if (!r.matches || !r.matches('input[data-vol]')) return;
    savePrefs();
    if (r.dataset.vol === 'sound') sfx('select');
  });

  // `noClose`: no close button in the corner, for a locked window whose own buttons are the only way on
  function modal(title, body, foot, cls, noClose) {
    return `<div class="modal ${cls || ''}" role="dialog" aria-modal="true" aria-label="${title}">` +
      `<div class="modal-head"><h2>${title}</h2>${foot === false || noClose ? '' : `<button class="icon-btn" data-act="close" aria-label="Close">${ICON.close}</button>`}</div>` +
      `<div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}</div>`;
  }

  /* card size in deck and pile views: two readable columns on phones, three or more elsewhere */
  const gridCardW = () => (innerWidth < 600 ? Math.min(160, (innerWidth - 60) / 2.15) : Math.max(96, Math.min(132, (innerWidth - 60) / 3.3)));
  function showDeck(mode, onPick) {
    mode = mode || 'view';
    let cards = sortDeck(run.deck);
    if (mode === 'upgrade') cards = cards.filter(E.canUpgrade);
    if (mode === 'duplicate') cards = cards.filter((c) => BL.CARDS[c.id].type !== 'curse');
    const titles = { view: `Your Deck (${run.deck.length})`, upgrade: 'Choose a card to upgrade', remove: 'Choose a card to remove', shopremove: 'Choose a card to remove', duplicate: 'Choose a card to duplicate' };
    const gcw = gridCardW();
    const grid = `<div class="card-grid" style="--gcw:${gcw}px">` + cards.map((c, i) =>
      staticCard(c, mode === 'view' ? '' : 'choice', `tabindex="0" role="button" data-act="deckpick" data-uid="${c.uid}" data-i="${i}"`)).join('') + '</div>';
    const hint = mode === 'view' ? '<p class="muted" style="margin:0 0 12px">Starting deck plus everything you have collected. Click a card to see its upgrade.</p>' : '';
    const locked = mode === 'remove' || mode === 'upgrade' || mode === 'duplicate';
    openOverlay(modal(titles[mode], hint + (cards.length ? grid : '<p>No cards.</p>'), locked ? null : '<button class="btn" data-act="close">Close</button>'), { locked: locked && !!onPick && !ui.allowCancelPick });
    ui.deckMode = { mode, onPick };
  }

  function deckPick(uid) {
    const m = ui.deckMode;
    if (!m) return;
    const card = run.deck.find((c) => c.uid === uid);
    if (!card) return;
    if (m.mode === 'view') {
      const body = E.canUpgrade(card)
        ? `<div class="compare">${staticCard(card)}<div class="arrow">&#10140;</div>${staticCard(Object.assign({}, card, { up: 1 }))}</div>`
        : `<div class="compare">${staticCard(card)}</div>`;
      const locked = ui.overlayLocked;
      openOverlay(modal(E.cardName(card), body, '<button class="btn" data-act="deckback">Back</button>', 'narrow'), { locked });
      return;
    }
    if (m.mode === 'upgrade') {
      const body = `<div class="compare">${staticCard(card)}<div class="arrow">&#10140;</div>${staticCard(Object.assign({}, card, { up: 1 }))}</div>`;
      openOverlay(modal('Upgrade this card?', body, '<button class="btn" data-act="deckback">Back</button><button class="btn primary" data-act="deckconfirm" autofocus>Upgrade</button>', 'narrow'), { locked: ui.overlayLocked });
      ui.pending = uid;
      return;
    }
    if (m.mode === 'duplicate') {
      const body = `<div class="compare">${staticCard(card)}<div class="arrow">+</div>${staticCard(card)}</div>`;
      openOverlay(modal('Duplicate this card?', body, '<button class="btn" data-act="deckback">Back</button><button class="btn primary" data-act="deckconfirm" autofocus>Duplicate</button>', 'narrow'), { locked: ui.overlayLocked });
      ui.pending = uid;
      return;
    }
    const price = m.mode === 'shopremove' ? ` for ${E.removePrice(run)} Pearls` : '';
    const body = `<div class="compare">${staticCard(card)}</div><p style="text-align:center">This card will be gone from your deck for the rest of the run.</p>`;
    openOverlay(modal(`Remove ${E.cardName(card)}${price}?`, body, '<button class="btn" data-act="deckback">Back</button><button class="btn primary" data-act="deckconfirm" autofocus>Remove</button>', 'narrow'), { locked: ui.overlayLocked });
    ui.pending = uid;
  }

  function showPile(which) {
    const c = run.combat;
    if (!c) return;
    let cards = c[which];
    if (which === 'draw') cards = sortDeck(cards);
    const names = { draw: 'Draw pile', discard: 'Discard pile', sunk: 'Sunk cards' };
    const note = which === 'draw' ? '<p class="muted" style="margin:0 0 12px">Shown in sorted order; the real order is hidden.</p>' : '';
    const gcw = gridCardW();
    const body = note + (cards.length ? `<div class="card-grid" style="--gcw:${gcw}px">${cards.map((x) => staticCard(x)).join('')}</div>` : '<p class="muted">Empty.</p>');
    const tabs = ['draw', 'discard', 'sunk'].map((p) => `<button class="btn small ${p === which ? 'primary' : ''}" data-act="pile" data-pile="${p}">${names[p]} (${c[p].length})</button>`).join('');
    openOverlay(modal(names[which], body, `<div class="pile-tabs">${tabs}</div><button class="btn" data-act="close">Close</button>`));
  }

  /* A choice of cards in a window (an event's, the keepers' cache): mark one, then Take it; the other button skips or goes back. */
  function showCardChoice(ids, title, onDone, back) {
    const body = `<div class="card-row">${ids.map((id, i) => staticCard(pseudo(id), 'choice', `tabindex="0" role="button" aria-pressed="false" data-act="pick" data-scope="choice" data-key="${id}" data-i="${i}"`)).join('')}</div>${pickLegend('choice', null)}`;
    ui.cardChoiceDone = onDone;
    if (ui.picks) delete ui.picks.choice;
    openOverlay(modal(title, body, `<button class="btn" data-act="choosecard" data-id="">${back || `Skip (+${E.DECLINE_SCORE.eventCard} score)`}</button>${pickOkBtn('choice', null)}`, '', true), { locked: true });
  }

  /* How to Play: a short reference in tabs. The tutorial teaches; this is for looking things up. */
  const HELP_TABS = [['basics', 'Basics'], ['tide', 'The Swell'], ['keywords', 'Keywords'], ['map', 'The map'], ['controls', 'Controls']];
  function helpSection(tab) {
    const kbd = (k) => `<span class="kbd">${k}</span>`;
    const dl = (rows) => `<dl class="help-dl">${rows.map((r) => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('')}</dl>`;
    switch (tab) {
      case 'tide': return `<ul class="help-list">
        <li>The <b>Swell</b> is the water around the enemies: a gauge from <b>0 to 6</b>. It starts every fight at 3 and stays put between turns.</li>
        <li><b>Surge</b> raises it. <b>Ebb</b> lowers it.</li>
        <li><b>Crest</b> at 6: 6 damage to <b>every</b> enemy. Ward blocks it, as it blocks any hit. <b>Strand</b> at 0: every enemy loses its Ward, and your first Strand each turn gives you 1 Light. Either way the Swell resets to 3. So a Strand first, then a Crest, hits hardest.</li>
        <li><b>Carry-over:</b> extra Surge or Ebb keeps flowing from 3. Surge 6 from 3 Crests twice.</li>
        <li><b>Chains:</b> each extra Crest in a turn hits 3 harder (6, 9, 12...). Only the first Strand of a turn gives Light; later ones still strip Ward. Save Surge for one big turn.</li>
        <li><b>Bail</b> and <b>Stir</b>, at the two ends of the Swell: once a turn, without a card, spend 1 Light to <b>Ebb 1</b> (Bail) or <b>Surge 1</b> (Stir). A Bail that makes your first Strand of the turn is free, even with no Light left: that Strand's 1 Light pays it back. You can Bail or Stir, not both (with the ${BL.KIT.bailer.name} in your Ditty Bag, twice a turn).</li>
        <li>Your <b>bell</b> pays out when you Crest or Strand. The Brass Tide-Bell draws a card on every one; the other bells in the ${MT.shop} give more, but only on one kind, or only after the first each turn, or Ward instead of a card.</li>
        <li>Badges on your cards say what a card would do right now: ${[['CREST', 'crest'], ['LETHAL', 'lethal'], ['VICTORY', 'victory'], ['STRAND', 'low'], ['ECHO', 'echo']].map((b) => `<span class="c-badge ${b[1]}">${b[0]}</span>`).join(' ')}. <span class="c-badge crest">CREST&times;2</span> means that card makes two Crests.</li>
      </ul>`;
      case 'keywords': return dl(['Bail', 'Stir', 'Sink', 'Float', 'Rite', 'Echo', 'Might', 'Spines', 'Soaked', 'Chilled', 'Brine', 'Seep', 'Thrash'].map((k) => [k, BL.KEYWORDS[k]]))
        + (levelKnown(1) ? `<h3 class="help-sub">In Dark Water</h3>` + dl(['Doused', 'Submerged', 'Shell'].map((k) => [k, BL.KEYWORDS[k]])) : '')
        + (levelKnown(2) ? `<h3 class="help-sub">In the Belfry</h3>` + dl(['Breathless', 'Burst', 'Heartfire'].map((k) => [k, BL.KEYWORDS[k]])) : '');
      case 'map': return `<ul class="help-list">
        <li>An <b>expedition</b> goes down through the Reach one level at a time: ${E.LEVELS.map((L, i) => i).filter(levelKnown).map(levelName).join(', then ')}${allLevelsKnown() ? '' : ', then deeper'}. ${levelKnown(2) ? `The Shallows and Dark Water have ${E.LANDINGS} landings each, ${levelName(2)} ${E.landingsOf(2)}` : `Each level has ${E.LANDINGS} landings`}. Choose a route down; lit stops are where you can go next.</li>
        <li>On the last landing of each level waits its <b>pin</b>, a boss that holds the water over the stair down. Break it, then choose: <b>go home</b> with everything you carry, or <b>go deeper</b>. On the stair down you choose <b>two</b> of six: rest deeply, refit, shed a card, fill up to ${E.STAIR_FLASKS} flasks, open the keepers' cache or give a keepsake to the sea. Break the last pin to bring the Lantern Heart home.</li>
        ${levelKnown(1) && !levelKnown(2) ? `<li>Below ${levelName(1)} the stair runs under the sea. Until you have something to dive in, ${levelName(1)}'s pin is as deep as an expedition can go.</li>` : ''}
        ${levelKnown(2) ? `<li><b>The Belfry</b> is under the sea. To go down into it you must wear the <b>${BL.KIT.suit.name}</b>. It hangs above the stair the first time you break Dark Water's pin: carry it home, and from then on you can wear it in your Rig place, over your oilskin. It does nothing in a fight. Once the Heart is home, the ${MT.shop} can make you the <b>${BL.KIT.plated.name}</b>, which opens the Belfry too.</li>
        <li><b>The Belfry is a dive</b>: no branches, no shops, no Coves. Two Dreads, each with a <b>lesser bell</b> after it, then the Bellwether. Under a lesser bell there is air: choose <b>one</b> of six there: rest, refit, shed a card, fill up to ${E.STAIR_FLASKS} flasks, give a keepsake to the sea, or swim out into the dark (a Fog event).</li>
        <li>Once the Heart is home, the deep grows toward your own lantern. The Belfry's Dreads change, and its last landing holds your own fear. Beat it to quiet the Belfry and come home.</li>` : ''}
        <li>Each landing scores more deeper down: ${E.LEVELS.map((L, i) => i).filter(levelKnown).map((i) => `${E.LEVELS[i].landing} in ${levelName(i)}`).join(', ')}${allLevelsKnown() ? '' : ', and more below'}. Coming home adds 5 for each HP you have left. Bringing the Heart home${levelKnown(2) ? ', or quieting the Belfry,' : ''} adds ${E.FINAL_SCORE}.</li>
      </ul>${dl([
        [`${NODE_ICON.fight} Skirmish`, 'A normal fight.'],
        [`${NODE_ICON.elite} Dread`, 'An elite: harder. It pays Pearls, and you choose one: a card from three (more often uncommon or rare), or its keepsake. No tonic.'],
        [`${NODE_ICON.event} Fog`, 'An event with choices. Some are gambles.'],
        [`${NODE_ICON.shop} Shop`, 'Barnaby sells cards, keepsakes and tonics, and removes a card for Pearls.'],
        [`${NODE_ICON.rest} Cove`, `Rest to heal 30% of your max HP, or upgrade a card, or give a keepsake to the sea: it is gone, and you ${SEA_PAYS} and upgrade a card.`],
      ].concat(levelKnown(2) ? [[`${NODE_ICON.pocket} Lesser bell`, 'In the Belfry: air under a hanging bell. Choose one of six.']] : [], [
        [`${NODE_ICON.treasure} Wreck`, `Pearls, and you may take 1 of ${E.WRECK_KEEPSAKES} keepsakes.`],
        [`${NODE_ICON.toll} Toll`, `Right after the Wreck, on every route: a bell across the way. Pay to pass: ${tollText(0)}${levelKnown(1) ? ` (in Dark Water ${tollText(1, true)})` : ''}.`],
      ]))}<ul class="help-list">
        <li>After a Skirmish: Pearls, sometimes a tonic, and 1 of 3 cards (or skip: a small deck draws its best cards more often).</li>
        <li>Bonus Pearls for <b>Flawless</b> (no HP lost), <b>Swift</b> (3 turns or less, 4 for Dreads), <b>Tidal Fury</b> (2+ Crests in a turn) and <b>High and Dry</b> (2+ Strands in a turn).</li>
        <li><b>Keepsakes</b> last the whole expedition, and each stirs the aether around you: its <b>Roil</b>. The aether around you holds ${E.HOLD} Roil: your <b>Hold</b>.${E.HOLD_STEP ? ` The first time you reach Dark Water, and again the first time you reach the Belfry, your Hold grows by ${E.HOLD_STEP} for good.` : ''}${workshopOpen() ? ` In the ${MT.shop}, a steadier lantern adds ${E.HOLD_UP.step} to your Hold for each of its ${E.HOLD_UP.prices.length} steps.` : ''} Up to your Hold the aether is <b>Calm</b>. Past it the aether is <b>Roiled</b>. ${ROIL_LADDER}. There are never more than ${E.MAX_ROIL_MINNOWS} Bell Minnows. ${ROIL_PAYS}. You can drop a keepsake between fights, or give one to the sea at a Cove or on the stair: you ${SEA_PAYS} and upgrade a card.</li>
        <li><b>Deeper finds are stronger.</b> Some keepsakes are found only ${levelKnown(2) ? 'in Dark Water and deeper, or only in the Belfry' : levelKnown(1) ? 'in Dark Water and deeper' : 'below the Shallows'}, and they carry more Roil. There, the first keepsake in every Wreck, Dread's pick and shop is one of the level's own, while any are left.</li>
        <li><b>The Lazaret</b> is the locked store room at the lighthouse, on the title screen. It opens the first time you come home. When you come home, every keepsake you carry is kept there, and it can keep many of each. Before an expedition you may bring any number of kinds, one of each, and each counts toward your Hold. A keepsake you bring leaves the Lazaret: it comes back if you come home with it, and if you fall, drop it or give it to the sea, it is gone. When you fall you may hold on to one keepsake you carried, and it goes into the Lazaret. A spare copy (a second of the same kind) can be broken down for ${MT.currency}: half its Roil, rounded up.</li>
        <li><b>Tonics</b> are one-use; they sit in the top bar. A <b>curse</b> is an unplayable card that stays in your deck until you remove it.</li>
        <li>Turning down a reward adds to your final score: <b>+${E.DECLINE_SCORE.card}</b> for skipping a card or choosing an event's Leave, <b>+${E.DECLINE_SCORE.keepsake}</b> for leaving the keepsakes, <b>+${E.DECLINE_SCORE.tonic}</b> for leaving a tonic when you have a free slot.</li>
        <li><b>Currents</b> open once the Heart has come home. Choose any of them on shore: each makes the whole expedition harder and adds &times;${E.CURRENT_SCORE} to your score. ${Object.keys(E.CURRENTS).map((k) => `<b>${E.CURRENTS[k].name}</b>: ${E.CURRENTS[k].desc.replace(/\.$/, '')}`).join('. ')}.</li>
        <li>Every finished expedition turns its score into <b>${MT.currency}</b> (1 per ${E.SALVAGE_PER_SCORE}). Spend it in the <b>${MT.shop}</b> on the title screen on <b>${MT.item.toLowerCase()}</b> that lasts across runs: one piece each for your ${BL.KIT_PLACES.map((pl) => pl.name.toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' and $1')}. Achievements unlock more. Choose what to wear before each descent.</li>
      </ul>`;
      case 'controls': return dl([
        ['Mouse', 'Click a card, then click an enemy (or the card again). Or drag a card onto an enemy, or up into the sea. Hover anything for details.'],
        ['Touch', 'Tap a card to raise it, then tap an enemy or the card again. Dragging works too. Tap a creature to read its effects.'],
        ['Keyboard', `${kbd('1')}-${kbd('0')} pick a card, ${kbd('&larr;')} ${kbd('&rarr;')} aim, ${kbd('Enter')} play, ${kbd('Esc')} cancel, ${kbd('E')} end turn, ${kbd('B')} Bail, ${kbd('S')} Stir, ${kbd('D')} deck, ${kbd('Z')} ${kbd('X')} ${kbd('C')} tonics. On the map: arrows and ${kbd('Enter')}.`],
      ]);
      default: return `<ul class="help-list">
        <li><b>Win a fight</b> by bringing every enemy to 0 HP. If your HP reaches 0, the run is over.</li>
        <li><b>Each turn</b> you get <b>3 Light</b> and draw <b>5 cards</b>. A card costs the Light in its corner.</li>
        <li>The <b>intent</b> above an enemy shows what it will do on its turn. The number is the damage it will deal, already counting statuses such as its Might and your Soaked.</li>
        <li><b>Ward</b> blocks damage, then washes away at the start of your next turn. Enemies can have Ward too; theirs lasts until they act again. Ward blocks only damage: a move that also Soaks or Chills you does that even when your Ward takes the whole hit.</li>
        <li>Played and unplayed cards go to the <b>discard pile</b>. When the draw pile runs out, the discard pile is shuffled back in.</li>
      </ul>`;
    }
  }
  function helpHTML(tab) {
    const tabs = HELP_TABS.map(([id, name]) => `<button class="tab${id === tab ? ' on' : ''}" data-act="helptab" data-tab="${id}" aria-pressed="${id === tab}">${name}</button>`).join('');
    return `<div class="help"><div class="tabs" role="group" aria-label="Sections">${tabs}</div><div class="help-sec">${helpSection(tab)}</div></div>`;
  }
  function showHelp(tab) {
    ui.helpTab = tab || ui.helpTab || 'basics';
    const tutBtn = run && run.tutorial ? '' : '<button class="btn" data-act="tutorial">Play the tutorial</button>';
    openOverlay(modal('How to Play', helpHTML(ui.helpTab), `${tutBtn}<button class="btn primary" data-act="close" autofocus>Got it</button>`, 'help-modal'));
  }

  /* Sound effects or Music in the menu: a switch, and a volume slider beside it or under it on a narrow screen
     (see the 'input' listener on the overlay). No description line, so the menu doesn't grow. */
  function volumeRow(key, name) {
    const on = !!prefs[key], v = Math.round(prefs[key + 'Vol'] * 100);
    return `<div class="choice vol-row${on ? '' : ' off'}">
      <button class="vol-switch" data-act="toggle${key}" aria-pressed="${on}"><b>${name}: ${on ? 'On' : 'Off'}</b></button>
      <div class="vol-line"><input type="range" min="0" max="100" step="5" value="${v}" data-vol="${key}" aria-label="${name} volume"><output>${v}%</output></div>
    </div>`;
  }
  function showMenu() {
    const body = `<div class="choice-list" style="margin:0 auto">
      <button class="choice" data-act="close"><b>Resume</b><span>Back to the deep.</span></button>
      <button class="choice" data-act="help"><b>How to Play</b><span>Rules, controls and glossary.</span></button>
      <button class="choice" data-act="story"><b>Story so far</b><span>The story, the world and your keeper's notes.</span></button>
      ${run && run.tutorial ? '<button class="choice" data-act="tutskip"><b>Leave the tutorial</b><span>You can replay it from the menu or the title screen.</span></button>' : '<button class="choice" data-act="tutorial"><b>Tutorial</b><span>A guided fight that teaches the basics.' + (run ? ' Your run is saved and waits for you.' : '') + '</span></button>'}
      ${volumeRow('sound', 'Sound effects')}
      ${volumeRow('music', 'Music')}
      <button class="choice" data-act="togglefast"><b>Fast animations: ${prefs.fast ? 'On' : 'Off'}</b><span>Halves the waits between actions.</span></button>
      ${run && !run.tutorial ? '<button class="choice" data-act="totitle"><b>Save and quit to title</b><span>Your run is saved; continue it from the title screen.</span></button>' : ''}
      ${run && !run.tutorial ? '<button class="choice" data-act="abandon"><b>Abandon run</b><span>Give up this descent and start fresh.</span></button>' : ''}
      ${run ? '' : '<button class="choice" data-act="progress"><b>Back up or reset progress</b><span>Save your progress to a file, load it again, or start over.</span></button>'}
    </div>
    <p class="menu-version"><button class="title-version" data-act="changelog">Brinelight v${BL.VERSION} &middot; What's new</button>
      <button class="title-version" data-act="credits">Credits</button></p>`;
    openOverlay(modal('Menu', body, null, 'narrow'));
  }

  /* What a Roiled aether adds to every fight, in words: "1 Seep, Thrash 1 and 1 Bell Minnow". Empty when Calm. */
  function roilWords(fx, short) {
    const parts = [];
    if (fx.seep) parts.push(`${fx.seep} Seep`);
    if (fx.thrash) parts.push(`Thrash ${fx.thrash}`);
    if (fx.minnows) parts.push(`${fx.minnows} ${short ? 'Minnow' : 'Bell Minnow'}${fx.minnows > 1 ? 's' : ''}`);
    if (short) return parts.join(', ');
    return parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts.join('');
  }
  const ROIL_LADDER = `Every ${E.SEEP_STEP} Roil over (or part of ${E.SEEP_STEP}) is one step, and each step adds one thing to every fight: first a <b>Seep</b> (an unplayable card), then <b>Thrash</b> (1 damage at the start of each turn, unless you kept Ward for it), then a <b>Bell Minnow</b> (an extra enemy, at half health), then a second Seep, and so on round`;
  const SEA_PAYS = `heal ${E.SEA_HEAL} HP for each fight you won while carrying it (never more than a Cove's rest)`;
  const ROIL_PAYS = `A Roiled aether also pays: <b>${E.ROIL_PAY} more Pearls</b> after each fight for each step`;
  /* What a Roiled aether pays after each fight: "+16 Pearls". */
  const roilPay = (fx) => (fx.steps ? `+${fx.steps * E.ROIL_PAY} Pearls` : '');
  const roilToast = (fx) => toast(`The aether is Roiled: ${roilWords(fx)} in this fight`, 3600);
  /* Where a deeper keepsake is found: its level and the ones below it. */
  const foundIn = (k) => { const d = E.keepsakeDepth(k); return d ? `Found in ${E.LEVELS[d].the}${d < E.LEVELS.length - 1 ? ' and deeper' : ''}.` : 'Found anywhere.'; };
  /* A keepsake, between fights: what it does, its Roil, and a way to drop it. */
  function showKeepsake(k) {
    const K = BL.KEEPSAKES[k];
    if (!K) return;
    const ch = E.charge(run), h = E.hold(run), rf = E.roil(run);
    const without = roilWords(E.roilFor(ch - K.charge, h));
    const body = `<div style="display:flex;gap:14px;align-items:center"><div class="medal" style="width:72px;height:72px;flex:0 0 auto"><img src="img/icons/${K.art}.webp" alt=""></div><p style="margin:0;font-size:16px">${K.desc}</p></div>
      ${K.deep ? `<p class="buy-left muted">${foundIn(k)}</p>` : ''}<p class="buy-left">Roil ${K.charge}. You carry ${ch} of your Hold of ${h}${rf.steps ? `: <b>${roilWords(rf)}</b> in every fight, and ${roilPay(rf)} after it` : ''}.${rf.steps ? ` Without it: ${without || 'the aether is Calm'}.` : ''}</p>
      <p class="buy-left muted">At a Cove or on the stair you can give it to the sea: heal ${E.seaHeal(run, k)} HP now (${E.SEA_HEAL} for each fight you have won carrying it, up to a Cove's rest) and refit a card.</p>
      <p class="buy-left muted">${E.wasBrought(run, k) && !run.takenOut ? 'You brought it from the Lazaret. Dropping it leaves it out of this descent, and it is in the Lazaret again when you get home' : E.wasBrought(run, k) ? 'You brought it from the Lazaret, so dropping it takes it out of the Lazaret too: it is gone for good' : 'Dropping it is for good'}${k === 'biscuit' ? `${E.wasBrought(run, k) ? '. Its' : ', and its'} 10 Max HP go with it` : ''}.</p>`;
    openOverlay(modal(K.name, body, `<button class="btn" data-act="ksdrop" data-k="${k}">Drop it</button><button class="btn primary" data-act="close" autofocus>Keep it</button>`, 'narrow'));
  }

  function showTonic(slot) {
    const t = run.tonics[slot];
    if (!t) return;
    const td = BL.TONICS[t];
    const c = run.combat;
    const canUse = (c && c.phase === 'player' && !ui.busy && !c.won && !c.lost) || (td.anywhere && !c);
    const body = `<div style="display:flex;gap:14px;align-items:center"><div class="medal" style="width:72px;height:72px"><img src="img/icons/${td.art}.webp" alt=""></div><p style="margin:0;font-size:16px">${td.desc}${canUse ? '' : '<br><span class="muted">Usable during your turn in a fight.</span>'}</p></div>`;
    const foot = `<button class="btn" data-act="tonicdiscard" data-slot="${slot}">Discard</button><button class="btn" data-act="close">Cancel</button>` +
      (canUse ? `<button class="btn primary" data-act="tonicuse" data-slot="${slot}" autofocus>Use</button>` : '');
    openOverlay(modal(td.name, body, foot, 'narrow'));
  }

  /* ================================================================== *
   *  HUD
   * ================================================================== */
  function hudHTML() {
    const ks = run.keepsakes.map((k) => `<button class="medal" data-tip="ks:${k}" data-act="ks" data-k="${k}" aria-label="${BL.KEEPSAKES[k].name}, Roil ${BL.KEEPSAKES[k].charge}: ${BL.KEEPSAKES[k].desc}"><img src="img/icons/${BL.KEEPSAKES[k].art}.webp" alt=""></button>`).join('');
    const bell = E.bell(run) ? BL.KIT[E.bell(run)] : null;
    const kitIds = E.kitIds(run).filter((id) => BL.KIT[id].place !== 'bell');
    const ch = E.charge(run), hold = E.hold(run), rf = E.roil(run);
    const ts = run.tonics.map((t, i) => t
      ? `<button class="medal tonic-slot${ui.tonicSel === i ? ' selected' : ''}" data-tip="tonic:${i}" data-act="tonic" data-slot="${i}" aria-label="Tonic: ${BL.TONICS[t].name}"><img src="img/icons/${BL.TONICS[t].art}.webp" alt=""></button>`
      : `<span class="medal empty" data-tip="tonic:${i}" aria-hidden="true"></span>`).join('');
    return `<header class="hud${run.screen === 'combat' ? ' in-combat' : ''}">
      <div class="stat hp" data-tip="hp" aria-label="Health">${ICON.heart}<span>${run.hp}/${run.maxHp}</span></div>
      <div class="stat pearls" data-tip="pearls" aria-label="Pearls">${ICON.pearl}<span>${run.pearls}</span></div>
      <div class="stat floor" data-tip="floor">${ICON.anchor}<span><span class="lbl">Landing </span>${run.floor}/${E.mapRows(run) + 1}</span></div>
      <div class="hud-break"></div>
      ${bell ? `<button class="medal gear bell" data-tip="bell" data-act="kitinfo" data-k="bell" aria-label="${bell.name}: ${bell.desc}"><img src="img/icons/${bell.art}.webp" alt=""></button>` : ''}
      ${kitIds.length ? `<button class="medal gear-pack" data-tip="kit" data-act="kitinfo" aria-label="${MT.item}: ${kitIds.map((id) => BL.KIT[id].name).join(', ')}">${ICON.pack}<span class="n">${kitIds.length}</span></button>` : ''}
      ${run.keepsakes.length ? `<button class="charge${rf.steps ? ' over' : ''}" data-tip="charge" data-act="kitinfo" aria-label="Roil ${ch} of ${hold}${rf.steps ? `, ${roilWords(rf)} in every fight` : ''}">${ICON.charge}<span>${ch}/${hold}</span></button>` : ''}
      <div class="keepsakes">${ks}</div>
      <div class="tonics">${ts}</div>
      <button class="icon-btn" data-act="deck" aria-label="View deck (D)" title="Deck (D)">${ICON.deck}</button>
      <button class="icon-btn" data-act="menu" aria-label="Menu" title="Menu">${ICON.menu}</button>
    </header>`;
  }
  function updateHud() {
    const h = $('.hud', screenEl);
    if (!h) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = hudHTML();
    const nh = tmp.firstElementChild;
    ['.stat.hp', '.stat.pearls', '.stat.floor', '.tonics'].forEach((sel) => {
      const a = $(sel, h), b = $(sel, nh);
      if (a && b && a.innerHTML !== b.innerHTML) {
        a.innerHTML = b.innerHTML;
        if (sel === '.stat.pearls' || sel === '.stat.hp') anim(a, 'bump', 450);
      }
    });
    const ka = $('.keepsakes', h), kb = $('.keepsakes', nh);
    if (ka && kb && ka.children.length !== kb.children.length) ka.innerHTML = kb.innerHTML;
  }

  /* ================================================================== *
   *  Screens
   * ================================================================== */
  function render() {
    renderScreen();
    fitScene();
    if (Teach) Teach.checkHints();
  }
  /* Re-render the same screen and keep its scroll position (shop purchases). */
  function renderKeepScroll() {
    const sc = $('.scene', screenEl);
    const y = sc ? sc.scrollTop : 0;
    render();
    const sc2 = $('.scene', screenEl);
    if (sc2) { sc2.scrollTop = y; updateScrollCue(sc2); }
  }
  /* Scene screens (events, the Wreck, rewards, the shop): shrink a tall picture so the choices
     under it fit on screen, and show a "More below" cue whenever the screen still scrolls. */
  function fitScene() {
    const sc = $('.scene', screenEl);
    if (!sc) return;
    const art = $('.event-art, .chest', sc);
    if (art) {
      art.style.height = '';
      const over = sc.scrollHeight - sc.clientHeight;
      if (over > 0) {
        const h = art.getBoundingClientRect().height;
        const min = Math.min(h, innerHeight < 560 ? 90 : 130);
        art.style.height = Math.max(min, Math.floor(h - over - 2)) + 'px';
      }
    }
    if (!sc._cue) { sc._cue = true; sc.addEventListener('scroll', () => updateScrollCue(sc), { passive: true }); }
    updateScrollCue(sc);
  }
  function updateScrollCue(sc) {
    const body = sc.parentElement;
    if (!body) return;
    let cue = $('.scroll-cue', body);
    const more = sc.scrollHeight - sc.clientHeight - sc.scrollTop > 16;
    if (!cue && more) {
      cue = document.createElement('button');
      cue.type = 'button';
      cue.className = 'scroll-cue';
      cue.tabIndex = -1;
      cue.setAttribute('aria-hidden', 'true');
      cue.innerHTML = `More below ${ICON.chevron}`;
      cue.addEventListener('click', () => sc.scrollBy({ top: sc.clientHeight * 0.7, behavior: 'smooth' }));
      body.appendChild(cue);
    }
    if (cue) cue.hidden = !more;
  }
  /* The music and the place's own sounds follow the screen: the score has a cue for each kind of screen
     (see music/brinelight.scrim), and its intensity is the depth, as is the echo on the sound effects. */
  const TITLE_LOOP = ['title', 'bells', 'hermit', 'buoy', 'watch'];
  const SHOP_SONGS = ['shop', 'shell'];
  let shopSong = null, inShop = false; // Barnaby's songs take turns, one each visit, starting on one at random
  let titleFirst = null; // the title song this page load starts on: the keeper's song until it has been heard once
  function updateSound() {
    /* Recorded songs at Barnaby's, and against the Harbour Hermit, the Tolling Buoy (two songs and a music-box cue of its
       own, taking turns), the Bellwether, four Dreads (the Garden Strider, the Crowned Oarfish, the Bell Yearling and the
       Drowned Cantor) and the Dark Watch's second half. The title screen plays its songs in turn, the ones that are open in the Jukebox (jukeOpen): The
       Great Light Turning Slow, the Hermit's song, Tide Swings Its Tongue and It Went Dark on My Watch, all from the
       start (what they hint at is foreshadowing), and Harbour Bells at Dawn once the Heart is home (it plays then). Each time the page loads it starts on one of them
       at random (titleFirst) and goes on in order. */
    const open = TITLE_LOOP.filter((k) => jukeOpen('song', k));
    if (!titleFirst) titleFirst = meta.heard.indexOf('song:title') < 0 ? 'title' : open[Math.floor(Math.random() * open.length)];
    const at = Math.max(0, open.indexOf(titleFirst));
    let cue = 'title', depth = 0, band = null, density = 0, song = open.slice(at).concat(open.slice(0, at));
    if (run) {
      song = null;
      band = E.bandId(run);
      depth = Math.max(0, ['shallows', 'dark', 'belfry'].indexOf(band));
      const c = run.screen === 'combat' && run.combat;
      if (run.screen === 'victory') { cue = 'home'; if (run.heart) song = 'bells'; } // the Heart home: Harbour Bells at Dawn
      else if (run.screen === 'defeat') cue = 'fallen';
      else if (c) {
        cue = c.kind === 'boss' ? (c.phase2 ? 'pin2' : 'pin') : c.kind === 'elite' ? 'dread' : 'fight'; density = c.kind === 'boss' ? 0 : 0.5;
        // the Hermit has two songs, and one plays for the whole fight (fightSong chooses it when the fight starts)
        if (c.kind === 'boss' && c.enemies.some((e) => e.id === 'harbour')) song = 'hermit';
        if (song === 'hermit' && c.song === 'deep') song = 'deep';
        if (c.kind === 'boss' && c.enemies.some((e) => e.id === 'buoy')) cue = 'buoy'; // its own music-box piece (v0.36.0; Tide Swings Its Tongue before)
        // a fight with songs of its own (FIGHT_SONGS) plays the one fightSong chose; the Buoy's 'box' is its music-box piece
        if (c.song && Sound.juke.SONGS[c.song]) song = c.song;
        if (c.kind === 'boss' && c.enemies.some((e) => e.id === 'bell' || e.id === 'bellthing')) song = 'bell'; // its second phase is the Thing in the Bell
        // the Dark Watch plays the score's pin cue until it calls Nobody Comes Home, a Hollow Diver; then the Divers' song
        // (v0.45.0, the user's call: the music changed there already, from the pin cue to its second phase)
        if (c.kind === 'boss' && c.phase2 && c.enemies.some((e) => e.id === 'darkwatch')) song = 'nobody';
      } else {
        cue = 'reach'; density = 1;
        if (run.screen === 'shop') {
          if (!inShop) shopSong = shopSong ? SHOP_SONGS[(SHOP_SONGS.indexOf(shopSong) + 1) % SHOP_SONGS.length] : SHOP_SONGS[Math.floor(Math.random() * SHOP_SONGS.length)];
          song = shopSong;
        }
      }
    }
    inShop = !!run && run.screen === 'shop';
    Sound.scene(cue, depth, band, density, song);
  }
  /* The songs a fight chooses from as it starts (fightSong), by the id of the creature they are for (v0.45.0): the
     Tolling Buoy's singer, with the music box's The Rocking Toll as a third ('box'), and the Dreads with songs of their
     own. Another Dread plays the score's Dread cue. */
  const FIGHT_SONGS = { buoy: ['hush', 'chain', 'box'], strider: ['gardener', 'putback'], oarfish: ['herring'], yearling: ['eye'], cantor: ['cantor'] };
  const lastFightSong = {}; // this page load's last choice for each creature, so that, once all are heard, none comes twice running
  /* A fight's song, chosen as it starts and kept for the whole fight (run.combat.song, saved with the run).
     The Harbour Hermit: the first meeting plays The Hermit's Heavy Toll, the second Ring for the Deep, and after that
     one of the two at random. Until v0.33.0 Ring for the Deep took over mid-fight, when the Hermit or the Buoy turned;
     the user found it didn't work straight after the first song, and wanted the Buoy to keep its own. Call it before
     save(): saving notes the Hermit in the story marks, which is how a later meeting is told from the first.
     FIGHT_SONGS: the first one not yet heard, in the list's order (the Buoy: What the Bell Is Saying, Down on the Chain,
     then The Rocking Toll), and once all are heard one at random that didn't play last time, so the Strider's two take
     turns. */
  function fightSong() {
    const c = run && run.combat;
    if (!c || c.song || (c.kind !== 'boss' && c.kind !== 'elite')) return;
    if (c.kind === 'boss' && c.enemies.some((e) => e.id === 'harbour')) {
      const metBefore = storyMarks().indexOf('en:harbour') >= 0;
      c.song = !metBefore ? 'hermit' : meta.heard.indexOf('song:deep') < 0 ? 'deep' : Math.random() < 0.5 ? 'deep' : 'hermit';
      return;
    }
    const id = Object.keys(FIGHT_SONGS).find((k) => c.enemies.some((e) => e.id === k));
    if (!id) return;
    const list = FIGHT_SONGS[id], heard = (k) => meta.heard.indexOf(k === 'box' ? 'cue:' + id : 'song:' + k) >= 0;
    const others = list.filter((k) => k !== lastFightSong[id]);
    c.song = list.find((k) => !heard(k)) || others[Math.floor(Math.random() * others.length)];
    lastFightSong[id] = c.song;
  }
  function renderScreen() {
    hideTip();
    ui.combatRef = null;
    updateSound();
    if (!run) return renderTitle();
    switch (run.screen) {
      case 'map': return renderMap();
      case 'combat': return renderCombat();
      case 'reward': return renderReward();
      case 'rest': return renderRest();
      case 'pin': return renderPin();
      case 'shop': return renderShop();
      case 'event': return renderEvent();
      case 'treasure': return renderTreasure();
      case 'toll': return renderToll();
      case 'victory': return renderEnd(true);
      case 'defeat': return renderEnd(false);
    }
  }

  /* ----- Title ----- */
  function renderTitle() {
    const saved = loadSave();
    // once the Heart is home the lighthouse on the title screen is lit (v0.37.0, the user's idea)
    screenEl.innerHTML = `<div class="title-screen${E.heartIsHome(meta) ? ' lit' : ''}">
      <div class="title-corner"><button class="icon-btn" data-act="menu" aria-label="Settings">${ICON.menu}</button></div>
      <div class="title-now"></div>
      <div class="logo">BRINELIGHT</div>
      <p class="tagline">${BL.STORY.title}</p>
      <div class="title-buttons">
        ${saved ? `<button class="btn primary" data-act="continue" autofocus>Continue (Landing ${saved.floor})</button>` : ''}
        <button class="btn ${saved ? '' : 'primary solo'}" data-act="newrun" ${saved ? '' : 'autofocus'}>New Descent</button>
        ${workshopOpen() ? `<button class="btn ghost second ws-btn${lazaretOpen() ? '' : ' span'}" data-act="workshop" aria-label="${MT.shop}: ${meta.salvage} ${MT.currency}">${ICON.salvage}${MT.shop} <small>${meta.salvage}</small></button>` : ''}
        ${lazaretOpen() ? `<button class="btn ghost second${workshopOpen() ? '' : ' span'}" data-act="lazaret" aria-label="Lazaret: ${E.lazKinds(meta).length} of ${KS_TOTAL} kinds of keepsake">Lazaret <small class="btn-count">${E.lazKinds(meta).length}/${KS_TOTAL}</small></button>` : ''}
        <div class="title-third">
          <button class="btn ghost third" data-act="story">Story so far${storyUnread().length ? ' <span class="new-pill">New</span>' : ''}</button>
          ${logbookOpen() ? '<button class="btn ghost third" data-act="logbook">Logbook</button>' : ''}
          <button class="btn ghost third" data-act="tutorial">Tutorial</button>
          <button class="btn ghost third" data-act="help">How to Play</button>
          <button class="btn ghost third" data-act="jukebox">Jukebox</button>
        </div>
      </div>
      ${getNum(BEST_KEY) ? `<div class="title-best">Best score ${getNum(BEST_KEY)}${meta.record.hearts ? ` &middot; The Heart is home${meta.record.quiets ? `, the Belfry quieted ${meta.record.quiets} time${meta.record.quiets > 1 ? 's' : ''}` : ''}` : ''}</div>` : ''}
      <div class="title-foot"><span>A roguelike deckbuilder &middot; mouse, touch or keyboard</span>
        <span class="title-pills"><button class="title-version" data-act="changelog">v${BL.VERSION} &middot; What's new${versionIsNew() ? ' <span class="new-pill">New</span>' : ''}</button>
        <button class="title-version" data-act="credits">Credits</button></span></div>
    </div>`;
    drawNow();
    const f = $('[autofocus]', screenEl);
    if (f) f.focus({ preventScroll: true });
    showNews(); // anything that opened without being told (the end screen's window was missed)
  }

  /* Story so far: the story in chapters, a glossary of the world, and notes found by meeting things.
     Content and unlock marks are in BL.STORY (js/data.js). Entries opened since the last visit are marked New. */
  const STORY_TABS = [['story', 'Story'], ['world', 'The world'], ['notes', "Keeper's notes"]];
  const storyTabOf = (id) => (BL.STORY.chapters.some((c) => c.id === id) ? 'story' : 'notes');
  function storySection(tab) {
    const S = BL.STORY, marks = storyMarks(), fresh = ui.storyFresh || [];
    const pill = (en) => (fresh.indexOf(en.id) >= 0 ? ' <span class="new-pill">New</span>' : '');
    // a locked note doesn't name a level that hasn't been found
    const lockText = (en) => (!levelKnown(2) && /Belfry/.test(en.lock) ? 'Found deeper down.' : !levelKnown(1) && /Dark Water/.test(en.lock) ? 'Found below the Shallows.' : en.lock);
    const locked = (label, en) => `<div class="st-lock">${ICON.lock}<span><b>${label}</b> ${lockText(en)}</span></div>`;
    if (tab === 'world') {
      // an entry about a level opens once the level is known (its third field: { level, before: the text until then })
      const shown = (r) => (!r[2] || levelKnown(r[2].level) ? r[1] : r[2].before || null);
      return S.world.map((g) => `<h3 class="st-group">${g.group}</h3><dl class="help-dl">${g.items.filter((r) => shown(r)).map((r) => `<dt>${r[0]}</dt><dd>${shown(r)}</dd>`).join('')}</dl>`).join('');
    }
    if (tab === 'notes') {
      const found = S.notes.filter((n) => E.storyOpen(n, marks)).length;
      return `<p class="st-count"><b>${found} of ${S.notes.length}</b> found. You write a note when you first meet something in the Reach.</p>` + S.notes.map((n) => (E.storyOpen(n, marks)
        ? `<section class="st-note">${n.art ? `<img src="img/${n.art}.webp" alt="">` : ''}<div><h3>${n.title}${pill(n)}</h3><p>${n.text}</p></div></section>`
        : locked('Not found yet.', n))).join('');
    }
    return S.chapters.map((ch, i) => {
      if (!E.storyOpen(ch, marks)) return locked(`Chapter ${i + 1}: ${ch.title}.`, ch);
      const paras = ch.opening ? S.opening.map((b) => b.text) : ch.text;
      const again = ch.opening ? '<button class="btn small" data-act="opening">Play the opening again</button>' : ch.scene ? `<button class="btn small" data-act="scene" data-id="${ch.scene}">See it again</button>` : '';
      return `<section class="st-ch"><h3><small>Chapter ${i + 1}</small>${ch.title}${pill(ch)}</h3>${paras.map((t) => `<p>${t}</p>`).join('')}${again}</section>`;
    }).join('');
  }
  function storyHTML(tab) {
    const fresh = ui.storyFresh || [];
    const tabs = STORY_TABS.map(([id, name]) => {
      const n = fresh.filter((f) => storyTabOf(f) === id).length;
      return `<button class="tab${id === tab ? ' on' : ''}" data-act="storytab" data-tab="${id}" aria-pressed="${id === tab}">${name}${n ? ` <span class="new-pill">${n}</span>` : ''}</button>`;
    }).join('');
    return `<div class="story"><div class="tabs" role="group" aria-label="Sections">${tabs}</div><div class="help-sec">${storySection(tab)}</div></div>`;
  }
  function showStory(tab) {
    const unread = storyUnread().map((en) => en.id);
    if (unread.length || !ui.storyFresh) ui.storyFresh = unread;
    if (unread.length) { story.read.push(...unread); saveStory(); }
    ui.storyTab = tab || (unread.length ? storyTabOf(unread[0]) : ui.storyTab) || 'story';
    const pill = $('[data-act="story"] .new-pill', screenEl);
    if (pill) pill.remove();
    openOverlay(modal('Story so far', storyHTML(ui.storyTab), '<button class="btn primary" data-act="close" autofocus>Close</button>', 'help-modal'), { onClose: () => { ui.storyFresh = null; } });
  }

  /* The opening: four pictures with a few lines each. It plays once, before the first descent; Story so far replays it.
     A story scene (BL.STORY.scenes) is shown the same way: `scene` is its id, and its last button says `go`. */
  function showOpening(i, done, replay, scene, go, paging) {
    if (i === 0 && !paging) { // paging: Back to the first picture keeps the scene that is playing
      const all = scene ? BL.STORY.scenes[scene].beats.filter((x) => !x.found || replay || (run && run.found === x.found)) : BL.STORY.opening;
      ui.opening = { done: done || null, replay: !!replay, scene: scene || null, beats: all, go: go || (scene ? 'Go on' : 'Go down') };
      all.forEach((x) => { new Image().src = `img/${x.art}.webp`; });
    }
    const beats = ui.opening.beats, b = beats[i], last = i === beats.length - 1;
    openOverlay(`<div class="opening" role="dialog" aria-modal="true" aria-label="The story, part ${i + 1} of ${beats.length}">
      <div class="op-art" style="background-image:url(img/${b.art}.webp);--pos:${b.pos};--wpos:${b.wide || b.pos};--wz:${b.zoom || 1}"></div>
      ${b.fig ? `<img class="op-fig" src="img/${b.fig}.webp" alt="">` : ''}
      <div class="op-inner"><p class="op-text">${b.text}</p>
        <div class="op-foot"><span class="op-dots" aria-hidden="true">${beats.map((x, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</span>
          ${i > 0 ? `<button class="btn ghost" data-act="opback" data-i="${i}">Back</button>` : ''}
          ${last ? '' : '<button class="btn ghost" data-act="opskip">Skip</button>'}
          <button class="btn primary" data-act="opnext" data-i="${i}" autofocus>${!last ? 'Next' : ui.opening.replay ? 'Back to the story' : ui.opening.go}</button></div>
      </div></div>`, { locked: true });
    if (b.sfx) sfx(b.sfx);
  }
  function endOpening() {
    const o = ui.opening || {};
    ui.opening = null;
    if (!o.scene && !story.opening) { story.opening = true; saveStory(); }
    closeOverlay(true);
    if (o.done) o.done();
    // a scene covered the screen while it drew, so its main button never got the focus: give it now
    if (o.scene && overlayEl.hidden) { const f = document.querySelector('[autofocus]'); if (f) f.focus({ preventScroll: true }); }
  }
  /* Play the story scene for `at` ('pin:0', 'pin:1', 'in:2', 'dress', 'heart', 'quiet', 'fell') if it hasn't played yet, then call `done`. It
     counts as played once it starts. The tutorial and debug-cheated runs play none (they open nothing in the story). */
  function playScene(at, done, go) {
    const id = Object.keys(BL.STORY.scenes).find((k) => BL.STORY.scenes[k].at === at);
    if (!id || !run || run.tutorial || run.cheated || story.scenes.indexOf(id) >= 0 || !overlayEl.hidden) { if (done) done(); return false; }
    story.scenes.push(id);
    saveStory();
    showOpening(0, done, false, id, go);
    return true;
  }

  /* What's new: marked New for a returning player until they open it. A first visit has nothing new to see. */
  function versionIsNew() {
    try {
      const seen = localStorage.getItem(VERSION_KEY);
      if (seen === BL.VERSION) return false;
      if (seen) return true;
      const played = [BEST_KEY, SAVE_KEY, 'brinelight.tutorial.v1', 'brinelight.hints.v1'].some((k) => localStorage.getItem(k) != null);
      if (!played) localStorage.setItem(VERSION_KEY, BL.VERSION);
      return played;
    } catch (e) { return false; }
  }
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtDate = (d) => { const [y, m, day] = d.split('-'); return `${+day} ${MONTHS[+m - 1]} ${y}`; };
  function showChangelog() {
    try { localStorage.setItem(VERSION_KEY, BL.VERSION); } catch (e) { /* ignore */ }
    const pill = $('.title-version .new-pill', screenEl);
    if (pill) pill.remove();
    const body = `<div class="changelog">${BL.CHANGELOG.map((rel) => `<section><h3>v${rel.v} <small>${fmtDate(rel.date)}</small></h3>
      <ul class="help-list">${rel.items.map((it) => `<li>${it}</li>`).join('')}</ul></section>`).join('')}</div>`;
    openOverlay(modal("What's new", body, '<button class="btn primary" data-act="close" autofocus>Close</button>', 'help-modal'));
  }

  /* Credits: BL.CREDITS, with [text](https://...) as a link that opens in a new tab. */
  const creditLinks = (s) => s.replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  function showCredits() {
    const body = `<div class="credits">${BL.CREDITS.map((sec) => `<section><h3>${sec.head}</h3>
      ${sec.lines.map((l) => `<p>${creditLinks(l)}</p>`).join('')}</section>`).join('')}</div>`;
    openOverlay(modal('Credits', body, '<button class="btn primary" data-act="close" autofocus>Close</button>', 'help-modal'));
  }

  /* ----- Jukebox (the title screen, from the start): the music you have heard,
     Gemini's songs and pieces of the score in one list, in the order you meet them. A pick plays until a descent starts: a song that ends goes on to the next one you have
     heard, and a piece of the score loops. The song playing can be moved through. A player at the top (v0.32.0) has
     previous, play or pause, next, shuffle and the music's volume. ----- */
  // Track order and names come from music/jukebox.json, bundled with the score by tools/music.js.
  const JUKE = BL.MUSIC_JUKE.tracks;
  const JUKE_DEPTHS = BL.MUSIC_JUKE.depths;
  const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  /* What you have heard (meta.heard). A debug-cheated run records nothing, as with Story so far. Some tracks open
     sooner (JUKE_EARLY), and High Tide Departure only that way, since it plays nowhere else. A depth of the score
     opens when you have reached it, or with 'depth:<n>' in meta.heard (the debug panel's "Hear all music"). */
  Sound.juke.onHeard((k) => {
    if ((run && run.cheated) || meta.heard.indexOf(k) >= 0) return;
    meta.heard.push(k);
    saveMeta();
  });
  /* What plays now, named outside the Jukebox: on the title screen a chip at the top left, which opens the Jukebox,
     and in a descent a short note when a song starts. The score's pieces change with every screen there, so only the
     title screen names them (when the Jukebox plays one). */
  const nowName = (np) => {
    const [kind, key] = (np || '').split(':');
    if (kind === 'song') return Sound.juke.SONGS[key] ? Sound.juke.SONGS[key].name : null;
    const c = JUKE.find(([k, ck]) => k === 'cue' && ck === key);
    return c ? c[2] : null;
  };
  function drawNow() {
    const el = $('.title-now', screenEl);
    if (!el) return;
    const name = nowName(ui.np);
    el.innerHTML = name ? `<button class="title-version now-btn" data-act="jukebox" aria-label="Now playing: ${name}. Open the Jukebox">${ICON.note}<span>${name}</span></button>` : '';
  }
  Sound.juke.onNow((np) => {
    ui.np = np;
    drawNow();
    if (run && np && np.indexOf('song:') === 0) toast('\u266A ' + nowName(np), 3500);
  });
  const JUKE_EARLY = { // open: when it opens without being heard; locked tracks are absent from the Jukebox
    'song:title': { open: () => true },
    // the dawn song: it plays when the Heart first comes home, and only then opens (v0.40.0, the user's call; open from
    // the start before). `gate`: having heard it is not enough, so a player who heard it on the title keeps it locked too
    'song:bells': { open: () => E.heartIsHome(meta), gate: true },
    'cue:title': { open: () => true }, // the title screen plays its songs instead now, so it is heard only here
    'song:hermit': { open: () => true }, // the pins' songs foreshadow them (the user's call)
    'song:buoy': { open: () => true },
    'song:departure': { open: () => true },
    'song:shop': { open: () => true },
    'song:shell': { open: () => true },
    'song:watch': { open: () => true }, // it tells of a fall; open from the start since v0.36.0 (the user's call), after a finished descent before
    // the Dark Watch's second half played it until Nobody in the Dress took its place (v0.45.0): it opens with that song
    'cue:pin2': { open: () => meta.heard.indexOf('song:nobody') >= 0 },
  };
  const jukeOpen = (kind, key) => {
    const k = kind + ':' + key, early = JUKE_EARLY[k];
    if (early && early.gate) return !!early.open();
    return meta.heard.indexOf(k) >= 0 || !!(early && early.open());
  };
  const jukeDepthOpen = (d) => d <= (meta.reached || 0) || meta.heard.indexOf('depth:' + d) >= 0;
  /* Previous and next go through the open tracks in the list's order, songs and music box pieces alike. A song that
     ends goes on to the next open song, since a music box piece loops and would never hand on. With shuffle on
     (prefs.jukeShuffle, kept), next and a song's end go through the open songs in a shuffled order (ui.jukeOrder), each
     once before any comes round again, and previous goes back along it. Previous more than 3 s into a song starts it
     again, as in other players. */
  const jukeTracks = () => JUKE.filter(([kind, key]) => jukeOpen(kind, key)).map(([kind, key]) => kind + ':' + key);
  const jukeId = (st) => (st.song ? 'song:' + st.song : st.cue ? 'cue:' + st.cue : null);
  function jukeShuffled(first) {
    const ks = jukeTracks().filter((t) => t.indexOf('song:') === 0 && t !== first);
    for (let i = ks.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ks[i], ks[j]] = [ks[j], ks[i]]; }
    return first ? [first].concat(ks) : ks;
  }
  // the track before (dir -1) or after (+1) the one playing; `auto` when a song has ended (songs only)
  function jukeNeighbour(dir, auto) {
    const cur = jukeId(Sound.juke.state());
    if (prefs.jukeShuffle) {
      const songs = jukeTracks().filter((t) => t.indexOf('song:') === 0);
      let o = ui.jukeOrder || [];
      // a new order when this one no longer fits: a song opened since, or a song chosen from the list that isn't in it
      if (o.length !== songs.length || o.some((t) => songs.indexOf(t) < 0) || (cur && cur.indexOf('song:') === 0 && o.indexOf(cur) < 0)) {
        o = ui.jukeOrder = jukeShuffled(cur && cur.indexOf('song:') === 0 ? cur : null);
      }
      const i = o.indexOf(cur);
      if (i < 0) return dir > 0 ? o[0] : o[o.length - 1]; // a music box piece, or nothing: into the order
      if (i + dir < 0) return o[o.length - 1];
      if (i + dir < o.length) return o[i + dir];
      // round again in a fresh order, which doesn't start with the song that just played
      o = ui.jukeOrder = jukeShuffled(null);
      if (o.length > 1 && o[0] === cur) [o[0], o[1]] = [o[1], o[0]];
      return o[0];
    }
    const ts = auto ? jukeTracks().filter((t) => t.indexOf('song:') === 0) : jukeTracks();
    const i = ts.indexOf(cur);
    if (!ts.length) return cur;
    if (i < 0) return dir > 0 ? ts[0] : ts[ts.length - 1];
    return ts[(i + dir + ts.length) % ts.length];
  }
  // play a track from its start (or carry on with it, if it is the one chosen); choosing music means you want to hear it
  function jukeGo(id) {
    if (!id) return;
    const [kind, key] = id.split(':'), off = !prefs.music;
    if (!jukeOpen(kind, key)) return;
    Sound.juke.pick(kind, key, true);
    if (off) { prefs.music = true; savePrefs(); Sound.changed(); toast('Music on'); }
  }
  function jukeStep(dir) {
    const st = Sound.juke.state();
    if (dir < 0 && st.song && st.at > 3) { jukeGo('song:' + st.song); Sound.juke.seek(0); }
    else {
      const id = jukeNeighbour(dir);
      if (id === jukeId(st)) { jukeGo(id); if (st.song) Sound.juke.seek(0); } else jukeGo(id);
    }
    ui.jukeSeekAt = 0;
    drawJuke();
  }
  function jukeDepth(depth) {
    if (!Number.isInteger(depth) || !JUKE_DEPTHS[depth] || !jukeDepthOpen(depth)) return;
    const st = Sound.juke.state(), off = !prefs.music;
    if (st.song || !st.cue) return;
    Sound.juke.depth(depth);
    Sound.juke.pick('cue', st.cue, true);
    if (off) { prefs.music = true; savePrefs(); Sound.changed(); toast('Music on'); }
    drawJuke();
  }
  /* The player: what plays, with previous, play or pause, next and shuffle (redrawn with the list), and the music's
     volume, the menu's Music slider (the same setting; not redrawn, so a drag isn't cut short). */
  function jukePlayer(st) {
    const id = jukeId(st), name = id ? nowName(id) : null, on = !!id && !st.paused;
    const time = st.song ? `${mmss(st.at)} / ${mmss(st.secs)}` : '';
    const state = !id ? 'Nothing chosen' : on ? 'Playing' : 'Paused';
    return `<div class="jp-now"><small>${state}${st.song || st.cue ? ` · <span class="jp-kind">${st.song ? 'Gemini' : 'Music box'}</span>` : ''}</small>
        <b>${name || 'Choose a track'}</b>${time ? `<span class="jp-t">${time}</span>` : ''}</div>
      <div class="jp-ctl">
        <button class="jp-btn" data-act="jukeprev" aria-label="Previous">${ICON.prev}</button>
        <button class="jp-btn jp-main" data-act="jukepp" aria-label="${on ? 'Pause' : 'Play'}">${on ? ICON.pause : ICON.play}</button>
        <button class="jp-btn" data-act="jukenext" aria-label="Next">${ICON.next}</button>
        <button class="jp-btn jp-shuffle" data-act="jukeshuffle" aria-pressed="${!!prefs.jukeShuffle}" aria-label="Shuffle" title="Shuffle: ${prefs.jukeShuffle ? 'on' : 'off'}">${ICON.shuffle}</button>
      </div>${st.song ? `<div class="juke-seek">
        <button class="btn small" data-act="jukeskip" data-by="-10" aria-label="Back 10 seconds">&minus;10 s</button>
        <input type="range" class="juke-pos" min="0" max="${Math.round(st.secs)}" step="1" value="${Math.floor(st.at)}" aria-label="Position in ${name}">
        <button class="btn small" data-act="jukeskip" data-by="10" aria-label="Forward 10 seconds">+10 s</button>
      </div>` : st.cue ? `<label class="juke-depth"><span>As heard in</span><select aria-label="Depth of the music box">${JUKE_DEPTHS.map((d, i) => jukeDepthOpen(i)
        ? `<option value="${i}"${st.depth === i ? ' selected' : ''}>${d}</option>` : '').join('')}</select></label>` : ''}`;
  }
  function jukeLinks(st) {
    if (st.song && BL.LYRICS && BL.LYRICS[st.song]) return `<button class="btn small juke-words" data-act="jukewords" data-key="${st.song}" aria-label="Lyrics of ${nowName('song:' + st.song)}">Lyrics</button>`;
    return jukeScoreLink(st);
  }
  function jukeScoreLink(st) {
    if (st.cue && jukeOpen('cue', st.cue) && jukeDepthOpen(st.depth)) {
      const links = BL.MUSIC_LINKS[st.cue];
      if (links && links[st.depth]) return `<a class="btn small juke-score" href="${links[st.depth]}" target="_blank" rel="noopener noreferrer" title="Open score in Musicbox (new tab)" aria-label="Open ${nowName('cue:' + st.cue)} in Musicbox (new tab)">Open score in Musicbox <span aria-hidden="true">↗</span></a>`;
    }
    return '';
  }
  function jukeVolume() {
    const v = Math.round(prefs.musicVol * 100);
    // not a long bar like a song's position (the user found the two too alike): a short labelled wedge, in teal, on the right
    return `<div class="jp-vol" role="group" aria-label="Music volume"><span class="jp-vol-ic" aria-hidden="true">${ICON.volume}</span><span class="jp-vol-lbl">Volume</span><span class="jp-vol-track" style="--v:${v}%"><input type="range" class="jp-vol-range" min="0" max="100" step="5" value="${v}" data-vol="music" aria-label="Music volume"></span><output>${v}%</output></div>`;
  }
  // what the list shows as playing: it is redrawn when that changes, and the time moves in between
  const jukeSig = (st) => [st.song, st.cue, st.paused, st.depth, ui.jukeFilter || 'all', jukeTracks().join(','), JUKE_DEPTHS.map((_, i) => jukeDepthOpen(i)), !!prefs.jukeShuffle].join('/');
  function jukeFilters() {
    return ['all', 'song', 'cue'].map((kind, i) => `<button class="btn small" data-act="jukefilter" data-filter="${kind}" aria-pressed="${(ui.jukeFilter || 'all') === kind}">${['All', 'Songs', 'Music box'][i]}</button>`).join('');
  }
  function jukeList(st) {
    const S = Sound.juke.SONGS;
    const rows = JUKE.filter(([kind, key]) => jukeOpen(kind, key) && (!ui.jukeFilter || ui.jukeFilter === 'all' || ui.jukeFilter === kind)).map(([kind, key, cueName, cueWhere]) => {
      const song = kind === 'song', name = song ? S[key].name : cueName, where = song ? S[key].where : cueWhere;
      // a song generated with Google Gemini, or a piece the music box plays from the score (not "Recorded": nobody recorded them)
      const tag = song ? '<span class="juke-tag rec">Gemini</span>' : '<span class="juke-tag box">Music box</span>';
      const cur = song ? st.song === key : !st.song && st.cue === key, on = cur && !st.paused;
      const time = song ? mmss(S[key].secs) : '';
      return `<div class="juke-item${cur ? ' cur' : ''}"><button class="juke-row" data-act="jukeplay" data-kind="${kind}" data-key="${key}" aria-pressed="${on}" aria-label="${on ? 'Pause' : 'Play'}: ${name}">
        <span class="juke-ic">${on ? ICON.pause : ICON.play}</span><span class="juke-txt"><b>${name}</b><small>${where}</small></span><span class="juke-time">${tag}${time ? `<span class="juke-t">${time}</span>` : ''}</span></button></div>`;
    }).join('');
    return rows + (JUKE.some(([kind, key]) => !jukeOpen(kind, key)) ? '<p class="juke-more">More music to discover.</p>' : '');
  }
  function drawJuke() {
    const list = $('.juke-list', overlayEl);
    if (!list) { clearInterval(ui.jukeTick); return; }
    const st = Sound.juke.state(), sig = jukeSig(st);
    if (sig === ui.jukeSig) { // only the time moves, and the slider unless it is being dragged
      const r = $('.juke-pos', overlayEl), pt = $('.jp-t', overlayEl);
      if (pt && st.song) pt.textContent = `${mmss(st.at)} / ${mmss(st.secs)}`;
      if (r && Date.now() - (ui.jukeSeekAt || 0) > 700) { r.max = Math.round(st.secs); r.value = Math.floor(st.at); }
      return;
    }
    const f = document.activeElement, top = $('.jp-top', overlayEl), links = $('.jp-links', overlayEl), filters = $('.juke-filters', overlayEl);
    const focus = f && overlayEl.contains(f) ? f.classList.contains('juke-pos') ? '.juke-pos' : f.matches('.juke-depth select') ? '.juke-depth select' : f.classList.contains('juke-score') ? '.juke-score'
      : f.dataset.act ? `[data-act="${f.dataset.act}"]${['key', 'kind', 'by', 'depth', 'filter'].filter((k) => f.dataset[k] != null).map((k) => `[data-${k}="${f.dataset[k]}"]`).join('')}` : null : null;
    list.innerHTML = jukeList(st);
    if (top) top.innerHTML = jukePlayer(st);
    if (links) links.innerHTML = jukeLinks(st);
    if (filters) filters.innerHTML = jukeFilters();
    ui.jukeSig = sig;
    if (focus) { const g = $(focus, overlayEl); if (g) g.focus({ preventScroll: true }); }
  }
  // Back from lyrics keeps the browsing filter and returns focus to Lyrics in the player.
  function showJukebox(fromWords) {
    const st = Sound.juke.state();
    const body = `<div class="juke-player" role="group" aria-label="Player"><div class="jp-top">${jukePlayer(st)}</div><div class="jp-bottom"><div class="jp-links">${jukeLinks(st)}</div>${jukeVolume()}</div></div><div class="juke-filters" role="group" aria-label="Filter tracks">${jukeFilters()}</div><div class="juke-list">${jukeList(st)}</div>`;
    ui.jukeSig = jukeSig(st);
    clearInterval(ui.jukeTick);
    openOverlay(modal('Jukebox', body, '<button class="btn primary" data-act="close" autofocus>Done</button>', 'jukebox-modal'),
      { onClose: () => clearInterval(ui.jukeTick), focus: fromWords ? '.jp-links [data-act="jukewords"]' : null });
    ui.jukeTick = setInterval(drawJuke, 500);
  }
  /* The words of a song (js/lyrics.js), one page a song, opened from the song playing in the Jukebox. The song plays on;
     Back returns to the Jukebox. A line in [brackets] heads a part of the song. */
  function showWords(key) {
    const text = BL.LYRICS && BL.LYRICS[key], S = Sound.juke.SONGS[key];
    if (!text || !S || !jukeOpen('song', key)) return;
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const parts = text.trim().split(/\n\s*\n/).map((p) => {
      const lines = p.split('\n'), head = /^\[(.+)\]$/.exec(lines[0].trim());
      const body = (head ? lines.slice(1) : lines).map((l) => `<span>${esc(l)}</span>`).join('');
      return `<section>${head ? `<h3>${esc(head[1])}</h3>` : ''}<p>${body}</p></section>`;
    }).join('');
    openOverlay(modal(S.name, `<div class="lyrics">${parts}</div>`, '<button class="btn primary" data-act="jukeback" autofocus>Back</button>', 'lyrics-modal'));
  }
  // a song that ends in the Jukebox goes on to the next one you have heard, or the next in the shuffled order (or
  // starts again, if it is the only one)
  Sound.juke.onEnd((key) => {
    const id = jukeNeighbour(1, true) || 'song:' + key;
    Sound.juke.pick('song', id.split(':')[1], true);
    drawJuke();
  });

  /* ----- Workshop: kit bought with Salvage, chosen before a descent ----- */
  const levelName = (lv) => E.levelName(lv);
  const LevelName = (lv) => E.LEVELS[lv || 0].name;
  const gearArt = (g) => `<span class="medal gear"><img src="img/icons/${g.art}.webp" alt=""></span>`;
  const workshopOpen = () => meta.earned > 0 || meta.owned.length > 0;
  const kitIn = (place) => Object.keys(BL.KIT).filter((id) => BL.KIT[id].place === place);

  /* The Workshop and Pack for the expedition share one view of the kit: Wren in the middle with a slot for each
     place around her (BL.KIT_PLACES), a line from each slot to where the piece sits on her, and under her a tray
     with every piece of kit for the chosen slot: what she owns (tap to wear or take off), what is for sale, and
     what is still locked. Her picture follows her rig, the same one she has in a fight (E.keeperArt). */
  const kitForSale = (id) => { const g = BL.KIT[id]; return !g.starter && !g.found && !E.ownsKit(meta, id) && E.kitUnlocked(meta, id); };
  const canBuyNow = (id) => kitForSale(id) && meta.salvage >= BL.KIT[id].price;
  const placeOf = (id) => BL.KIT_PLACES.find((pl) => pl.id === id);
  function kitWrenAlt(kit) {
    const g = kit.coat ? BL.KIT[kit.coat] : null;
    return !g ? 'Wren, the Keeper, in her oilskin' : `Wren, the Keeper, wearing the ${g.name}`;
  }
  /* The chosen slot: the last one chosen, else the first with something to wear (packing) or to buy (the Workshop). */
  function kitSlotFor(where) {
    if (ui.kitSlot && placeOf(ui.kitSlot)) return ui.kitSlot;
    const first = BL.KIT_PLACES.find((pl) => kitIn(pl.id).some((id) => (where === 'pack' ? E.ownsKit(meta, id) && !BL.KIT[id].starter : canBuyNow(id))));
    return (first || BL.KIT_PLACES[0]).id;
  }
  function kitSlot(pl, where, sel, i) {
    const id = meta.kit[pl.id], g = id ? BL.KIT[id] : null;
    const name = g ? g.name : pl.none || 'Empty';
    const buy = where === 'workshop' && kitIn(pl.id).some(canBuyNow);
    return `<button class="kit-slot${g ? '' : ' empty'}" style="--o:${i}" data-act="kitslot" data-place="${pl.id}" aria-pressed="${sel}" aria-label="${pl.name}: ${name}${buy ? `. You can buy ${MT.item.toLowerCase()} for it` : ''}">` +
      `<span class="medal gear${g ? '' : ' empty'}">${g ? `<img src="img/icons/${g.art}.webp" alt="">` : ICON['slot_' + pl.id] || ICON.pack}</span>` +
      `<span class="ks-txt"><small>${pl.name}</small><b>${name}</b></span>${buy ? `<span class="ks-new" title="For sale">${ICON.salvage}</span>` : ''}</button>`;
  }
  function kitOpt(id) {
    const g = BL.KIT[id];
    if (E.ownsKit(meta, id)) {
      const on = meta.kit[g.place] === id;
      return `<button class="kit-opt${on ? ' worn' : ''}" data-act="kitwear" data-g="${id}" aria-pressed="${on}">${gearArt(g)}<b>${g.name}</b><span class="opt-state">${on ? 'Worn' : 'Wear'}</span><small>${g.desc}</small></button>`;
    }
    if (kitForSale(id)) {
      return `<button class="kit-opt buy" data-act="kitbuy" data-g="${id}" aria-label="Buy ${g.name} for ${g.price} ${MT.currency}">${gearArt(g)}<b>${g.name}</b><span class="price${meta.salvage < g.price ? ' cant' : ''}">${ICON.salvage}${g.price}</span><small>${g.desc}</small></button>`;
    }
    const a = g.unlock ? BL.ACHIEVEMENTS[g.unlock] : null;
    const why = g.found ? '<b>Not for sale:</b> found in Dark Water. Break its pin and carry it home.' : `<b>${a.name}:</b> ${a.desc}`;
    return `<div class="kit-opt locked">${gearArt(g)}<b>${g.name}</b><small>${g.desc}</small><span class="g-lock">${ICON.lock}<span>${why}</span></span></div>`;
  }
  function kitTray(place, where) {
    const pl = placeOf(place);
    // what she owns first, then what is for sale, then what is locked (each in BL.KIT's order)
    const rank = (id) => (E.ownsKit(meta, id) ? 0 : kitForSale(id) ? 1 : 2);
    // the dresses are for the Belfry: until it is found they stay out of the tray (a dress you own always shows)
    const ids = kitIn(place).filter((id) => E.ownsKit(meta, id) || levelKnown(2) || !(id === 'suit' || BL.KIT[id].as === 'suit')).sort((x, y) => rank(x) - rank(y));
    const bal = where !== 'workshop' && ids.some(kitForSale) ? `<span class="chip">${ICON.salvage}<b>${meta.salvage}</b> ${MT.currency}</span>` : '';
    return `<section class="kit-tray" aria-label="${pl.name}"><h3 class="ws-place"><span>${pl.name} <small>${pl.desc}</small></span>${bal}</h3>
      <div class="kit-list">${ids.map(kitOpt).join('')}</div></section>`;
  }
  function kitDoll(where) {
    const sel = kitSlotFor(where), look = E.keeperArt(meta.kit);
    // each side lists its slots top to bottom by where they point, so the lines don't cross
    const side = (s) => BL.KIT_PLACES.map((pl, i) => [pl, i]).filter(([pl]) => (pl.side || 'right') === s)
      .sort((x, y) => (x[0].at || [0, 0])[1] - (y[0].at || [0, 0])[1]).map(([pl, i]) => kitSlot(pl, where, pl.id === sel, i)).join('');
    return `<div class="doll" data-look="${look}"><svg class="doll-lines" aria-hidden="true"></svg>
      <div class="doll-side left">${side('left')}</div>
      <div class="doll-wren"><img src="img/units/${look}.webp" alt="${kitWrenAlt(meta.kit)}"></div>
      <div class="doll-side right">${side('right')}</div></div>${kitTray(sel, where)}`;
  }
  /* Lines from the slots to Wren (wide screens only; on a phone the slots stand in a column beside her). */
  function drawDollLines() {
    const doll = $('.doll', overlayEl);
    if (!doll) return;
    const lines = $('.doll-lines', doll), img = $('.doll-wren img', doll);
    lines.innerHTML = '';
    if (!img.naturalWidth) { img.addEventListener('load', drawDollLines, { once: true }); return; }
    if (getComputedStyle(lines).display === 'none') return;
    const box = doll.getBoundingClientRect(), ir = img.getBoundingClientRect();
    // the picture is drawn bottom-centred inside the img box (object-fit: contain)
    const k = Math.min(ir.width / img.naturalWidth, ir.height / img.naturalHeight), w = img.naturalWidth * k, h = img.naturalHeight * k;
    const x0 = ir.left - box.left + (ir.width - w) / 2, y0 = ir.top - box.top + ir.height - h;
    const fix = BL.WREN_POINTS[doll.dataset.look] || {}, n = (v) => v.toFixed(1);
    lines.setAttribute('viewBox', `0 0 ${n(box.width)} ${n(box.height)}`);
    lines.innerHTML = BL.KIT_PLACES.map((pl) => {
      const el = $(`.kit-slot[data-place="${pl.id}"]`, doll), at = fix[pl.id] || pl.at;
      if (!el || !at) return '';
      const r = el.getBoundingClientRect(), left = r.left + r.width / 2 < ir.left + ir.width / 2;
      const sx = (left ? r.right : r.left) - box.left, sy = r.top + r.height / 2 - box.top, ex = x0 + at[0] * w, ey = y0 + at[1] * h;
      const on = el.getAttribute('aria-pressed') === 'true';
      return `<g${on ? ' class="on"' : ''}><path d="M${n(sx)} ${n(sy)}H${n(sx + (left ? 12 : -12))}L${n(ex)} ${n(ey)}"/><circle cx="${n(ex)}" cy="${n(ey)}" r="${on ? 4.5 : 3}"/></g>`;
    }).join('');
  }
  /* Redraw whichever kit screen is open, keeping its scroll, with the focus on `focus` (a selector). */
  function redrawKit(focus) {
    const sc = $('.modal-body', overlayEl), top = sc ? sc.scrollTop : 0;
    if (ui.kitFrom === 'pack') showKit(focus); else showWorkshop(focus);
    const sc2 = $('.modal-body', overlayEl);
    if (sc2) { sc2.scrollTop = top; updateScrollCue(sc2); }
  }

  function showWorkshop(focus) {
    ui.kitFrom = 'workshop';
    meta.kit = E.fitKit(meta.kit, meta.owned);
    const body = `<div class="ws-art" style="background-image:url(img/scenes/workshop.webp)" role="img" aria-label="The keepers' workshop on the shore"></div><p class="ws-lead">Every finished run turns its score into ${MT.currency}: 1 for every ${E.SALVAGE_PER_SCORE} points. ${MT.item} you buy is yours for good. Wren wears one piece in each place: choose a place to see what fits there.</p>
      <div class="ws-bal"><span class="chip">${ICON.salvage}<b>${meta.salvage}</b> ${MT.currency}</span></div>${kitDoll('workshop')}${lanternPanel()}`;
    openOverlay(modal(`The ${MT.shop}`, body, '<button class="btn primary" data-act="close" autofocus>Done</button>', 'workshop-modal'), { focus });
    requestAnimationFrame(drawDollLines);
  }

  /* A steadier lantern (v0.36.0): the Hold, bought in steps with Salvage (E.HOLD_UP). It sits under the kit, since it is
     not worn: it is the lantern itself. */
  function lanternPanel() {
    const n = meta.holdUp || 0, max = E.HOLD_UP.prices.length, price = E.holdUpPrice(meta);
    const pips = E.HOLD_UP.prices.map((p, i) => `<i class="${i < n ? 'on' : ''}" title="${E.HOLD_UP_NAMES[i]}"></i>`).join('');
    const next = price == null
      ? '<p class="lt-done">Your lantern burns as steady as it can.</p>'
      : `<button class="btn${meta.salvage >= price ? ' primary' : ''} lt-buy" data-act="holdup"${meta.salvage >= price ? '' : ` aria-disabled="true"`}>${E.HOLD_UP_NAMES[n]}: +${E.HOLD_UP.step} Hold for ${price} ${MT.currency}</button>`;
    return `<section class="lantern-panel" aria-label="The lantern"><h3 class="ws-place">The lantern <small>Your Hold: <b>${E.metaHold(meta)} Roil</b></small></h3>
      <p class="lt-lead">The aether around a brighter lantern stays Calm with more Roil in it. Each step raises your Hold by ${E.HOLD_UP.step} on every expedition, for good.</p>
      <div class="lt-row"><span class="lt-pips" role="img" aria-label="${n} of ${max} steps">${pips}</span>${next}</div></section>`;
  }

  /* ----- The logbook: a short record of how far the player has come ----- */
  const logbookOpen = () => meta.record.runs > 0 || getNum(BEST_KEY) > 0 || meta.earned > 0;
  // the Jukebox opens once the Shallows are done: the Harbour Hermit's bell broken (Out of Its Bell)
  function showLogbook() {
    const r = meta.record, marks = storyMarks();
    const cleared = E.LEVELS.filter((L, i) => marks.indexOf('won:' + i) >= 0).map((L) => L.name);
    const entries = E.storyEntries();
    const open = entries.filter((en) => E.storyOpen(en, marks)).length;
    const kitTotal = Object.keys(BL.KIT).filter((id) => !BL.KIT[id].starter).length;
    const rows = [
      ['Expeditions finished', r.runs ? `${r.runs} <small>${r.wins} came home, ${r.runs - r.wins} fell</small>` : '0'],
      ['The Lantern Heart', r.hearts ? 'Brought home' : levelKnown(2) ? 'Still in the Belfry' : 'Still somewhere below'],
    ].concat(levelKnown(2) ? [['Belfry quieted', r.hearts ? `${r.quiets || 0} time${r.quiets === 1 ? '' : 's'}` : 'Bring the Heart home first']] : [], [
      ['Deepest landing reached', r.deep ? `${LevelName(r.deep.level)}, landing ${r.deep.floor} of ${E.landingsOf(r.deep.level)}` : 'Not recorded yet'],
      ['Your Hold', `${E.metaHold(meta)} Roil${meta.holdUp ? ` <small>${E.holdUpOf(meta)} of it from the lantern</small>` : ''}${E.HOLD_STEP ? ` <small>${(meta.reached || 0) < E.LEVELS.length - 1 ? `${E.holdAt((meta.reached || 0) + 1)} once you reach ${levelName((meta.reached || 0) + 1)}` : 'as deep as it grows'}</small>` : ''}`],
      ['Pins broken', `${cleared.length}${allLevelsKnown() ? ` of ${E.LEVELS.length}` : ''}${cleared.length ? ` <small>${cleared.join(', ')}</small>` : ''}`],
      ['Best score', getNum(BEST_KEY) || 0],
      [MT.currency, `${meta.salvage} <small>${meta.earned} earned in all</small>`],
      [`${MT.item} owned`, `${meta.owned.length} of ${kitTotal}`],
      ['Keepsakes in the Lazaret', lazaretOpen() ? `${E.lazKinds(meta).length} of ${KS_TOTAL} kinds, ${meta.lazaret.length} in all` : 'Opens when you first come home'],
      ['Achievements', `${meta.ach.length} of ${Object.keys(BL.ACHIEVEMENTS).length}`],
      ['Story so far', `${open} of ${entries.length} entries open`],
    ]);
    const body = `<dl class="logbook">${rows.map((x) => `<div><dt>${x[0]}</dt><dd>${x[1]}</dd></div>`).join('')}</dl>
      <p class="log-note">Expeditions and the deepest landing are counted from version 0.13.0. Abandoned expeditions and the tutorial are not counted.</p>`;
    openOverlay(modal("Keeper's logbook", body, '<button class="btn primary" data-act="close" autofocus>Close</button>', 'narrow'));
  }

  /* ----- The Lazaret: keepsakes kept between runs, chosen before a descent ----- */
  const KS_TOTAL = Object.keys(BL.KEEPSAKES).length;
  /* Open after the first expedition that comes home. */
  const lazaretOpen = () => E.lazaretOpen(meta);
  const ksNames = (ids) => ids.map((k) => `<b>${BL.KEEPSAKES[k].name}</b>`).join(', ');
  /* Giving up a descent (Abandon, or New Descent over a saved one) loses the keepsakes brought from the Lazaret, as a fall
     does: their copies left it when she set out (v0.36.0). */
  const broughtLoss = (r) => {
    const ks = r && r.takenOut ? (r.brought || []).filter((k) => (r.keepsakes || []).indexOf(k) >= 0) : [];
    return ks.length ? ` The keepsake${ks.length > 1 ? 's' : ''} you brought from the Lazaret (${ksNames(ks)}) ${ks.length > 1 ? 'are' : 'is'} lost with it.` : '';
  };
  // what is chosen to bring, less any kind with no copy left (one lost, broken down or given away since)
  const bringable = () => (meta.bring = meta.bring.filter((k) => E.inLazaret(meta, k)));
  /* What the chosen keepsakes do to the aether. */
  const roilAt = () => {
    const rf = E.roilFor(E.bringCharge(meta), E.metaHold(meta));
    return rf.steps ? `<b class="roiled">Roiled</b>: ${roilWords(rf)} in every fight, and ${roilPay(rf)} after it` : '<b class="calm">Calm</b>';
  };
  /* A kind kept in the Lazaret: how many copies (since v0.36.0 it keeps many of each), whether one is brought, and in the
     Lazaret itself a button to break down a spare copy for Salvage. */
  function ksTile(k, packing) {
    const K = BL.KEEPSAKES[k];
    const on = meta.bring.indexOf(k) >= 0, n = E.lazCount(meta, k);
    const count = n > 1 ? `<span class="lz-count" aria-label="${n} kept">&times;${n}</span>` : '';
    const tile = `<div class="shop-tile gear-tile kit-tile${on ? ' chosen' : ''}" tabindex="0" role="button" aria-pressed="${on}" aria-label="${K.name}, Roil ${K.charge}, ${n} kept: ${on ? 'bringing one' : 'staying home'}" data-act="ksbring" data-k="${k}"${packing ? ' data-pack="1"' : ''}>${count}<span class="medal"><img src="img/icons/${K.art}.webp" alt=""></span><b>${K.name}</b><span class="k-charge">Roil ${K.charge}</span><small>${K.desc}</small><span class="g-state">${on ? 'Bringing one' : 'Staying home'}</span></div>`;
    if (packing) return tile;
    const spare = n > 1 ? `<button class="btn small lz-break" data-act="ksbreak" data-k="${k}" aria-label="Break down a spare ${K.name} for ${E.duplicateSalvage(k)} ${MT.currency}">Break down a spare: +${E.duplicateSalvage(k)} ${MT.currency}</button>` : '';
    return `<div class="lz-cell">${tile}${spare}</div>`;
  }
  function showLazaret() {
    bringable();
    const kept = E.lazKinds(meta);
    const missing = Object.keys(BL.KEEPSAKES).filter((k) => kept.indexOf(k) < 0);
    const lead = `<div class="ws-art" style="background-image:url(img/scenes/lazaret.webp)" role="img" aria-label="The Lazaret, a locked store room at the foot of the lighthouse"></div><p class="ws-lead">The locked store room at the lighthouse. When you come home, every keepsake you carry is kept here, as many of each as you bring home. Bring one of any kind on an expedition: it counts toward your Hold, and it leaves the Lazaret. If you come home with it, it comes back. If you fall, drop it or give it to the sea, it is gone, but when you fall you may hold on to one of the keepsakes you carried. You have <b>${meta.salvage} ${MT.currency}</b>.</p>`;
    const body = kept.length
      ? `${lead}<div class="lz-roil"><span class="chip">You bring <b>${meta.bring.length}</b> of ${kept.length}: <b>Roil ${E.bringCharge(meta)}</b></span><ul><li>Hold ${E.metaHold(meta)}: ${roilAt()}</li></ul></div>
        <h3 class="ws-place">Kept here <small>${kept.length} of ${KS_TOTAL} kinds, ${meta.lazaret.length} in all. Choose what to bring.</small></h3><div class="shop-row lz-row">${kept.map((k) => ksTile(k)).join('')}</div>`
      : `${lead}<p class="ws-lead lz-empty">It is empty. Come home while you carry a keepsake, and the keepsake is kept here.</p>`;
    const rest = missing.length ? `<h3 class="ws-place">Not brought home yet <small>${missing.length}. Deeper down the keepsakes are stronger.</small></h3><div class="shop-row">${missing.map((k) => `<div class="shop-tile gear-tile locked lz-missing"><span class="medal"><img src="img/icons/${BL.KEEPSAKES[k].art}.webp" alt=""></span><b>${BL.KEEPSAKES[k].name}</b>${E.keepsakeDepth(k) ? `<small>${foundIn(k)}</small>` : ''}</div>`).join('')}</div>` : '';
    openOverlay(modal('The Lazaret', body + rest, '<button class="btn primary" data-act="close" autofocus>Done</button>', 'workshop-modal'));
  }

  /* Before an expedition: choose what to wear, one piece in each place, which keepsakes to bring, and the currents.
     Skipped while there is nothing to choose. */
  function prepareDive() {
    if (!meta.owned.length && !meta.lazaret.length && !E.currentsOpen(meta)) return startNewRun(meta.kit);
    showKit();
  }
  function showKit(focus) {
    ui.kitFrom = 'pack';
    meta.kit = E.fitKit(meta.kit, meta.owned);
    bringable();
    const ch = E.bringCharge(meta);
    const keeps = meta.lazaret.length ? `<h3 class="ws-place ws-head">Keepsakes <small>from the Lazaret. Bring any number, one of each. What you bring leaves the Lazaret, and a fall loses it, but for one you hold on to.</small></h3>
      <p class="lz-line">You bring <b>Roil ${ch}</b>. The aether holds <b>${E.metaHold(meta)}</b>: ${roilAt()}.</p>
      <div class="shop-row">${E.lazKinds(meta).map((k) => ksTile(k, true)).join('')}</div>` : '';
    const curs = E.currentsOpen(meta) ? `<h3 class="ws-place ws-head">Currents <small>Each makes the expedition harder and adds &times;${E.CURRENT_SCORE} to the score. Now: score &times;${E.scoreMult({ currents: meta.currents })}.</small></h3>
      <div class="shop-row">${Object.keys(E.CURRENTS).map((k) => {
        const C = E.CURRENTS[k], on = meta.currents.indexOf(k) >= 0;
        return `<div class="shop-tile gear-tile kit-tile current-tile${on ? ' chosen' : ''}" tabindex="0" role="button" aria-pressed="${on}" data-act="current" data-k="${k}"><span class="medal">${ICON.wave}</span><b>${C.name}</b><small>${C.desc}</small><span class="g-state">${on ? 'On' : 'Off'}</span></div>`;
      }).join('')}</div>` : '';
    const parts = [MT.item.toLowerCase(), keeps ? 'keepsakes' : '', curs ? 'currents' : ''].filter(Boolean);
    const body = `<p class="ws-lead">Choose your ${parts.join(', ').replace(/, ([^,]*)$/, ' and $1')}. You keep this pack for the whole expedition. Your choice is remembered.${keeps ? '' : ` Keepsakes: the aether holds <b>${E.metaHold(meta)} Roil</b>.`}</p>
      <h3 class="ws-place">${MT.item} <small>One piece in each place.</small></h3>${kitDoll('pack')}${keeps}${curs}`;
    openOverlay(modal('Pack for the expedition', body,
      `<button class="btn" data-act="close">Back</button><button class="btn primary" data-act="dive" autofocus>Set out</button>`, 'workshop-modal'), { focus });
    requestAnimationFrame(drawDollLines);
  }

  /* Something new is open at the lighthouse (E.FEATURES): a window that has to be acknowledged, once for each. The end
     screen's boxes say the same, but they were easy to miss (the user's playtest: "e.g. Currents"). It opens over the
     end screen as the expedition ends, or over the title screen if that was missed (a closed tab, the debug panel). */
  const NEWS = {
    workshop: () => [gearArt({ art: 'g_salvage' }), `The ${MT.shop} is open`, `Every finished expedition turns its score into <b>${MT.currency}</b>. Spend it on <b>${MT.item.toLowerCase()}</b>: gear that is yours for good. You wear one piece in each of five places.`, `Title screen &rarr; ${MT.shop}`],
    lazaret: () => ['<span class="medal"><img src="img/icons/k_whaletooth.webp" alt=""></span>', 'The Lazaret is open', 'The locked store room at the lighthouse: Hester has given you its key. Every keepsake you carry home is kept there, as many of each as you bring. Before an expedition you choose which to bring: each one counts toward your Hold, and a fall loses it, but for one you hold on to.', 'Title screen &rarr; Lazaret'],
    suit: () => [gearArt(BL.KIT.suit), `The ${BL.KIT.suit.name} is mended`, `You carried it home and mended it. Wear it in your <b>${placeOf(BL.KIT.suit.place).name}</b> place when you pack, and the stair below Dark Water is open.`, 'New Descent &rarr; Pack for the expedition'],
    currents: () => [`<span class="medal">${ICON.wave}</span>`, 'Currents are open', `The sea is wide awake now, and it has moods. Switch on any <b>currents</b> when you pack: each makes the whole expedition harder and adds &times;${E.CURRENT_SCORE} to your score.`, 'New Descent &rarr; Pack for the expedition'],
  };
  function showNews() {
    if (!overlayEl.hidden || (run && run.tutorial)) return false;
    const ids = E.featureNews(meta);
    if (!ids.length) return false;
    const items = ids.map((id) => { const [art, name, text, where] = NEWS[id](); return `<li class="news-item">${art}<div><b>${name}</b><p>${text}</p><small>${where}</small></div></li>`; }).join('');
    ui.news = ids;
    openOverlay(modal('New at the lighthouse', `<ul class="news-list">${items}</ul>`, '<button class="btn primary" data-act="newsok" autofocus>Got it</button>', 'narrow news-modal').replace(/<button class="icon-btn" data-act="close"[^>]*>.*?<\/button>/, ''), { locked: true });
    sfx('unlock');
    return true;
  }

  /* Achievements reached in this run unlock kit at once, so they're kept even if the run is abandoned. */
  function checkUnlocks(quiet) {
    if (!run || run.tutorial) return;
    const fresh = E.unlockAchievements(meta, run);
    if (!fresh.length) return;
    saveMeta();
    if (quiet) return; // the end screen lists them itself
    fresh.forEach((a) => toast(`\u2605 ${BL.ACHIEVEMENTS[a].name}! ${E.kitFor(a).map((id) => BL.KIT[id].name).join(', ')} can now be bought in the ${MT.shop}.`, 4500));
    sfx('unlock');
  }

  function startNewRun(kit) {
    clearSave();
    const m = /[?&]seed=(\d+)/.exec(location.search);
    run = E.newRun(m ? +m[1] : undefined, 0, kit, lazaretOpen() ? bringable() : [], E.currentsOpen(meta) ? meta.currents : [], E.heartIsHome(meta), meta.reached, E.holdUpOf(meta));
    // the keepsakes she brings leave the Lazaret now (v0.36.0): they come back with her, or not at all
    if (E.takeBrought(meta, run).length) saveMeta();
    save();
    render();
    sfx('bell');
  }

  /* New Descent: the first time, the opening plays, then the guided fight is offered. */
  function beginNewRun() {
    if (!story.opening) return showOpening(0, beginNewRun);
    if (!Teach.status()) {
      openOverlay(modal('First descent?', '<p class="lead-sm">A short guided fight teaches the basics: health, Ward, Light, and the Swell. About 2 minutes.</p>',
        '<button class="btn" data-act="tutorialskip">Skip, start the run</button><button class="btn primary" data-act="tutorial" autofocus>Play the tutorial</button>', 'narrow'));
      return;
    }
    prepareDive();
  }

  /* ----- Map ----- */
  function renderMap() {
    const m = run.map;
    // the descent runs downward: the first stops are at the top and the boss is at the bottom
    const rowH = innerWidth < 600 ? 74 : 84;
    const pad = 10;
    const bossY = pad + m.rows * rowH + 76;
    const H = bossY + 140; // the boss's name under it, then room above the legend
    const yOf = (n) => (n.type === 'boss' ? bossY : pad + n.row * rowH + rowH / 2 + n.jy * rowH * 0.4);
    const avail = E.availableNodes(run);
    const availKey = new Set(avail.map((n) => n.row + ',' + n.col));
    const visited = new Set(run.visited || []);
    const cur = run.pos ? run.pos.row + ',' + run.pos.col : null;
    let lines = '';
    let nodes = '';
    const all = [];
    m.grid.forEach((row) => row.forEach((n) => n && all.push(n)));
    all.forEach((n) => {
      const kids = n.row === m.rows - 1 ? [m.boss] : n.next.map((c) => m.grid[n.row + 1][c]);
      kids.forEach((k) => {
        const walked = visited.has(n.row + ',' + n.col) && (visited.has(k.row + ',' + k.col) || (k.type === 'boss' && run.pos && run.pos.row >= m.rows));
        const open = cur === n.row + ',' + n.col && availKey.has(k.row + ',' + k.col);
        lines += `<path class="${walked ? 'walked' : ''}${open ? ' open' : ''}" d="M${n.x * 100} ${yOf(n)} L${k.x * 100} ${yOf(k)}"/>`;
      });
    });
    const nodeHTML = (n) => {
      const key = n.row + ',' + n.col;
      const isAvail = availKey.has(key);
      const edge = n.x < 0.16 ? ' lbl-l' : n.x > 0.84 ? ' lbl-r' : '';
      const cls = `node t-${n.type}${visited.has(key) ? ' visited' : ''}${key === cur ? ' current' : ''}${isAvail ? ' avail' + edge : ''}`;
      const style = `left:${n.x * 100}%;top:${yOf(n)}px`;
      const label = n.type === 'boss' ? bossName() : NODE_NAME[n.type];
      if (isAvail) {
        const idx = avail.findIndex((a) => a.row === n.row && a.col === n.col);
        // the boss already has its name under it, so it gets no second label
        const lbl = n.type === 'boss' ? '' : `<span class="node-label">${SHORT_NAME[n.type]}</span>`;
        return `<button class="${cls}" style="${style}" data-act="node" data-row="${n.row}" data-col="${n.col}" data-idx="${idx}" data-tip="node:${n.type}" aria-label="Go to ${label}">${NODE_ICON[n.type]}${lbl}</button>`;
      }
      return `<div class="${cls}" style="${style}" data-tip="node:${n.type}" aria-hidden="true">${NODE_ICON[n.type]}</div>`;
    };
    all.forEach((n) => { nodes += nodeHTML(n); });
    nodes += nodeHTML(m.boss);
    nodes += `<div class="map-boss-label${availKey.has(m.boss.row + ',' + m.boss.col) ? ' avail' : ''}" style="left:50%;top:${bossY + 50}px">${bossName()}</div>`;
    const legend = (m.dive ? ['elite', 'pocket'] : ['fight', 'elite', 'event', 'rest', 'shop', 'treasure', 'toll']).map((t) => `<span>${NODE_ICON[t]}${NODE_NAME[t].replace(/ \(.*\)/, '')}</span>`).join('');
    // each level's own picture behind the map, dimmed (v0.40.0, the user: "cool background art? If it does not become too
    // busy"). The line under the level's name is gone too (the user: "not needed"; it explained the Belfry's dive)
    const mapBg = E.band(run).mapBg;
    screenEl.innerHTML = `<div class="run-screen map-screen">${hudHTML()}<div class="run-body">
      ${mapBg ? `<div class="map-bg" style="background-image:url(img/bg/${mapBg}.webp)" aria-hidden="true"></div>` : ''}
      <div class="map-scroll" id="mapscroll"><div class="map-header"><h2>${LevelName(run.level)}</h2></div>
      <div class="map" style="height:${H}px"><svg class="lines" viewBox="0 0 100 ${H}" preserveAspectRatio="none">${lines}</svg>${nodes}</div></div>
      <div class="map-legend">${legend}</div></div></div>`;
    ui.mapFocus = Math.min(ui.mapFocus, Math.max(0, avail.length - 1));
    if (!run.pos) playScene('in:' + run.level); // the first time down into the Belfry, its story scene (v0.40.0)
    const sc = $('#mapscroll');
    const focusRow = avail.length ? avail[0] : run.pos ? E.nodeAt(run, run.pos) : null;
    if (sc && focusRow) {
      sc.style.scrollBehavior = 'auto';
      // the route ahead is below, so keep the stops to choose near the top, with the row just left in view above them
      sc.scrollTop = Math.max(0, yOf(focusRow) - Math.min(rowH * 1.5, sc.clientHeight * 0.35));
      sc.style.scrollBehavior = '';
    }
    const first = $('.node.avail', screenEl);
    if (first && ui.lastPointer !== 'touch') first.focus({ preventScroll: true });
  }

  function chooseNode(row, col) {
    const avail = E.availableNodes(run);
    const node = avail.find((n) => n.row === row && n.col === col);
    if (!node) return;
    sfx('step');
    E.enterNode(run, node);
    fightSong();
    if (run.screen === 'shop') setTimeout(() => sfx('shopbell'), 280); // the bell over Barnaby's door
    ui.mapFocus = 0;
    save();
    render();
  }

  /* ----- Combat ----- */
  function renderCombat() {
    const c = run.combat;
    screenEl.innerHTML = `<div class="run-screen combat-screen">${hudHTML()}<div class="run-body">
      <div class="field band-${E.bandId(run)}${c.kind === 'boss' ? ' boss' : ''}${c.phase2 ? ' phase2' : ''}" id="field" data-act="field">
        <div class="sea"></div>
        <div class="bubbles" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => `<span style="left:${(i * 37) % 100}%;--s:${6 + (i * 7) % 12}px;animation-duration:${7 + (i * 5) % 9}s;animation-delay:-${(i * 1.7) % 9}s"></span>`).join('')}</div>
        <div class="vignette" aria-hidden="true"></div>
        <div class="units"><div class="player-zone" id="pz"></div><div class="enemy-zone" id="ez"></div></div>
      </div>
      <div class="tidebar" id="tidebar"></div>
      <div class="dock" id="dock" data-act="dock">
        <div class="dock-left"><div class="light-orb" id="orb" data-tip="light"></div>
          <button class="pile" id="pile-draw" data-act="pile" data-pile="draw" data-tip="pile:draw"></button></div>
        <div class="hand" id="hand" role="list" aria-label="Your hand"></div>
        <div class="dock-right"><button class="btn end-turn" id="btn-end" data-act="endturn">End Turn</button>
          <button class="pile" id="pile-discard" data-act="pile" data-pile="discard" data-tip="pile:discard"></button></div>
      </div></div></div>`;
    ui.combatRef = c;
    ui.sel = null; ui.target = null; ui.hover = null; ui.tonicSel = null;
    $('#pz').innerHTML = `<div class="unit player" data-uid="p" data-tip="unit:p">
        <div class="sprite"><img src="img/units/${E.keeperArt(run.tutorial ? null : run.kit, E.LEVELS[run.level || 0].needs === 'suit' && !run.tutorial)}.webp" alt="Wren, the Keeper"></div>
        <div class="info"><div class="incoming" data-tip="incoming"></div><div class="uname">Wren, the Keeper</div><div class="hpbar"></div><div class="statuses"></div></div></div>`;
    bindHand();
    updateCombat(true);
    const names = c.turn === 1 ? (c.kind === 'boss' ? bossName() : c.kind === 'elite' ? 'Dread: ' + c.enemies[0].name : null) : null;
    if (c.turn === 1 && c.followers) {
      // creatures from a Fog event (the Glimmer Garden's leech, the Bell-Rope's minnows) follow her into this fight
      const by = {};
      c.enemies.filter((e) => e.follower).forEach((e) => { by[e.id] = (by[e.id] || 0) + 1; });
      const who = Object.keys(by).map((id) => (by[id] > 1 ? `${by[id]} ${E.plural(id)}` : `A ${BL.ENEMIES[id].name}`)).join(' and ');
      if (who) setTimeout(() => toast(`${who} followed your light into this fight`), names ? 1400 : 300);
    }
    if (names) {
      c.fx.length = 0;
      // (v0.36.0) the last landing's pin opens with its name card and the great toll, once (the screen is drawn again after the menu)
      const boss = c.kind === 'boss' && finalFight() && c.enemies.find((e) => BL.ENEMIES[e.id].boss);
      const card = boss && FINAL_CARD[boss.id];
      const first = ui.entered !== c;
      ui.entered = c;
      if (card && first) { bossCard(card[0], card[1], 'The last landing'); anim($('#field'), 'toll-in', 1400); } else if (!card) banner(names, 'enemy');
      if (c.seep || c.thrash || c.roilMinnows) roilToast({ seep: c.seep, thrash: c.thrash, minnows: c.roilMinnows });
      if (c.kind === 'boss' && first) sfx(card ? 'toll' : 'bell');
    } else processFx();
  }

  function hpBarHTML(hp, max, ward) {
    const pct = Math.max(0, Math.min(100, (hp / max) * 100));
    return `${ward > 0 ? `<div class="ward-badge" data-tip="ward">${ward}</div>` : ''}<div class="ghost" style="width:${pct}%"></div><div class="fill" style="width:${pct}%"></div><div class="txt">${hp}/${max}</div>`;
  }
  const NO_COUNT = ['submerged', 'shell', 'belled', 'echo', 'fullbelly']; // statuses that are on or off, with no number
  /* What was taken from Wren at the start of this turn: [status, amount] for Doused (Light) and Breathless (cards). */
  // (Doused lasts until a Crest or Strand since v0.41.0: while it lasts its own chip shows, so this one only stays for a
  // turn whose Light it took before a Crest or Strand rekindled the lantern)
  const spentNow = (c) => [['doused', c.dousedTurn === c.turn && !c.player.st.doused ? c.dousedN || 0 : -1], ['breathless', c.breathlessTurn === c.turn ? c.breathlessN || 0 : -1]].filter((x) => x[1] >= 0);
  const spentTip = (k, n) => (k === 'doused'
    ? `<b>Doused</b><br>Something drank from your lantern: you started this turn with ${n ? `<b>${n}</b> ` : ''}less Light. Your Crest or Strand has rekindled it.`
    : `<b>Breathless</b><br>Something squeezed the air out of your diving dress: you drew ${n ? `<b>${n}</b> ` : ''}fewer card${n === 1 ? '' : 's'} this turn. It is over when the turn ends. An enemy's intent warns you a turn before.`);
  function statusesHTML(o, who) {
    const c = run.combat;
    const echo = who === 'p' && c && c.echo > 0 ? `<span class="st buff echo-chip" data-tip="echo">${ICON.echo}${c.echo > 1 ? c.echo : ''}</span>` : '';
    const thrash = who === 'p' && c && c.thrash ? `<span class="st debuff thrash-chip" data-tip="kw:Thrash" aria-label="Thrash ${c.thrash}">${ICON.vortex}${c.thrash}</span>` : '';
    // Doused and Breathless are used up as the turn starts: a chip stays on Wren for that turn, so what took the Light
    // or the cards can still be read after the float and the first-time hint are gone (the user's playtest, v0.33.0)
    const spent = who === 'p' && c ? spentNow(c).map(([k, n]) => `<span class="st debuff spent" data-tip="spent:${k}" aria-label="${BL.STATUSES[k].name}, this turn">${ICON[BL.STATUSES[k].icon] || ''}${n || ''}</span>`).join('') : '';
    return echo + thrash + spent + Object.keys(o.st).filter((k) => o.st[k] && BL.STATUSES[k]).map((k) => {
      const s = BL.STATUSES[k];
      const n = (s.kind === 'rite' && o.st[k] === 1 && k !== 'r_beam') || NO_COUNT.indexOf(k) >= 0 ? '' : o.st[k];
      return `<span class="st ${s.kind}" data-tip="st:${who}:${k}">${ICON[s.icon] || ''}${n}</span>`;
    }).join('');
  }
  function intentHTML(e) {
    const info = E.intentInfo(run, e);
    if (!info) return '';
    const k = info.kinds;
    const main = k.indexOf('attack') >= 0 ? 'attack' : k[0] || 'buff';
    // each part with a number shows it next to its icon: attack 3, Ward 4
    let parts = '';
    // an attack that follows the Swell (the Tolling Buoy's) shows a bell in place of the blade, with a wave beside its number
    // one that grows with each card played (the Listener's) shows what a card adds after its number
    if (k.indexOf('attack') >= 0) parts += `${info.swell ? ICON.slot_bell : ICON.attack}<span>${info.dmg}${info.hits > 1 ? '&times;' + info.hits : ''}</span>${info.swell ? `<i class="i-swell">${ICON.wave}</i>` : ''}${info.heard ? `<i class="i-heard" aria-label="${info.heard} more for each card you play">+${info.heard}${ICON.deck || ''}</i>` : ''}`;
    if (k.indexOf('defend') >= 0) parts += `<i class="i-ward">${ICON.defend}${info.ward ? `<span>${info.ward}</span>` : ''}</i>`;
    if (k.indexOf('buff') >= 0) parts += ICON.buff;
    if (k.indexOf('debuff') >= 0) parts += ICON.debuff;
    if (k.indexOf('summon') >= 0) parts += ICON.summon;
    return `<div class="intent ${main}${info.swell ? ' swell' : ''}${info.heard ? ' heard' : ''}" data-tip="intent:${e.uid}">${parts}</div>`;
  }

  function updateUnitInfo(el, hp, max, ward, o, who) {
    const bar = $('.hpbar', el);
    const prevPct = bar.dataset.pct;
    const pct = Math.max(0, Math.min(100, (hp / max) * 100));
    if (prevPct == null) {
      bar.innerHTML = hpBarHTML(hp, max, ward);
    } else {
      // keep the elements so widths animate
      const fill = $('.fill', bar), ghost = $('.ghost', bar), txt = $('.txt', bar);
      fill.style.width = pct + '%';
      ghost.style.width = pct + '%';
      txt.textContent = `${hp}/${max}`;
      let wb = $('.ward-badge', bar);
      if (ward > 0) {
        if (!wb) { bar.insertAdjacentHTML('afterbegin', `<div class="ward-badge" data-tip="ward">${ward}</div>`); }
        else wb.textContent = ward;
      } else if (wb) wb.remove();
    }
    bar.dataset.pct = pct;
    bar.classList.toggle('warded', ward > 0);
    $('.statuses', el).innerHTML = statusesHTML(o, who);
  }

  function updateCombat(initial) {
    const c = run.combat;
    if (!c || ui.combatRef !== c) return;
    // player
    const pel = $('.unit.player', screenEl);
    updateUnitInfo(pel, run.hp, run.maxHp, c.player.ward, c.player, 'p');
    // enemies
    const ez = $('#ez');
    c.enemies.forEach((e, i) => {
      let el = $(`.unit[data-uid="${e.uid}"]`, ez);
      if (!el) {
        const d = BL.ENEMIES[e.id];
        el = document.createElement('div');
        el.className = `unit enemy${d.flying ? ' flying' : ''}${initial ? '' : ' summoned'}`;
        el.dataset.uid = e.uid;
        el.dataset.act = 'enemy';
        el.dataset.tip = 'unit:' + e.uid;
        el.style.setProperty('--scale', d.scale);
        el.style.setProperty('--delay', (-i * 0.7) + 's');
        el.setAttribute('aria-label', e.name);
        el.innerHTML = `<div class="intent-wrap"></div><div class="sprite"><img src="img/units/${unitArt(e)}.webp" alt="${e.name}">
          <svg class="target-reticle" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="none" stroke="#ffb84d" stroke-width="3" stroke-dasharray="10 8"/></svg></div>
          <div class="info"><div class="uname">${e.name}</div><div class="hpbar"></div><div class="statuses"></div></div>`;
        if (e.dead) el.classList.add('gone');
        el.dataset.id = e.id;
        ez.appendChild(el);
      } else if (el.dataset.id !== e.id) setUnitForm(el, e);
      if (e.dead) {
        if (!el.classList.contains('dead') && !el.classList.contains('gone')) {
          el.classList.add('dead');
          // once it has faded, it leaves the row, so the living close up round the middle. Until v0.40.0 a dead
          // creature kept its place: each new Grasping Arm came in after the dead ones, the row grew, and the Thing
          // shrank while its arms moved further off (the user saw both). A won fight keeps the row as it is.
          if (!c.won) setTimeout(() => { if (el.classList.contains('dead')) el.classList.add('gone'); }, 800);
        }
        $('.intent-wrap', el).innerHTML = '';
      } else {
        $('.intent-wrap', el).innerHTML = c.phase === 'enemy' && e.acted ? '' : intentHTML(e);
      }
      updateUnitInfo(el, Math.max(0, e.hp), e.maxHp, e.ward, e, e.uid);
      el.classList.toggle('submerged', !e.dead && !E.reachable(e));
      const targetable = E.reachable(e) && ((ui.sel != null && selNeedsTarget()) || ui.tonicSel != null);
      el.classList.toggle('targetable', targetable);
      el.classList.toggle('targeted', targetable && ui.target === e.uid);
    });
    // incoming damage and danger warning
    let incoming = 0;
    E.alive(c).forEach((e) => {
      if (c.phase === 'enemy' && e.acted) return;
      const info = E.intentInfo(run, e);
      if (info && info.dmg) incoming += info.dmg * info.hits;
    });
    if (c.thrash) incoming += c.thrash; // Thrash lands after the enemies, on whatever Ward is left
    const unblocked = Math.max(0, incoming - c.player.ward);
    const inc = $('.incoming', pel);
    if (inc) {
      inc.innerHTML = incoming ? (unblocked ? `${ICON.attack}<span>${unblocked}</span>` : `${ICON.defend}<span>Blocked</span>`) : '';
      inc.className = 'incoming' + (incoming ? (unblocked ? ' hurt' : ' safe') : '');
    }
    const danger = c.phase === 'player' && !c.won && unblocked >= run.hp;
    const fieldEl = $('#field');
    if (danger && !fieldEl.classList.contains('danger')) sfx('danger');
    fieldEl.classList.toggle('danger', danger);
    // tide
    const field = $('#field');
    field.style.setProperty('--tide', c.tide);
    field.classList.toggle('tide-high', c.tide >= 5);
    renderTidebar();
    // light orb & piles
    const orb = $('#orb');
    orb.innerHTML = `${c.light}<small>/${c.maxLight}</small>`;
    orb.classList.toggle('empty', c.light === 0);
    $('#pile-draw').innerHTML = `${ICON.deck}<span>${c.draw.length}</span>`;
    $('#pile-draw').setAttribute('aria-label', `Draw pile, ${c.draw.length} cards`);
    $('#pile-discard').innerHTML = `${ICON.discard}<span>${c.discard.length}</span>${c.sunk.length ? `<span class="muted" style="margin-left:6px" title="Sunk">${ICON.sunk}${c.sunk.length}</span>` : ''}`;
    $('#pile-discard').setAttribute('aria-label', `Discard pile, ${c.discard.length} cards`);
    const endBtn = $('#btn-end');
    endBtn.disabled = ui.busy || c.phase !== 'player';
    endBtn.textContent = c.phase === 'player' ? 'End Turn' : 'Enemy Turn';
    const anyPlayable = c.hand.some((card) => E.playable(run, card).ok);
    endBtn.classList.toggle('nudge', c.phase === 'player' && !ui.busy && !anyPlayable);
    endBtn.classList.toggle('primary', c.phase === 'player' && !ui.busy && !anyPlayable);
    updateHud();
    updateHand();
    if (Teach) Teach.checkHints();
  }

  function renderTidebar() {
    const c = run.combat;
    const tb = $('#tidebar');
    if (!tb) return;
    let preview = null;
    const selCard = ui.sel != null ? c.hand.find((x) => x.uid === ui.sel) : null;
    if (selCard) {
      const v = E.vals(selCard);
      if (v.surge) preview = Math.min(6, c.tide + v.surge);
      else if (v.ebb) preview = Math.max(0, c.tide - v.ebb);
      else if (selCard.id === 'ebbflow') preview = c.tide >= 3 ? Math.min(6, c.tide + v.shift) : Math.max(0, c.tide - v.shift);
      else if (selCard.id === 'tsunami') preview = 0;
    }
    // an attack that follows the Swell marks the bar: the step (or the ends) where it is weakest, and a line that says so
    const swellHit = E.alive(c).map((e) => E.intentInfo(run, e)).find((info) => info && info.swell);
    let segs = '';
    for (let i = 0; i <= 6; i++) {
      const cls = ['tb-seg'];
      if (swellHit && (swellHit.swell === 'mid' ? i === 3 : i === 0 || i === 6)) cls.push('calm');
      if (i === 0) cls.push('end-low');
      if (i === 6) cls.push('end-crest');
      if (i <= c.tide && c.tide > 0) cls.push('filled');
      if (i === c.tide) cls.push('now');
      if (preview != null && i === preview && preview !== c.tide) cls.push('preview');
      segs += `<div class="${cls.join(' ')}">${i}</div>`;
    }
    // what the selected card's Crests or Strand would really do, chain bonuses included
    let hint = '';
    if (selCard && (preview === 6 || preview === 0)) {
      const al = E.targets(c);
      const tgt = E.needsTarget(selCard) ? (ui.target || (al[0] && al[0].uid)) : null;
      const p = E.preview(run, selCard.uid, tgt);
      if (p && p.crests) {
        const hits = [];
        for (let k = 1; k <= p.crests; k++) hits.push(E.crestDamage(run, c, c.turnCrests + k));
        hint = `<div class="tb-hint">Crest${p.crests > 1 ? ' x' + p.crests : ''}! ${hits.join(' + ')} damage to all</div>`;
      } else if (p && p.lows) {
        // the card's own hit lands first, so name the Ward it would strip only if some is left to strip
        const parts = [`+${p.lows} Light`];
        if (p.stripped) parts.unshift('Enemy Ward gone');
        if (E.has(run, 'kelpbracelet')) parts.push(`+${8 * p.lows} Ward`);
        hint = `<div class="tb-hint">Strand${p.lows > 1 ? ' x' + p.lows : ''}! ${parts.join(', ')}</div>`;
      }
    }
    if (!hint && swellHit && c.phase === 'player') {
      hint = `<div class="tb-hint note">${ICON.slot_bell}<span>${swellHit.swell === 'mid'
        ? (swellHit.dmg > swellHit.calm ? `${swellHit.name} <b>${swellHit.dmg}</b>: only <b>${swellHit.calm}</b> at Swell 3` : `${swellHit.name} <b>${swellHit.dmg}</b>: weakest here, at Swell 3`)
        : `${swellHit.name} <b>${swellHit.dmg}</b>: &minus;${BL.PEAL.step} a step off 3, &minus;${BL.PEAL.quiet} a Crest/Strand`}</span></div>`;
    }
    tb.setAttribute('aria-label', `Swell ${c.tide} of 6`);
    // Bail and Stir: once a turn, 1 Light for one step toward Strand or Crest, without a card
    const per = E.swellActsPerTurn(run);
    const used = E.swellActsUsed(c) >= per;
    const actBtn = (kind, arrow) => {
      const a = E.SWELL_ACTS[kind];
      const can = E.canSwellAct(run, kind); // a Bail into the turn's first Strand needs no Light
      const off = !can.ok || ui.busy;
      return `<button class="tb-act ${kind}${used ? ' used' : ''}" data-act="swellact" data-kind="${kind}" data-tip="kw:${a.name}"${off ? ' aria-disabled="true"' : ''}
        aria-label="${a.name}: spend 1 Light to ${a.ebb ? 'Ebb' : 'Surge'} 1. ${per > 1 ? 'Twice a turn with the Bailer' : 'Once a turn'}, Bail or Stir.${can.ok ? '' : ' ' + can.reason + '.'}">${kind === 'bail' ? arrow : ''}<b>${a.name}</b><i>1</i>${kind === 'stir' ? arrow : ''}</button>`;
    };
    tb.innerHTML = `${actBtn('bail', '<span class="tb-arrow">&#9662;</span>')}<span class="tb-label low" data-tip="kw:Strand">Strand</span>
      <div class="tb-track" data-tip="tide">${segs}${hint}</div>
      <span class="tb-label crest" data-tip="kw:Crest">Crest</span>${actBtn('stir', '<span class="tb-arrow">&#9652;</span>')}`;
  }

  /* ----- Hand ----- */
  function cardW() { return ui.cw; }
  function computeSizes() {
    const vw = innerWidth, vh = innerHeight;
    let cw;
    if (vw <= 760) cw = Math.min(112, (vw - 12) / 3.6, vh * 0.15);
    else if (vh < 520) cw = Math.min(96, vh * 0.24, vw * 0.105); // short landscape phones
    else cw = Math.min(158, vh * 0.17, vw * 0.105);
    cw = Math.max(76, Math.round(cw));
    ui.cw = cw;
    document.documentElement.style.setProperty('--cw', cw + 'px');
    // small hand cards switch to fixed, readable text sizes instead of scaling with the card
    document.documentElement.classList.toggle('small-cards', cw < 120);
    layoutHand();
  }

  function handEl() { return $('#hand'); }
  function handCardEl(uid) { const h = handEl(); return h ? $(`.card[data-uid="${uid}"]`, h) : null; }
  function selNeedsTarget() {
    const c = run.combat;
    const card = c && c.hand.find((x) => x.uid === ui.sel);
    return !!(card && E.needsTarget(card));
  }

  /* Simulate playing a card on a copy of the state to show what it would do. */
  function predictAll() {
    const c = run.combat;
    const out = {};
    if (c.phase !== 'player' || c.won || c.lost || ui.busy) return out;
    let json = null;
    c.hand.forEach((card) => {
      if (!E.playable(run, card).ok) return;
      const d = BL.CARDS[card.id];
      if (d.type === 'status' || d.type === 'curse') return;
      if (!json) json = JSON.stringify(Object.assign({}, run, { map: null, shop: null, event: null, rewards: null, treasure: null }), (k, v) => (k === 'fx' ? [] : v));
      const targets = E.needsTarget(card) ? (ui.sel === card.uid && ui.target ? [ui.target] : E.targets(c).map((e) => e.uid)) : [null];
      let best = null;
      targets.forEach((t) => {
        const r2 = JSON.parse(json);
        if (!E.playCard(r2, card.uid, t)) return;
        const c2 = r2.combat;
        const res = {
          crests: c2.turnCrests - c.turnCrests,
          lows: c2.turnLows - c.turnLows,
          kills: c2.enemies.filter((e, i) => e.dead && c.enemies[i] && !c.enemies[i].dead).length,
          won: c2.won,
          chain: c2.turnCrests,
        };
        if (!best || (res.won && !best.won) || res.kills > best.kills) best = res;
      });
      if (best) out[card.uid] = best;
    });
    return out;
  }
  function badgesHTML(p, card) {
    const c = run.combat;
    const b = [];
    if (p) {
      if (p.won) b.push('<span class="c-badge victory">VICTORY</span>');
      else if (p.kills) b.push(`<span class="c-badge lethal">LETHAL${p.kills > 1 ? '\u00d7' + p.kills : ''}</span>`);
      // the number is how many Crests this card makes, not where it falls in the turn's chain
      if (p.crests) b.push(`<span class="c-badge crest">CREST${p.crests > 1 ? '\u00d7' + p.crests : ''}</span>`);
      else if (p.lows) b.push('<span class="c-badge low">STRAND</span>');
    }
    const d = BL.CARDS[card.id];
    if (c.echo > 0 && !d.givesEcho && d.type !== 'status' && d.type !== 'curse' && b.length < 2) b.push('<span class="c-badge echo">ECHO</span>');
    return b.length ? `<div class="c-badges">${b.slice(0, 2).join('')}</div>` : '';
  }

  function updateHand() {
    const h = handEl();
    const c = run.combat;
    if (!h || !c) return;
    const preds = predictAll();
    const existing = new Map($$('.card', h).map((el) => [el.dataset.uid, el]));
    const fresh = [];
    const tgt = ui.target ? E.enemyByUid(c, ui.target) : null;
    c.hand.forEach((card, i) => {
      const key = String(card.uid);
      let el = existing.get(key);
      if (el) existing.delete(key);
      else {
        el = document.createElement('div');
        el.dataset.uid = key;
        el.tabIndex = 0;
        el.setAttribute('role', 'listitem');
        fresh.push(el);
      }
      const p = E.playable(run, card);
      const t = ui.sel === card.uid ? tgt : null;
      const html = cardInner(card, true, t) + badgesHTML(preds[card.uid], card);
      if (el._html !== html) { el.innerHTML = html; el._html = html; }
      const dragging = ui.drag && ui.drag.moved && !ui.drag.targeted && ui.drag.uid === card.uid;
      el.className = `${cardClass(card)}${p.ok ? ' playable' : ' cant'}${ui.sel === card.uid ? ' selected' : ''}${dragging ? ' dragging' : ''}`;
      el.setAttribute('aria-label', `${i + 1}: ${cardLabel(card)}${p.ok ? '' : ' (' + p.reason + ')'}`);
      if (h.children[i] !== el) h.insertBefore(el, h.children[i] || null);
    });
    existing.forEach((el) => flyTo(el, $('#pile-discard'), 0.25));
    // new cards slide in from the draw pile
    if (fresh.length) {
      const pr = $('#pile-draw').getBoundingClientRect();
      const hr = h.getBoundingClientRect();
      const cw = cardW();
      fresh.forEach((el, k) => {
        el.style.transition = 'none';
        el.style.opacity = '0';
        el.style.transform = `translate(${pr.left + pr.width / 2 - hr.left - cw / 2}px, ${pr.top - hr.top - cw * 0.7}px) scale(.3)`;
        el.style.transitionDelay = (k * 70) + 'ms';
      });
      h.offsetWidth; // reflow
      fresh.forEach((el) => { el.style.transition = ''; el.style.opacity = ''; });
      if (fresh.length) sfx('draw', fresh.length);
      setTimeout(() => fresh.forEach((el) => { el.style.transitionDelay = ''; }), 600 + fresh.length * 70);
    }
    layoutHand();
    renderGlossary();
    renderHandHint();
  }

  function layoutHand() {
    const h = handEl();
    if (!h) return;
    const els = $$('.card', h).filter((el) => !el.classList.contains('dragging'));
    const n = els.length;
    if (!n) return;
    const W = h.clientWidth;
    const cw = cardW();
    const ch = cw * 1.4;
    const step = n > 1 ? Math.min(cw * 1.04, (W - cw) / (n - 1)) : 0;
    const total = cw + step * (n - 1);
    const x0 = (W - total) / 2;
    const mobile = innerWidth <= 760;
    // a crowded desktop hand gets a flatter fan, so neighbours tilt into each other's text less
    const crowded = !mobile && (n >= 7 || step < cw * 0.95);
    const rotK = mobile ? Math.min(2, 12 / n) : crowded ? Math.min(1.5, 12 / n) : Math.min(3.5, 22 / n);
    const yK = mobile ? Math.min(1.6, 10 / n) : crowded ? Math.min(1.5, 10 / n) : Math.min(2.6, 16 / n);
    // how much of each card the next one covers (overlap plus the tilt between neighbours):
    // card text wraps inside the visible part
    const cover = Math.max(0, Math.round(cw - step + ch * Math.sin(rotK * Math.PI / 180) * 0.5));
    h.style.setProperty('--cover', cover + 'px');
    h.classList.toggle('crowded', cover > 2);
    const fUid = ui.sel != null ? ui.sel : ui.hover;
    const f = els.findIndex((el) => +el.dataset.uid === fUid);
    const hr = h.getBoundingClientRect();
    els.forEach((el, i) => {
      const off = i - (n - 1) / 2;
      let rot = n > 1 ? off * rotK : 0;
      let y = off * off * yK;
      let x = x0 + i * step;
      let s = 1;
      let z = i + 1;
      if (f >= 0 && i !== f && step < cw) {
        const dist = Math.abs(i - f);
        const push = Math.min(cw * 0.45, (cw - step) * 0.75) / dist;
        x += i < f ? -push : push;
      }
      if (i === f) {
        const selected = ui.sel != null;
        s = selected ? (mobile ? 1.6 : 1.35) : 1.28;
        rot = 0;
        y = selected ? -ch * 0.12 - 6 : -10;
        z = 100;
        const sw = cw * s;
        const minX = -hr.left + 6 + sw / 2 - cw / 2;
        const maxX = innerWidth - hr.left - 6 - sw / 2 - cw / 2;
        x = Math.max(minX, Math.min(maxX, x));
      }
      el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${s})`;
      el.style.zIndex = z;
      el.classList.toggle('lifted', i === f);
      el._lay = { x, y, s };
    });
  }

  function renderGlossary() {
    const old = $('.glossary', screenEl);
    if (old) old.remove();
    const c = run && run.combat;
    if (!c) return;
    const uid = ui.sel != null ? ui.sel : ui.hover;
    if (uid == null || (ui.drag && ui.drag.moved)) return;
    if (Teach && Teach.active) return; // the tutorial bubble explains instead
    const card = c.hand.find((x) => x.uid === uid);
    const el = handCardEl(uid);
    if (!card || !el || !el._lay) return;
    const kws = keywordsOf(card);
    if (!kws.length) return;
    const g = document.createElement('div');
    g.className = 'glossary';
    g.innerHTML = kws.map((k) => `<div><b>${k}</b>${BL.KEYWORDS[k]}</div>`).join('');
    const h = handEl();
    const hr = h.getBoundingClientRect();
    const cw = cardW();
    const L = el._lay;
    const sw = cw * L.s;
    const sh = cw * 1.4 * L.s;
    const cardLeft = hr.left + L.x + cw / 2 - sw / 2;
    const cardTop = hr.top + L.y + cw * 1.4 - sh;
    const gw = Math.min(230, innerWidth * 0.42);
    g.style.width = gw + 'px';
    let gx = cardLeft + sw + 10;
    if (gx + gw > innerWidth - 6) gx = cardLeft - gw - 10;
    if (gx < 6) gx = 6;
    g.style.left = gx + 'px';
    g.style.top = Math.max(56, cardTop) + 'px';
    g.style.position = 'fixed';
    screenEl.appendChild(g);
    // keep inside the screen vertically
    const gr = g.getBoundingClientRect();
    if (gr.bottom > innerHeight - 6) g.style.top = Math.max(56, innerHeight - 6 - gr.height) + 'px';
    // the Swell bar's Crest / Strand hint slides to the end of the bar this box is not covering
    const hint = $('#tidebar .tb-hint');
    if (hint) {
      const a = hint.getBoundingClientRect(), b = g.getBoundingClientRect();
      if (a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom) {
        const boxOnRight = b.left + b.width / 2 > a.left + a.width / 2;
        hint.style.transform = 'none';
        hint.style.left = boxOnRight ? '0' : 'auto';
        hint.style.right = boxOnRight ? 'auto' : '0';
        // still under the box (a long hint on a narrow bar): lift it clear of the box's top edge
        const a2 = hint.getBoundingClientRect();
        if (a2.right > b.left && a2.left < b.right && a2.bottom > b.top && a2.top < b.bottom) {
          hint.style.top = (parseFloat(getComputedStyle(hint).top) - (a2.bottom - b.top) - 6) + 'px';
        }
      }
    }
  }

  function renderHandHint() {
    $$('.hand-hint', screenEl).forEach((x) => x.remove());
    if (Teach && Teach.active) return; // the tutorial bubble says it instead
    const c = run.combat;
    let msg = null;
    if (ui.tonicSel != null) msg = 'Choose an enemy for the tonic';
    else if (ui.sel != null && !(ui.drag && ui.drag.moved)) {
      const card = c.hand.find((x) => x.uid === ui.sel);
      if (card) {
        const p = E.playable(run, card);
        if (!p.ok) msg = p.reason;
        else if (E.needsTarget(card) && E.targets(c).length > 1) msg = isTouchUI() ? 'Tap an enemy to play' : 'Click an enemy (or use arrow keys + Enter)';
        else msg = isTouchUI() ? 'Tap the card again to play' : 'Click again or press Enter to play';
      }
    }
    if (!msg) return;
    const d = document.createElement('div');
    d.className = 'hand-hint';
    d.textContent = msg;
    $('#field').appendChild(d);
  }

  function select(uid) {
    const c = run.combat;
    if (ui.busy || !c || c.phase !== 'player') return;
    ui.tonicSel = null;
    ui.sel = uid;
    const card = c.hand.find((x) => x.uid === uid);
    if (card && E.needsTarget(card)) {
      const al = E.targets(c);
      if (!al.some((e) => e.uid === ui.target)) ui.target = ui.kbd ? (al[0] && al[0].uid) : null;
      if (al.length === 1) ui.target = al[0].uid;
    } else ui.target = null;
    sfx('select');
    updateCombat();
  }
  function deselect() {
    if (ui.sel == null && ui.tonicSel == null) return;
    ui.sel = null; ui.target = null; ui.tonicSel = null;
    if (run && run.combat) updateCombat();
  }

  function tryPlaySelected(targetUid) {
    const c = run.combat;
    const card = c.hand.find((x) => x.uid === ui.sel);
    if (!card) return;
    const p = E.playable(run, card);
    if (!p.ok) {
      toast(p.reason);
      const el = handCardEl(card.uid);
      if (el) { el.animate([{ marginLeft: '0' }, { marginLeft: '-6px' }, { marginLeft: '6px' }, { marginLeft: '0' }], { duration: 250 }); }
      return;
    }
    if (E.needsTarget(card)) {
      const al = E.targets(c);
      const t = targetUid || ui.target || (al.length === 1 ? al[0].uid : null);
      if (!t) {
        $$('.enemy:not(.dead)', screenEl).forEach((el) => el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }], { duration: 300 }));
        return;
      }
      playCard(card.uid, t);
    } else playCard(card.uid, null);
  }

  async function playCard(uid, targetUid) {
    const c = run.combat;
    if (ui.busy) return;
    const card = c.hand.find((x) => x.uid === uid);
    const tgt = targetUid ? c.enemies.find((e) => e.uid === targetUid) : null;
    const cardId = card && card.id;
    const targetId = tgt ? tgt.id : (card && E.needsTarget(card) && E.targets(c).length === 1 ? E.targets(c)[0].id : null);
    if (Teach.active) {
      const ok = Teach.allows('play', cardId, targetId);
      if (ok !== true) { if (!Teach.nudge(ok)) toast(ok); ui.sel = null; ui.target = null; updateCombat(); return; }
    }
    const el = handCardEl(uid);
    const targetEl = targetUid ? $(`.unit[data-uid="${targetUid}"] .sprite`, screenEl) : null;
    if (!E.playCard(run, uid, targetUid)) return;
    ui.busy = true;
    sfx('card', { type: BL.CARDS[cardId] && BL.CARDS[cardId].type });
    ui.sel = null; ui.target = null; ui.hover = null;
    renderGlossary();
    renderHandHint();
    // drop the selected card's Crest / Strand preview; the Swell itself updates after the wave plays out
    $$('#tidebar .tb-hint', screenEl).forEach((x) => x.remove());
    $$('#tidebar .tb-seg.preview', screenEl).forEach((x) => x.classList.remove('preview'));
    if (el) flyTo(el, targetEl || $('#field'), 0.45, true);
    await processFx();
    ui.busy = false;
    if (Teach.active) Teach.onPlayed(cardId, targetId);
    updateCombat();
    await afterAction();
  }

  /* Bail or Stir (see E.swellAct). */
  async function swellAct(kind) {
    const c = run.combat;
    if (!c || ui.busy) return;
    if (Teach.active) {
      const ok = Teach.allows('swellact', kind);
      if (ok !== true) { if (!Teach.nudge(ok)) toast(ok); return; }
    }
    const can = E.canSwellAct(run, kind);
    if (!can.ok) { toast(can.reason); return; }
    deselect();
    if (!E.swellAct(run, kind)) return;
    ui.busy = true;
    sfx(kind); // the Bailer: 'bail' or 'stir'
    await processFx();
    ui.busy = false;
    if (Teach.active) Teach.onSwellAct(kind);
    updateCombat();
    await afterAction();
  }

  async function afterAction() {
    const c = run.combat;
    if (!c) return;
    if (c.lost) return onDefeat();
    if (c.won) return onVictory();
    save();
  }

  async function onVictory() {
    ui.busy = true;
    sfx('victory');
    await wait(1000);
    ui.busy = false;
    if (run.tutorial) { Teach.onVictory(); return; }
    E.finishCombat(run);
    checkUnlocks();
    if (run.screen === 'victory') clearSave(); else save();
    render();
  }
  async function onDefeat() {
    ui.busy = true;
    sfx('defeat');
    await wait(1100);
    ui.busy = false;
    run.screen = 'defeat';
    clearSave();
    render();
  }

  async function endTurn() {
    const c = run.combat;
    if (!c || ui.busy || c.phase !== 'player') return;
    if (Teach.active) {
      const ok = Teach.allows('endturn');
      if (ok !== true) { if (!Teach.nudge(ok)) toast(ok); return; }
      Teach.onEndTurn();
    }
    ui.busy = true;
    ui.sel = null; ui.target = null; ui.hover = null; ui.tonicSel = null;
    E.endTurnStart(run);
    await processFx();
    updateCombat();
    if (c.won) { ui.busy = false; return onVictory(); }
    banner('Enemy Turn', 'enemy');
    await wait(700);
    for (const uid of E.enemyOrder(c)) {
      if (c.won || c.lost) break;
      if (!E.enemyStep(run, uid)) continue;
      await processFx();
      updateCombat();
      await wait(330);
    }
    if (c.lost) { ui.busy = false; return onDefeat(); }
    if (c.won) { ui.busy = false; return onVictory(); }
    E.endTurnFinish(run);
    ui.busy = false;
    if (c.lost) return onDefeat();
    await processFx();
    updateCombat();
    if (c.won) return onVictory();
    save();
  }

  async function useTonic(slot, targetUid) {
    const t = run.tonics[slot];
    if (!t) return;
    const td = BL.TONICS[t];
    const c = run.combat;
    if (!c) {
      if (E.useTonic(run, slot)) { sfx('tonic'); toast(`${td.name}: ${td.desc}`); save(); render(); }
      return;
    }
    if (ui.busy) return;
    if (Teach.active) { const why = Teach.allows('tonic'); if (!Teach.nudge(why)) toast(why); return; }
    if (td.target === 'enemy' && !targetUid) {
      const al = E.targets(c);
      if (!al.length) { toast('Nothing in reach'); return; }
      if (al.length === 1) targetUid = al[0].uid;
      else {
        ui.sel = null;
        ui.tonicSel = slot;
        ui.target = ui.kbd ? al[0].uid : null;
        updateCombat();
        return;
      }
    }
    if (!E.useTonic(run, slot, targetUid)) return;
    ui.tonicSel = null; ui.target = null;
    ui.busy = true;
    sfx('tonic');
    await processFx();
    ui.busy = false;
    updateCombat();
    await afterAction();
  }

  /* ----- FX ----- */
  function unitEl(who) {
    if (who === 'p') return $('.unit.player .sprite', screenEl);
    return $(`.unit[data-uid="${who}"] .sprite`, screenEl);
  }
  function floatAt(el, text, cls) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const d = document.createElement('div');
    d.className = 'float ' + (cls || '');
    d.textContent = text;
    d.style.left = (r.left + r.width / 2 + (Math.random() * 40 - 20)) + 'px';
    d.style.top = (r.top + r.height * 0.4 + (Math.random() * 20 - 10)) + 'px';
    fxLayer.appendChild(d);
    // keep it on screen (the Light orb sits at the left edge)
    const half = d.offsetWidth * 0.6; // centred, and it pops to 115% size
    d.style.left = Math.max(6 + half, Math.min(innerWidth - 6 - half, parseFloat(d.style.left))) + 'px';
    setTimeout(() => d.remove(), 1200);
  }
  function anim(el, cls, ms) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), ms || 450);
  }
  function burstAt(el) {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height * 0.5;
    const ring = document.createElement('div');
    ring.className = 'burst-ring';
    ring.style.left = cx + 'px'; ring.style.top = cy + 'px';
    fxLayer.appendChild(ring);
    setTimeout(() => ring.remove(), 700);
    for (let i = 0; i < 18; i++) {
      const p = document.createElement('div');
      p.className = 'particle' + (i % 3 === 0 ? ' gold' : '');
      const a = (Math.PI * 2 * i) / 18 + Math.random() * 0.3;
      const dist = 60 + Math.random() * 90;
      p.style.left = cx + 'px'; p.style.top = cy + 'px';
      p.style.setProperty('--dx', Math.cos(a) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(a) * dist - 30 + 'px');
      p.style.setProperty('--sz', 5 + Math.random() * 9 + 'px');
      fxLayer.appendChild(p);
      setTimeout(() => p.remove(), 900);
    }
  }
  function slashAt(el, kind) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const d = document.createElement('div');
    d.className = 'slash-fx' + (kind ? ' ' + kind : '');
    d.style.left = (r.left + r.width / 2) + 'px';
    d.style.top = (r.top + r.height * 0.5) + 'px';
    d.style.transform = `translate(-50%,-50%) rotate(${-40 + Math.random() * 30}deg)`;
    fxLayer.appendChild(d);
    setTimeout(() => d.remove(), 350);
  }
  /* The chain bonus, shown inside the Crest / Strand text the moment it is earned (paid after the fight). */
  function chainRibbon(name, pearls) {
    return `<div class="chain-ribbon"><b>&#9733; ${name}</b><em>${ICON.pearl}+${pearls} Pearls</em></div>`;
  }
  function banner(text, cls) {
    const f = $('#field');
    if (!f) return;
    $$('.banner', f).forEach((b) => b.remove());
    const b = document.createElement('div');
    b.className = 'banner ' + (cls || '');
    // a Crest or Strand is still on screen (Moon Pull at the start of a turn, a phase change mid-wave): sit below it
    if ($('.crest-text', f)) b.classList.add('stacked');
    b.textContent = text;
    f.appendChild(b);
    setTimeout(() => b.remove(), 1200);
  }
  /* The last landing's pin (v0.36.0). The user: "Can we make last boss feel even more epic, without making it longer?"
     It adds no turn and no HP, only a few seconds of show: a name card and the great toll as the fight opens, a bigger
     beat when the Bellwether's bronze breaks and the Thing comes out, and a slow last blow where the bell goes to light. */
  const FINAL_CARD = {
    bell: ['The Drowned Bellwether', 'The keepers\' great bell, ringing with no hand on its rope'],
    bellthing: ['The Thing in the Bell', 'It grew into the bronze, around the Heart'],
    darkwatch: ['The Dark Watch', 'The light went out on her watch'],
  };
  const finalFight = () => !!(run && !run.tutorial && run.combat && run.combat.kind === 'boss' && E.lastLevel(run));
  function bossCard(title, sub, kicker) {
    const f = $('#field');
    if (!f) return;
    $$('.banner, .boss-card', f).forEach((b) => b.remove());
    const d = document.createElement('div');
    d.className = 'boss-card';
    d.innerHTML = `${kicker ? `<small>${kicker}</small>` : ''}<b>${title}</b><i></i>${sub ? `<span>${sub}</span>` : ''}`;
    f.appendChild(d);
    setTimeout(() => d.remove(), 3000);
  }
  // a light that swells out of `el` until it fills the screen, then fades: the Heart's light, a bell going to light
  function lightBloom(el, cls) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const d = document.createElement('div');
    d.className = 'light-bloom' + (cls ? ' ' + cls : '');
    d.style.left = r.left + r.width / 2 + 'px'; d.style.top = r.top + r.height * 0.45 + 'px';
    fxLayer.appendChild(d);
    setTimeout(() => d.remove(), 2600);
  }
  // the blow that breaks the last pin: the field slows and drains of colour, the bronze glows from inside, then it goes to light
  async function finalBlow(el, unit) {
    document.body.classList.add('final-blow');
    if (unit) unit.classList.add('last-blow');
    sfx('lastblow');
    await wait(1000);
    sfx('shatter');
    lightBloom(el);
    if (el) { burstAt(el); setTimeout(() => burstAt(el), 160); }
    if (unit) { unit.classList.remove('last-blow'); unit.classList.add('to-light'); }
    await wait(800);
    document.body.classList.remove('final-blow');
  }
  function flyTo(el, toEl, scale, fade) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cw = cardW(), ch = cw * 1.4;
    el.classList.remove('selected', 'playable');
    el.style.transition = 'none';
    el.style.transform = 'none';
    el.style.left = (r.left + r.width / 2 - cw / 2) + 'px';
    el.style.top = (r.top + r.height / 2 - ch / 2) + 'px';
    el.className += ' card-fly';
    fxLayer.appendChild(el);
    let dx = 0, dy = -80;
    if (toEl) {
      const t = toEl.getBoundingClientRect();
      dx = t.left + t.width / 2 - (r.left + r.width / 2);
      dy = t.top + t.height / 2 - (r.top + r.height / 2);
    }
    const a = el.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.6}px, ${dy * 0.6}px) scale(${(1 + scale) / 2})`, opacity: 1, offset: 0.6 },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: fade ? 0 : 0.2 },
    ], { duration: fade ? 380 : 330, easing: 'cubic-bezier(.3,.7,.4,1)' });
    a.onfinish = () => el.remove();
    setTimeout(() => el.remove(), 800);
  }

  /* Ward knocked off enemies (a Strand, or a Crest shaking a creature out of its bell): the badges crack and fall away. */
  function shatterWard(stripped) {
    stripped.forEach((x) => {
      const el = unitEl(x.who);
      const unit = el && el.closest('.unit');
      const badge = unit && $('.ward-badge', unit);
      if (badge) badge.classList.add('shatter');
      if (unit) $('.hpbar', unit).classList.remove('warded');
      floatAt(el, `-${x.n} Ward`, 'ward-lost');
    });
    if (stripped.length) sfx('crack', { pan: panOf(unitEl(stripped[0].who)) });
  }
  /* A unit element shows the creature it is now: a boss with a second form keeps its uid but changes its id. */
  /* A creature's picture. The Bellwether shows its cracks, lit from inside, once "The Bell Cracks!" has happened
     (v0.40.0, the user: the bell cracks "does not break the bell visually"); c.phase2 is saved with the fight. */
  const unitArt = (e) => { const d = BL.ENEMIES[e.id]; return d.cracked && run.combat && run.combat.phase2 ? d.cracked : d.art; };
  function setUnitForm(el, e) {
    const d = BL.ENEMIES[e.id];
    el.dataset.id = e.id;
    el.style.setProperty('--scale', d.scale);
    el.setAttribute('aria-label', e.name);
    const img = $('.sprite img', el);
    if (img) { img.src = `img/units/${unitArt(e)}.webp`; img.alt = e.name; }
    const nm = $('.uname', el);
    if (nm) nm.textContent = e.name;
    const hb = $('.hpbar', el); // the new form's full HP, not the old form's last point
    if (hb) hb.innerHTML = hpBarHTML(e.hp, e.maxHp, e.ward);
  }
  async function processFx() {
    const c = run.combat;
    if (!c) return;
    const list = c.fx.splice(0);
    for (const f of list) {
      switch (f.t) {
        case 'dmg': {
          const el = unitEl(f.who);
          const unit = el && el.closest('.unit');
          if (f.n > 0) {
            floatAt(el, f.n, f.n >= 25 ? 'huge' : f.n >= 15 ? 'big' : '');
            anim(unit, 'hit', 380);
            anim(unit, 'flash-red', 380);
            if (f.who === 'p') { sfx(f.brine ? 'brine' : 'hurt', { n: f.n, pan: -0.3 }); anim($('#field'), 'shake', 420); } else sfx(f.brine ? 'brine' : 'hit', { n: f.n, pan: panOf(el) });
            if (f.n >= 15) { anim($('#field'), 'impact', 260); await wait(70); }
          } else if (f.blocked > 0) {
            floatAt(el, 'Blocked', 'blocked');
            sfx('block', { pan: f.who === 'p' ? -0.3 : panOf(el) });
          }
          await wait(f.attack ? 150 : 90);
          break;
        }
        case 'ward': floatAt(unitEl(f.who), '+' + f.n + ' Ward', 'ward'); sfx('ward'); break;
        case 'heal': if (f.n > 0) floatAt(unitEl(f.who), '+' + f.n, 'heal'); break;
        case 'status': {
          const s = BL.STATUSES[f.key];
          if (!s) break;
          floatAt(unitEl(f.who), s.kind === 'rite' ? s.name : `${s.name} +${f.n}`, 'status ' + s.kind);
          sfx(f.key === 'heartfire' ? 'heartfire' : s.kind === 'debuff' ? 'debuff' : 'buff');
          await wait(60);
          break;
        }
        case 'slash': slashAt(unitEl(f.who)); break;
        case 'sweep': $$('.enemy:not(.dead) .sprite', screenEl).forEach(slashAt); break;
        case 'act': {
          const el = unitEl(f.who);
          const unit = el && el.closest('.unit');
          if (unit) {
            floatAt(el, f.name, 'move');
            if (f.attack) anim(unit, 'lunge-left', 420);
          }
          await wait(f.attack ? 260 : 380);
          break;
        }
        case 'crest': {
          const field = $('#field');
          const chain = f.chain || 1;
          if (field) {
            field.style.setProperty('--tide', 6);
            $$('.crest-text', field).forEach((x) => x.remove());
            const w = document.createElement('div'); w.className = 'crest-wave chain-' + Math.min(chain, 4); field.appendChild(w);
            const t = document.createElement('div');
            t.className = 'crest-text chain-' + Math.min(chain, 4);
            t.innerHTML = `<span>CREST${chain > 1 ? ' <b>x' + chain + '</b>' : ''}!</span><small>${f.n} to all</small>${f.fury ? chainRibbon('Tidal Fury', f.fury) : ''}`;
            if (f.fury) { t.classList.add('fury'); anim(field, 'fury-flash', 900); }
            field.appendChild(t);
            setTimeout(() => { w.remove(); t.remove(); }, f.fury ? 2100 : 1400);
            anim(field, chain > 1 ? 'impact' : 'shake', 420);
          }
          sfx('crest', chain);
          if (f.stripped && f.stripped.length) shatterWard(f.stripped);
          if (chain > 1) sfx('chain', chain);
          if (f.fury) setTimeout(() => sfx('fury'), 160);
          await wait(380 + Math.min(chain, 4) * 60 + (f.fury ? 420 : 0));
          break;
        }
        case 'low': {
          const field = $('#field');
          const stripped = f.stripped || [];
          if (field) {
            field.classList.add('drain');
            field.style.setProperty('--tide', 0);
            $$('.crest-text', field).forEach((x) => x.remove());
            const what = [stripped.length ? 'Enemy Ward gone' : '', f.light ? `+${f.light} Light` : ''].filter(Boolean).join(' · ');
            const t = document.createElement('div');
            t.className = 'crest-text low' + (f.ebb ? ' fury' : '');
            t.innerHTML = `<span>STRAND${(f.chain || 1) > 1 ? ' <b>x' + f.chain + '</b>' : ''}</span>${what ? `<small>${what}</small>` : ''}${f.ebb ? chainRibbon('High and Dry', f.ebb) : ''}`;
            field.appendChild(t);
            if (f.ebb) anim(field, 'fury-flash', 900);
            setTimeout(() => { t.remove(); field.classList.remove('drain'); }, f.ebb ? 2100 : 1500);
          }
          sfx('low');
          // stranded: each enemy's Ward badge cracks and falls away
          shatterWard(stripped);
          (f.surfaced || []).forEach((uid) => floatAt(unitEl(uid), 'Stranded: in reach', 'status debuff'));
          if (f.light) {
            const o = $('#orb');
            anim(o, 'gain', 700);
            floatAt(o, `+${f.light} Light`, 'light-gain');
            setTimeout(() => sfx('lightgain'), 120);
          }
          if (f.ebb) setTimeout(() => sfx('fury', true), 160);
          await wait(460 + (stripped.length ? 160 : 0) + (f.ebb ? 420 : 0));
          break;
        }
        case 'beam': {
          const to = unitEl(f.who);
          const from = $('.unit.player .sprite', screenEl);
          if (to && from) {
            const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
            const x1 = a.left + a.width * 0.7, y1 = a.top + a.height * 0.2;
            const x2 = b.left + b.width / 2, y2 = b.top + b.height / 2;
            const d = document.createElement('div');
            d.className = 'beam-fx';
            d.style.position = 'fixed';
            d.style.left = x1 + 'px'; d.style.top = y1 + 'px';
            d.style.width = Math.hypot(x2 - x1, y2 - y1) + 'px';
            d.style.transform = `rotate(${Math.atan2(y2 - y1, x2 - x1)}rad)`;
            fxLayer.appendChild(d);
            setTimeout(() => d.remove(), 700);
          }
          await wait(250);
          break;
        }
        case 'die': {
          const el = unitEl(f.who);
          const unit = el && el.closest('.unit');
          const who = c.enemies.find((x) => x.uid === f.who);
          if (c.won && who && BL.ENEMIES[who.id].boss && ui.finalBlow !== c && finalFight()) { ui.finalBlow = c; await finalBlow(el, unit); break; }
          if (el) burstAt(el);
          if (unit) unit.classList.add('dead');
          { const pan = panOf(el); sfx('kill', { pan }); sfx('die', { pan }); }
          await wait(140);
          break;
        }
        case 'echo': {
          if (f.who) { floatAt(unitEl(f.who), 'Echo!', 'status buff'); sfx('echo'); await wait(320); break; } // a creature's move happens again
          const field = $('#field');
          if (field) {
            const t = document.createElement('div'); t.className = 'echo-text'; t.textContent = 'ECHO!'; field.appendChild(t);
            setTimeout(() => t.remove(), 1000);
          }
          sfx('echo');
          await wait(250);
          break;
        }
        case 'pearls': {
          floatAt(unitEl('p'), `+${f.n} Pearls`, 'pearl');
          sfx('pearl');
          break;
        }
        case 'spray': { const el = unitEl(f.who); slashAt(el, 'spray'); break; }
        case 'phase': {
          const field = $('#field');
          if (field) { field.classList.add('phase2'); anim(field, 'impact', 600); }
          c.phase2 = true;
          // a creature with a cracked picture (the Bellwether) cracks in front of you, and stays cracked
          const pe = c.enemies.find((x) => x.uid === f.who), pu = unitEl(f.who), punit = pu && pu.closest('.unit');
          if (pe && BL.ENEMIES[pe.id].cracked && punit) {
            const img = $('.sprite img', punit);
            if (img) img.src = `img/units/${unitArt(pe)}.webp`;
            anim(punit, 'crack-flash', 900);
            sfx('crack', { pan: panOf(punit) });
          }
          banner(f.text || 'The deep stirs', 'enemy big');
          sfx('phase');
          updateSound();
          await wait(900);
          break;
        }
        case 'rise': {
          // the boss breaks open, and its second form comes out in its place
          const el = unitEl(f.who);
          const unit = el && el.closest('.unit');
          const field = $('#field');
          // on the last landing the bronze cracks under two blows first, and breaks open in the Heart's light (v0.36.0)
          const big = f.from === 'bell' && finalFight();
          if (big) {
            if (unit) unit.classList.add('cracking');
            sfx('phase');
            anim(field, 'impact', 600);
            await wait(650);
            anim(field, 'quake', 700);
            await wait(450);
            sfx('shatter');
            lightBloom(el, 'heart');
            if (unit) unit.classList.remove('cracking');
          } else sfx('die');
          if (el) burstAt(el);
          await wait(300);
          if (unit) { setUnitForm(unit, run.combat.enemies.find((x) => x.uid === f.who)); anim(unit, 'reborn', 1000); }
          if (field) { field.classList.add('phase2'); anim(field, 'impact', 600); }
          c.phase2 = true;
          if (big) bossCard(FINAL_CARD.bellthing[0], FINAL_CARD.bellthing[1], f.text);
          else { banner(f.text, 'enemy big'); sfx('phase'); }
          updateSound();
          await wait(big ? 1700 : 1000);
          break;
        }
        case 'burst': {
          const el = unitEl(f.who);
          if (el) burstAt(el);
          floatAt(el, `Burst ${f.n}`, f.horn ? 'status buff' : 'status debuff');
          anim($('#field'), 'impact', 420);
          sfx('crest');
          await wait(260);
          break;
        }
        case 'breathless': { const p = $('#pile-draw'); anim(p, 'pulse', 600); floatAt(unitEl('p'), `Breathless: ${f.n} fewer card${f.n > 1 ? 's' : ''}`, 'status debuff'); sfx('debuff'); break; }
        case 'shuffle': anim($('#pile-draw'), 'pulse', 500); break;
        case 'roil': roilToast(f); break;
        case 'thrash': floatAt(unitEl('p'), 'Thrash', 'status debuff'); break;
        case 'line': { const el = unitEl('p'); floatAt(el, `The line holds: ${f.n} HP`, 'status buff'); anim(el, 'gain', 700); toast(`Your ${BL.KIT.line.name} holds. You are left with ${f.n} HP. It holds only once an expedition.`, 4200); sfx('buff'); await wait(400); break; }
        // Dark Water
        case 'doused': { const o = $('#orb'); anim(o, 'doused', 900); floatAt(o, `-${f.n} Light: doused`, 'status debuff'); sfx('douse'); break; }
        case 'relit': { const o = $('#orb'); anim(o, 'gain', 700); floatAt(o, 'Lantern rekindled', 'light-gain'); break; }
        case 'submerge': { const el = unitEl(f.who); floatAt(el, 'Submerged', 'status buff'); sfx('submerge', { pan: panOf(el) }); await wait(200); break; }
        case 'swallow': { const el = unitEl(f.who); floatAt(el, `Swallowed ${f.name}`, 'status debuff'); anim($('#pile-discard'), 'pulse', 500); toast(`It swallowed your ${f.name}. Kill it to get the card back.`); sfx('debuff'); await wait(300); break; }
        case 'disgorge': toast(`Back in your discard pile: ${f.names.join(', ')}`); anim($('#pile-discard'), 'pulse', 500); break;
        case 'addcards': toast(`${f.n} ${BL.CARDS[f.id].name} shuffled into your draw pile`); break;
        case 'turn': banner(c.turn === 1 ? 'Your Turn' : `Turn ${c.turn}`); sfx('turn'); break;
        case 'light': { const o = $('#orb'); anim(o, 'gain', 700); if (f.n) floatAt(o, `+${f.n} Light`, 'light-gain'); break; }
        case 'ks': { const m = $(`.hud .medal[data-k="${f.k}"]`, screenEl); anim(m, 'flash', 900); break; }
        case 'kit': { const m = f.k === 'bell' ? $('.hud .medal[data-k="bell"]', screenEl) : $('.hud .gear-pack', screenEl); anim(m, 'flash', 900); break; }
        case 'tide': if (f.undertow) floatAt($('#tidebar'), 'Backwash', 'status debuff'); sfx('tide'); break;
      }
    }
  }

  /* ----- Pointer handling for the hand (tap, click, drag) ----- */
  function bindHand() {
    const h = handEl();
    h.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.card');
      if (!el || ui.busy || e.button > 0) return;
      e.preventDefault();
      hideTip();
      ui.kbd = false;
      ui.drag = { uid: +el.dataset.uid, el, x0: e.clientX, y0: e.clientY, moved: false, pid: e.pointerId, overEnemy: null };
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    h.addEventListener('pointermove', (e) => {
      const d = ui.drag;
      if (!d) {
        if (e.pointerType === 'mouse' && !ui.busy) {
          const el = e.target.closest('.card');
          const uid = el ? +el.dataset.uid : null;
          if (uid !== ui.hover && ui.sel == null) { ui.hover = uid; layoutHand(); renderGlossary(); }
        }
        return;
      }
      if (d.pid !== e.pointerId) return;
      if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 12) startDrag(d);
      if (d.moved) moveDrag(d, e);
    });
    h.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse' && !ui.drag && ui.hover != null) { ui.hover = null; layoutHand(); renderGlossary(); }
    });
    const up = (e) => {
      const d = ui.drag;
      if (!d || d.pid !== e.pointerId) return;
      ui.drag = null;
      clearArrow();
      if (d.moved) endDrag(d, e);
      else onCardTap(d.uid);
    };
    h.addEventListener('pointerup', up);
    h.addEventListener('pointercancel', (e) => {
      const d = ui.drag;
      if (!d) return;
      ui.drag = null;
      clearArrow();
      d.el.classList.remove('dragging');
      layoutHand();
    });
    h.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const el = e.target.closest('.card');
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      ui.kbd = true;
      onCardTap(+el.dataset.uid);
    });
  }

  function onCardTap(uid) {
    const c = run.combat;
    if (!c || ui.busy) return;
    if (ui.sel !== uid) { select(uid); return; }
    tryPlaySelected();
  }

  function startDrag(d) {
    const c = run.combat;
    const card = c.hand.find((x) => x.uid === d.uid);
    if (!card || c.phase !== 'player') return;
    const p = E.playable(run, card);
    if (!p.ok) { ui.drag = null; select(d.uid); return; }
    d.moved = true;
    ui.sel = d.uid;
    ui.hover = null;
    d.targeted = E.needsTarget(card);
    if (!d.targeted) {
      d.el.classList.add('dragging');
    }
    updateCombat();
  }
  function moveDrag(d, e) {
    const h = handEl();
    const hr = h.getBoundingClientRect();
    const cw = cardW(), ch = cw * 1.4;
    if (d.targeted) {
      const L = d.el._lay || { x: 0, y: 0, s: 1 };
      const sx = hr.left + L.x + cw / 2;
      const sy = hr.top + L.y + ch - ch * L.s;
      drawArrow(sx, sy, e.clientX, e.clientY);
      const under = document.elementsFromPoint(e.clientX, e.clientY).find((n) => n.closest && n.closest('.enemy:not(.dead):not(.submerged)'));
      const en = under ? under.closest('.enemy') : null;
      const uid = en ? en.dataset.uid : null;
      if (uid !== ui.target) {
        ui.target = uid;
        $$('.enemy', screenEl).forEach((x) => x.classList.toggle('targeted', x.dataset.uid === uid));
        const card = run.combat.hand.find((x) => x.uid === d.uid);
        const t = uid ? E.enemyByUid(run.combat, uid) : null;
        if (card) { const html = cardInner(card, true, t); d.el.innerHTML = html; d.el._html = html; }
      }
    } else {
      d.el.style.transform = `translate(${e.clientX - hr.left - cw / 2}px, ${e.clientY - hr.top - ch / 2}px) scale(1.08)`;
      const dockTop = $('#dock').getBoundingClientRect().top;
      d.el.classList.toggle('selected', e.clientY < dockTop);
    }
  }
  function endDrag(d, e) {
    d.el.classList.remove('dragging');
    if (d.targeted) {
      if (ui.target) playCard(d.uid, ui.target);
      else { ui.sel = null; updateCombat(); }
    } else {
      const dockTop = $('#dock').getBoundingClientRect().top;
      if (e.clientY < dockTop - 10) playCard(d.uid, null);
      else { ui.sel = null; updateCombat(); }
    }
  }
  function drawArrow(x1, y1, x2, y2) {
    let a = $('#arrow');
    if (!a) {
      a = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      a.id = 'arrow';
      a.innerHTML = '<path/><circle r="9"/>';
      document.body.appendChild(a);
    }
    const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - 60;
    a.querySelector('path').setAttribute('d', `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`);
    const ci = a.querySelector('circle');
    ci.setAttribute('cx', x2); ci.setAttribute('cy', y2);
  }
  function clearArrow() { const a = $('#arrow'); if (a) a.remove(); }

  /* ----- Reward ----- */
  /* Keepsake tiles to pick from. Once one is taken they stay where they are: the pick lit, the rest dimmed. */
  /* What carrying one more keepsake would do to your Roil: "Then 34/30, 1 Seep". */
  function chargeAfter(id) {
    const ch = E.charge(run, id), h = E.hold(run), r0 = E.roil(run), r1 = E.roil(run, id);
    return `<span class="k-after${r1.steps > r0.steps ? ' over' : ''}">Then ${ch}/${h}${r1.steps ? `: ${roilWords(r1, true)}` : ''}</span>`;
  }
  // a keepsake offer: open tiles are picks (`scope` rw-ks, tr-ks or fall-ks; `picked` is the one marked), taken and left
  // ones are lit or dim. A fall's tiles say nothing of the Roil after: the expedition is over.
  function ksTiles(ids, taken, scope, left, picked) {
    return ids.map((id) => {
      const K = BL.KEEPSAKES[id];
      const art = `<span class="medal"><img src="img/icons/${K.art}.webp" alt=""></span><b>${K.name}</b><span class="k-charge">Roil ${K.charge}</span><small>${K.desc}</small>${K.deep ? `<span class="k-deep">From ${E.LEVELS[K.deep].the}</span>` : ''}`;
      if (taken || left) return `<div class="shop-tile ${id === taken ? 'chosen' : 'dim'}"${id === taken ? ' aria-label="Taken: ' + K.name + '"' : ''}>${art}</div>`;
      const on = picked === id;
      return `<div class="shop-tile ks-pick${on ? ' picked' : ''}" tabindex="0" role="button" aria-pressed="${on}" data-act="pick" data-scope="${scope}" data-key="${id}" aria-label="${K.name}, Roil ${K.charge}">${art}${scope === 'fall-ks' ? '' : chargeAfter(id)}</div>`;
    }).join('');
  }
  const leaveKsBtn = () => `<button class="btn ghost small leave-ks" data-act="leaveks">Leave them (+${E.DECLINE_SCORE.keepsake} score)</button>`;

  function renderReward() {
    const rw = run.rewards;
    // the Pearl total already includes the bonuses, so they read as part of it rather than on top of it
    const bonusChips = (rw.bonuses || []).map((b) => `<span class="chip bonus" title="${b.desc}">&#9733; ${b.name} +${b.pearls}</span>`).join('')
      + (rw.roilPay ? `<span class="chip bonus roil" title="The aether was Roiled, ${rw.roilSteps} step${rw.roilSteps > 1 ? 's' : ''} over your Hold: ${E.ROIL_PAY} Pearls a step">${ICON.charge} Roiled +${rw.roilPay}</span>` : '');
    const summary = `<div class="reward-summary"><span class="chip pearls">${ICON.pearl}<b>+${rw.pearls}</b> Pearls</span>${bonusChips ? `<span class="incl">including</span>${bonusChips}` : ''}</div>`;
    const ksChoices = rw.keepsakeChoices && rw.keepsakeChoices.length ? rw.keepsakeChoices : null;
    const extras = [];
    if (rw.keepsake && !ksChoices) {
      const k = BL.KEEPSAKES[rw.keepsake];
      extras.push(`<div class="reward-item done"><span class="medal"><img src="img/icons/${k.art}.webp" alt=""></span><div class="grow"><b>${k.name}</b><small>${k.desc}</small></div></div>`);
    }
    if (rw.tonic) {
      const tn = BL.TONICS[rw.tonic];
      const full = run.tonics.indexOf(null) < 0;
      extras.push(`<div class="reward-item${rw.tonicTaken ? ' done' : ''}"><span class="medal"><img src="img/icons/${tn.art}.webp" alt=""></span><div class="grow"><b>Tonic: ${tn.name}</b><small>${tn.desc}${!rw.tonicTaken && !full ? ` <span class="muted">Leave it for +${E.DECLINE_SCORE.tonic} score.</span>` : ''}</small></div>
        ${rw.tonicTaken ? '<span class="muted">Taken</span>' : `<button class="btn small" data-act="taketonic" ${full ? 'disabled title="Tonic slots full"' : ''}>${full ? 'Slots full' : 'Take'}</button>`}</div>`);
    }
    if (rw.oneOf) return renderDreadReward(rw, summary);
    // the panel stays after the pick (chosen tile lit, the other dimmed) so nothing below it jumps up under the pointer
    const ksOpen = ksChoices && !rw.keepsake && !rw.keepsakeLeft;
    const ksPick = ksOpen ? pickOf('rw-ks', rw) : null;
    const ksPanel = ksChoices ? `<div class="panel"><h3>${rw.keepsake ? 'Keepsake taken' : rw.keepsakeLeft ? 'Keepsakes left behind' : 'Take a keepsake?'}</h3><div class="shop-row">${ksTiles(ksChoices, rw.keepsake, 'rw-ks', rw.keepsakeLeft, ksPick)}</div>${ksOpen ? `<div class="ks-actions">${leaveKsBtn()}${pickOkBtn('rw-ks', ksPick, 'small')}</div>` : ''}</div>` : '';
    // a card is marked first (a tap, or 1 to 3) and taken with the button below it (v0.36.0)
    const cPick = rw.cardTaken ? null : pickOf('rw-card', rw);
    const cards = rw.cards.map((rc, i) => staticCard(pseudo(rc.id, rc.up), `choice reveal${BL.CARDS[rc.id].rarity === 'rare' ? ' shine' : ''}${rc.up ? ' shine-up' : ''}${rw.cardTaken ? (rw.cardTakenIdx === i ? ' chosen' : ' dim') : String(i) === cPick ? ' picked' : ''}`,
      (rw.cardTaken ? '' : `tabindex="0" role="button" aria-pressed="${String(i) === cPick}" data-act="pick" data-scope="rw-card" data-key="${i}"`) + ` style="animation-delay:${i * 0.12}s"`)).join('');
    const cardTitle = rw.cardTaken ? (rw.cardTakenIdx >= 0 ? 'Added to your deck' : 'Card skipped') : 'Choose a card for your deck';
    const legend = rw.cardTaken ? '' : pickLegend('rw-card', cPick == null ? null : pseudo(rw.cards[+cPick].id, rw.cards[+cPick].up));
    // a keepsake on offer is taken or left before moving on; taking the card goes on to the map when nothing else waits
    const buttons = !rw.cardTaken
      ? `<button class="btn ghost" data-act="rewardcard" data-i="">Skip the card (+${E.DECLINE_SCORE[E.skipCardKind(rw)]} score)</button>${pickOkBtn('rw-card', cPick, 'wide')}`
      : ksOpen
        ? '<button class="btn primary wide" disabled>Take a keepsake or leave them</button>'
        : '<button class="btn primary wide" data-act="tomap" autofocus>Continue</button>';
    screenEl.innerHTML = `<div class="run-screen">${hudHTML()}<div class="run-body"><div class="scene" style="background-image:url(img/bg/${E.band(run).bg}.webp)"><div class="scene-inner reward-screen">
      <h1>Victory</h1>
      ${summary}
      ${ksPanel}
      ${rw.cards.length ? `<section class="reward-main"><h2>${cardTitle}</h2><div class="card-row reward-cards">${cards}</div>${legend}</section>` : ''}
      ${extras.length ? `<div class="reward-list">${extras.join('')}</div>` : ''}
      <div class="row-buttons">${buttons}</div>
    </div></div></div></div>`;
    const f = $('[autofocus]', screenEl) || $('.picked', screenEl) || (rw.cardTaken && $('.ks-pick', screenEl)) || $('.card.choice', screenEl);
    if (f && ui.lastPointer !== 'touch') f.focus({ preventScroll: true });
  }

  /* A Dread's reward (v0.40.0): one pick, a card from three or the keepsake. Both are marked with the same scope
     (`rw-one`: a card's index or the keepsake's id), and one Take takes it; the rest stays lit or dimmed after. */
  function renderDreadReward(rw, summary) {
    const open = !rw.cardTaken && !rw.keepsake;
    const pick = open ? pickOf('rw-one', rw) : null;
    const cards = rw.cards.map((rc, i) => staticCard(pseudo(rc.id, rc.up), `choice reveal${BL.CARDS[rc.id].rarity === 'rare' ? ' shine' : ''}${rc.up ? ' shine-up' : ''}${!open ? (rw.cardTakenIdx === i ? ' chosen' : ' dim') : String(i) === pick ? ' picked' : ''}`,
      (open ? `tabindex="0" role="button" aria-pressed="${String(i) === pick}" data-act="pick" data-scope="rw-one" data-key="${i}"` : '') + ` style="animation-delay:${i * 0.12}s"`)).join('');
    const pc = pick != null && /^\d+$/.test(pick) ? rw.cards[+pick] : null;
    const legend = open ? pickLegend('rw-one', pc ? pseudo(pc.id, pc.up) : null) : '';
    const tookCard = rw.cardTaken && rw.cardTakenIdx >= 0;
    const cardTitle = open ? (rw.keepsakeChoices.length ? 'Choose one: a card for your deck' : 'Choose a card for your deck') : tookCard ? 'Added to your deck' : rw.keepsake ? 'Cards left behind' : 'Card skipped';
    const ksTitle = open ? 'or the keepsake' : rw.keepsake ? 'Keepsake taken' : 'Keepsake left behind';
    const ks = rw.keepsakeChoices.length ? `<div class="panel dread-or"><h3>${ksTitle}</h3><div class="shop-row">${ksTiles(rw.keepsakeChoices, rw.keepsake, 'rw-one', !open && !rw.keepsake, pick)}</div></div>` : '';
    const buttons = open
      ? `<button class="btn ghost" data-act="rewardcard" data-i="">Skip ${rw.keepsakeChoices.length ? 'both' : 'the card'} (+${E.DECLINE_SCORE.eliteCard} score)</button>${pickOkBtn('rw-one', pick, 'wide')}`
      : '<button class="btn primary wide" data-act="tomap" autofocus>Continue</button>';
    screenEl.innerHTML = `<div class="run-screen">${hudHTML()}<div class="run-body"><div class="scene" style="background-image:url(img/bg/${E.band(run).bg}.webp)"><div class="scene-inner reward-screen">
      <h1>Victory</h1>
      ${summary}
      <div class="dread-pick"><section class="reward-main"><h2>${cardTitle}</h2><div class="card-row reward-cards">${cards}</div>${legend}</section>
      ${ks}</div>
      <div class="row-buttons">${buttons}</div>
    </div></div></div></div>`;
    const f = $('[autofocus]', screenEl) || $('.picked', screenEl) || $('.card.choice', screenEl);
    if (f && ui.lastPointer !== 'touch') f.focus({ preventScroll: true });
  }

  /* ----- Rest ----- */
  /* An HP bar with the healing to come in a lighter colour: `heal` HP onto `hp` of `max`. */
  const hpGainBar = (hp, heal, max) => `<span class="hp-gain" aria-hidden="true"><i style="width:${(hp / max) * 100}%"></i><i class="add" style="left:${(hp / max) * 100}%;width:${(heal / max) * 100}%"></i></span>`;
  // the lantern's light flickers over a rest's picture, and motes drift up through it (still with reduced motion)
  const restGlow = '<div class="rest-glow" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>';
  function renderRest() {
    if (run.passage || run.pocket) return renderStair();
    const amt = E.restAmount(run), heal = Math.min(amt, run.maxHp - run.hp);
    const done = run.restDone;
    const body = done
      ? `<p class="lead outcome">${run.restMsg || 'You gather your strength.'}</p><button class="btn primary" data-act="tomap" autofocus>Continue the descent</button>`
      : `<div class="choice-list">
          <button class="choice with-ic" data-act="rest" autofocus><span class="ch-ic">${ICON.rest}</span><span class="ch-txt"><b>Rest by the lantern</b><span>${heal ? `Heal ${heal} HP: ${run.hp} &rarr; ${run.hp + heal} of ${run.maxHp}.` : 'You are already at full health.'}</span>${heal ? hpGainBar(run.hp, heal, run.maxHp) : ''}</span></button>
          <button class="choice with-ic" data-act="refit" ${E.upgradeable(run).length ? '' : 'disabled'}><span class="ch-ic">${STAIR_ICON.refit}</span><span class="ch-txt"><b>Refit your gear</b><span>Upgrade a card in your deck.</span></span></button>
          <button class="choice with-ic" data-act="sea" ${run.keepsakes.length ? '' : 'disabled'}><span class="ch-ic">${STAIR_ICON.sea}</span><span class="ch-txt"><b>Give a keepsake to the sea</b><span>${run.keepsakes.length ? `It is gone, with its Roil. The sea pays for it: ${SEA_PAYS}, and refit a card.` : 'You carry no keepsake.'}</span></span></button>
        </div>`;
    screenEl.innerHTML = `<div class="run-screen">${hudHTML()}<div class="run-body"><div class="scene rest-scene" style="background-image:url(img/scenes/rest.webp)">${restGlow}<div class="scene-inner">
      <h1>Sheltered Cove</h1>
      <p class="lead">A dry hollow above the tide line. The lantern burns steady here, and for a little while the deep cannot reach you.</p>
      ${body}
    </div></div></div></div>`;
    const f = $('[autofocus]', screenEl);
    if (f) f.focus({ preventScroll: true });
  }

  /* ----- The stair down between levels (v0.31.0): two of six (five until v0.35.0), each once (E.stairDo). It is bigger than a Cove and
     looks it (the user: "more alternatives than in-level rest, and *feel* stronger"): the way down so far, the level
     ahead as its title, and the five as cards. A level's `stairArt` (img/scenes) is its picture; without one, the Cove's. ----- */
  const STAIR_ICON = {
    rest: ICON.rest,
    refit: svg('<path d="M13.4 2.8 21.2 10.6l-2.4 2.4-1.8-1.8-8.6 8.6a2.2 2.2 0 0 1-3.1-3.1l8.6-8.6-1.8-1.8z"/>'),
    shed: svg('<rect x="3.5" y="2.5" width="11.5" height="15.5" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14.6 14.6l6 6M20.6 14.6l-6 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
    flask: svg('<path d="M9.5 2.5h5v2h-.8v4l4.9 8.3A3.4 3.4 0 0 1 15.7 22H8.3a3.4 3.4 0 0 1-2.9-5.2l4.9-8.3v-4h-.8z" opacity=".4"/><path d="M7.3 15.2h9.4l1.3 2.3A2.3 2.3 0 0 1 16 21H8a2.3 2.3 0 0 1-2-3.5z"/>'),
    cache: ICON.treasure,
    fog: ICON.event,
    sea: svg('<path d="M12 2.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 7.8l5-.7z" opacity=".9"/><path d="M2.5 19.5c2-2.6 4.3-2.6 6.3 0s4.4 2.6 6.4 0c1.6-2 3.4-2.4 6.3-.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
    done: svg('<path d="M4.5 12.5l5 5 10-11" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>'),
  };
  const STAIR_TEXT = {
    rest: (done) => {
      const h = done ? 0 : Math.min(E.stairRestAmount(run), run.maxHp - run.hp);
      return ['Rest', `${h ? `Heal ${h} HP: ${run.hp} &rarr; ${run.hp + h} of ${run.maxHp}. ` : ''}${Math.round(E.STAIR_REST * 100)}% of your Max HP, as at a Cove.`, h ? hpGainBar(run.hp, h, run.maxHp) : ''];
    },
    refit: () => ['Refit your gear', 'Upgrade a card in your deck.'],
    shed: () => ['Shed a card', `Leave a card ${run.pocket ? 'under the bell' : 'on the stair'}, for good. Free: Barnaby charges Pearls for it.`],
    flask: (done) => {
      // up to E.STAIR_FLASKS of the empty slots (v0.36.0; every empty one before)
      const n = done ? 0 : Math.min(E.STAIR_FLASKS, run.tonics.filter((t) => !t).length);
      return ['Fill your flasks', `${run.pocket ? 'Brinelight gathers in the bell\'s crown' : 'Brinelight drips from the rock here'}. Fill up to ${E.STAIR_FLASKS} empty flasks${n ? `: <b>${n} random tonic${n > 1 ? 's' : ''}</b>, no two alike` : ' with random tonics'}.`];
    },
    cache: () => ["The keepers' cache", E.stairCacheOpen(run) ? 'Open: choose your card.' : 'The keepers before you left cards in the wall. Open it and take 1 of 3, uncommon or rare. Opening it uses this pick.'],
    fog: () => ['Swim out into the dark', 'Leave the air and see what the Belfry hides: one of its Fog events.'],
    sea: () => ['Give one to the sea', `Throw a keepsake into the water. It is gone, with its Roil, and the sea pays for it: ${SEA_PAYS}, and refit a card.`],
  };
  function stairTrack(lv) {
    return `<ol class="stair-track" aria-label="The way down">${E.LEVELS.map((L, i) => `<li class="${i < lv ? 'past' : i === lv ? 'here' : ''}${levelKnown(i) ? '' : ' unknown'}"><span class="dot">${i < lv ? STAIR_ICON.done : ''}</span><b${levelKnown(i) ? '' : ' aria-label="Not found yet"'}>${levelKnown(i) ? L.name : '?'}</b></li>`).join('')}</ol>`;
  }
  function renderStair() {
    const lv = run.level || 0, s = E.stairState(run), picks = E.stairPicks(run), left = picks - s.picks.length;
    let first = true;
    const cards = E.stairOptions(run).map((id, i) => {
      const why = E.stairWhy(run, id), done = why === 'done', [name, desc, extra] = STAIR_TEXT[id](done);
      const note = done ? '<em class="st-done">Done</em>' : why && why !== 'full' ? `<em class="reason">${why}</em>` : '';
      const focus = !why && first ? ' autofocus' : '';
      if (!why) first = false;
      return `<button class="stair-opt${done ? ' done' : ''}" data-act="stairdo" data-id="${id}" style="--i:${i}"${why ? ' disabled' : ''}${focus}>
        <span class="so-ic">${done ? STAIR_ICON.done : STAIR_ICON[id]}</span><b>${name}</b><span class="so-desc">${desc}</span>${extra || ''}${note}</button>`;
    }).join('');
    const log = (s.log || []).map((l) => `<li>${l}</li>`).join('');
    const B = E.band(run);
    // the five rise into place the first time the stair is seen, not again after each pick
    const key = `${run.seed}:${lv}:${run.pocket ? run.floor : 's'}`, fresh = ui.stairSeen !== key;
    ui.stairSeen = key;
    // under a lesser bell in the Belfry (v0.37.0): the same screen, one pick, its own words
    const pocket = !!run.pocket, last = pocket && run.pos && run.pos.row >= E.mapRows(run) - 1;
    const art = pocket ? (B.pocketArt || B.stairArt || 'rest') : (B.stairArt || 'rest');
    const head = pocket
      ? `<h1 class="stair-title"><small>Landing ${run.floor} of ${E.mapRows(run) + 1}</small>Under a lesser bell</h1>
      <p class="lead">${B.pocket || 'A lesser bell hangs here, and air is caught under it. You come up into the dark inside the bronze and open your helmet.'}</p>`
      : `${stairTrack(lv)}
      <h1 class="stair-title"><small>The stair down</small>Into ${levelName(lv)}</h1>
      <p class="lead">${B.stair || `The broken pin's water has run away down the stair, toward ${levelName(lv)}. Halfway down is a dry hollow above the tide line, the last shelter before the dark.`}</p>`;
    const go = pocket ? (last ? `Swim on to ${bossName()}` : 'Swim on') : `Go down into ${levelName(lv)}`;
    screenEl.innerHTML = `<div class="run-screen">${hudHTML()}<div class="run-body"><div class="scene stair-scene${pocket ? ' pocket' : ''}" style="background-image:url(img/scenes/${art}.webp)">${restGlow}<div class="scene-inner">
      ${head}
      <p class="stair-count">${left ? `Choose <b>${left === 1 ? (picks === 1 ? 'one' : 'one more') : 'two'}</b>${picks > 1 ? ', each once' : ''}.` : pocket ? 'You close your helmet.' : 'You are ready to go down.'}</p>
      <div class="stair-grid${fresh ? ' fresh' : ''}">${cards}</div>
      ${log ? `<ul class="stair-log">${log}</ul>` : ''}
      <button class="btn ${left ? 'ghost' : 'primary'} stair-go" data-act="tomap"${left ? '' : ' autofocus'}>${go}${left ? ` <small>(${left} unused)</small>` : ''}</button>
    </div></div></div></div>`;
    const f = $('[autofocus]', screenEl);
    if (f) f.focus({ preventScroll: true });
    // the keepers' cache was opened and nothing taken (a reload in between): its choice comes back, with no way out
    if (E.stairCacheOpen(run) && overlayEl.hidden) showCache();
  }
  /* The keepers' cache's choice: three cards, or none. It is opened already, so there is no Back (v0.40.0). */
  function showCache() {
    const ids = E.stairCache(run).slice(), s = E.stairState(run);
    showCardChoice(ids, "The keepers' cache", (cid) => {
      const o = E.stairDo(run, 'cache', cid ? ids.indexOf(cid) : -1);
      if (!o) return;
      (s.log = s.log || []).push(o.card ? `From the keepers' cache you take ${E.cardName(o.card)}.` : "You leave the keepers' cards in the wall.");
      sfx(o.card ? 'treasure' : 'select');
      save();
      render();
    }, 'Take none');
  }
  // one of the stair's six: refit and shed pick a card first (Back from that picker costs nothing; the cache has none)
  function stairDo(id) {
    const s = E.stairState(run);
    const done = (o, line, sound) => { if (!o) return; (s.log = s.log || []).push(line(o)); sfx(sound); save(); render(); };
    if (id === 'rest') done(E.stairDo(run, 'rest'), (o) => `You sleep deep beside the lantern and wake mended: ${o.healed} HP.`, 'buff');
    else if (id === 'fog') { if (E.stairDo(run, 'fog')) { sfx('step'); save(); render(); } }
    else if (id === 'flask') done(E.stairDo(run, 'flask'), (o) => `You fill ${o.tonics.length > 1 ? `${o.tonics.length} flasks` : 'a flask'} with brinelight: ${o.tonics.map((t) => BL.TONICS[t].name).join(', ')}.`, 'tonic');
    else if (id === 'refit') {
      ui.allowCancelPick = true;
      showDeck('upgrade', (uid) => done(E.stairDo(run, 'refit', uid), (o) => `You refit by lantern light: ${E.cardName(o.card)} is ready.`, 'buff'));
    } else if (id === 'shed') {
      ui.allowCancelPick = true;
      showDeck('remove', (uid) => done(E.stairDo(run, 'shed', uid), (o) => `You leave ${E.cardName(o.card)} ${run.pocket ? 'under the bell' : 'on the stair'}.`, 'douse'));
    } else if (id === 'cache') {
      // opening it uses the pick; the three are saved with it, so a reload shows the same choice again
      if (!E.stairCacheOpen(run) && !E.stairDo(run, 'cache')) return;
      save();
      render(); // the stair shows the pick used, and then the choice opens over it
    } else if (id === 'sea') {
      showSea((k, uid) => done(E.stairDo(run, 'sea', { k, uid }), seaLine, 'douse'));
    }
  }

  /* ----- Give one to the sea (v0.35.0; E.giveToSea, and the stair's sixth): choose the keepsake, then the card to
     refit. Back from either costs nothing. `go(k, uid)` does it; uid is null when no card can be upgraded. ----- */
  const seaLine = (o) => `You give the ${BL.KEEPSAKES[o.keepsake].name} to the sea. ${o.healed ? `It gives back ${o.healed} HP` : 'You had no wound for it to mend'}${o.card ? `, and ${E.cardName(o.card)} is ready` : ''}.`;
  function showSea(go) {
    ui.seaGo = go;
    const ch = E.charge(run), h = E.hold(run), now = E.roil(run);
    const tiles = run.keepsakes.map((k) => {
      const K = BL.KEEPSAKES[k], pay = E.seaHeal(run, k), heal = Math.min(pay, Math.max(0, run.maxHp - (k === 'biscuit' ? 10 : 0) - run.hp)), n = E.carried(run, k);
      const after = E.roilFor(ch - K.charge, h);
      return `<div class="shop-tile ks-pick sea-pick" tabindex="0" role="button" data-act="seapick" data-k="${k}" aria-label="Give the ${K.name}, Roil ${K.charge}, to the sea">
        <span class="medal"><img src="img/icons/${K.art}.webp" alt=""></span><b>${K.name}</b><span class="k-charge">Roil ${K.charge}</span><small>${K.desc}</small>
        <span class="k-after sea-pay">Carried ${n} fight${n === 1 ? '' : 's'}: heal ${pay}${heal < pay ? ` (${heal} now)` : ''} HP, refit a card</span>
        <span class="k-after">Then ${ch - K.charge}/${h}${after.steps ? `: ${roilWords(after, true)}` : now.steps ? ': Calm' : ''}</span>
        ${E.wasBrought(run, k) ? `<span class="k-deep">${run.takenOut ? 'From the Lazaret: gone from there too' : 'Stays in the Lazaret'}</span>` : ''}</div>`;
    }).join('');
    const body = `<p class="buy-left">Choose a keepsake to throw into the water. It is gone for this expedition, and what it did for you goes with it. The sea pays back the brinelight it soaked up while you carried it: <b>${E.SEA_HEAL} HP for each fight you won</b> with it (never more than a Cove's rest, ${E.restAmount(run)} HP), and you <b>refit a card</b>.${now.steps ? ` You carry ${ch} of your Hold of ${h}.` : ''}</p>
      <div class="shop-row sea-row">${tiles}</div>`;
    openOverlay(modal('Give one to the sea', body, '<button class="btn primary" data-act="close" autofocus>Keep them all</button>', 'sea-modal'));
  }
  function seaPicked(k) {
    const go = ui.seaGo;
    closeOverlay(true);
    if (!go || !E.has(run, k)) return;
    if (!E.upgradeable(run).length) { go(k, null); return; }
    ui.allowCancelPick = true;
    showDeck('upgrade', (uid) => go(k, uid));
  }

  /* ----- After a pin: go home or go deeper ----- */
  function renderPin() {
    const B = E.band(run), lv = run.level || 0, next = E.LEVELS[lv + 1];
    const found = E.foundKeepsakes(run);
    // the Belfry's stair needs the diving dress: the first time, it hangs above the stair, to be carried home
    const can = E.canGoDeeper(run), kit = next.needs ? BL.KIT[next.needs] : null;
    const newKit = !can && run.found && !E.ownsKit(meta, run.found);
    const shut = can ? '' : newKit
      ? `<p class="lead found-kit">${gearArt(kit)}<span>On the wall above the stair hangs an old keeper's diving dress, with a sealed lamp on its helmet. Its seams have rotted and its lamp is dry. Carry it home and mend it, and you can wear it down next time.</span></p>`
      : `<p class="lead">Your ${kit.name} is at home on its hook. Without it you cannot go down into ${levelName(lv + 1)}.</p>`;
    const extra = (newKit ? [`the <b>${kit.name}</b>`] : []).concat(found.map((k) => `<b>${BL.KEEPSAKES[k].name}</b>`));
    // a debug-cheated run carries nothing home (no dress, no keepsakes for the Lazaret): say so here, not only after
    const dbgNote = run.cheated && (newKit || found.length)
      ? `<p class="lead dbg-note"><b>Debug run:</b> a run that used a cheat carries nothing home, ${newKit ? 'not even the dress' : 'not even its keepsakes'}. To keep what you find, turn on <b>Cheats count as real runs</b> in the debug panel before you set out, or use <b>Own all kit</b>.</p>` : '';
    const homeKeeps = run.cheated ? '' : extra.length ? `, ${extra.join(', ')} too` : '';
    const deeper = can
      ? `<button class="choice" data-act="godeeper" autofocus><b>Go deeper</b><span>Down the stair into ${levelName(lv + 1)}, with your deck, keepsakes and HP. The stair down comes first: two of six, stronger than a Cove. Each landing there scores ${next.landing}.${E.deepestReachable(run) === lv + 1 && lv + 1 < E.LEVELS.length - 1 ? ` Below it the stair runs under the sea, and you have nothing to dive in: its pin is as deep as this expedition can go.` : ''}${E.holdAt(lv + 1) > E.hold(run) ? ` The first time you reach it, your Hold grows to ${E.holdAt(lv + 1)}, for good.` : ''}</span></button>`
      : `<button class="choice" disabled><b>Go deeper</b><span>${levelName(lv + 1).replace(/^t/, 'T')} is under the sea. Wear the ${kit.name} (${BL.KIT_PLACES.find((pl) => pl.id === kit.place).name} place) to go down.</span></button>`;
    screenEl.innerHTML = `<div class="run-screen">${hudHTML()}<div class="run-body"><div class="scene" style="background-image:url(img/bg/${B.bossBg}.webp)"><div class="scene-inner">
      <h1>The pin is broken</h1>
      <p class="lead">${B.pin}</p>
      ${shut}
      ${dbgNote}
      <div class="choice-list">
        ${deeper}
        <button class="choice" data-act="gohome"${can ? '' : ' autofocus'}><b>Go home</b><span>End the expedition here${run.cheated ? '' : ' and keep what you carry'}${homeKeeps}. Each HP you have left adds 5 to the score.</span></button>
      </div>
    </div></div></div></div>`;
    const f = $('[autofocus]', screenEl);
    if (f) f.focus({ preventScroll: true });
    playScene('pin:' + lv); // the first time this pin breaks, its story scene plays over the choice
  }

  /* ----- Shop ----- */
  function renderShop() {
    const s = run.shop;
    const priceTag = (base, extra) => {
      const p = E.price(run, base);
      return `<span class="price${run.pearls < p ? ' cant' : ''}">${ICON.pearl}${p}${extra || ''}</span>`;
    };
    const cards = s.cards.map((it, i) => `<div class="shop-item${it.sold ? ' sold' : ''}">
        ${staticCard(pseudo(it.id), 'choice', it.sold ? '' : `tabindex="0" role="button" data-act="buy" data-kind="cards" data-i="${i}"`)}
        <div>${priceTag(it.base)} ${it.sale ? '<span class="sale-tag">SALE</span>' : ''}</div></div>`).join('');
    const tile = (kind, it, i, def) => `<div class="shop-tile${it.sold ? ' sold' : ''}" tabindex="0" role="button" data-act="buy" data-kind="${kind}" data-i="${i}" aria-label="Buy ${def.name}">
        <span class="medal"><img src="img/icons/${def.art}.webp" alt=""></span><b>${def.name}</b>${kind === 'keepsakes' ? `<span class="k-charge">Roil ${def.charge}</span>` : ''}<small>${def.desc}</small>${kind === 'keepsakes' && def.deep ? `<span class="k-deep">From ${E.LEVELS[def.deep].the}</span>` : ''}${it.sold ? '<span class="muted">Sold</span>' : priceTag(it.base)}${kind === 'keepsakes' && !it.sold ? chargeAfter(it.id) : ''}</div>`;
    const ks = s.keepsakes.map((it, i) => tile('keepsakes', it, i, BL.KEEPSAKES[it.id])).join('');
    const ts = s.tonics.map((it, i) => tile('tonics', it, i, BL.TONICS[it.id])).join('');
    const rp = E.removePrice(run);
    const remove = `<div class="shop-tile${s.removed ? ' sold' : ''}" tabindex="0" role="button" data-act="shopremove" aria-label="Remove a card">
        <span class="medal" style="display:grid;place-items:center;color:#f1e6cf">${ICON.sunk}</span><b>Scrub a card</b><small>Remove a card from your deck. Once per visit. The price rises by ${E.REMOVE_STEP} each time, to at most ${E.REMOVE_MAX}.</small>${s.removed ? '<span class="muted">Done</span>' : `<span class="price${run.pearls < rp ? ' cant' : ''}">${ICON.pearl}${rp}</span>`}</div>`;
    const lines = ['"Pearls for wares, keeper. Fair trades only, no haggling, no biting."', '"Mind the shell. The shop is also my house."', '"Everything here came down with a wreck. Everything still works. Mostly."'];
    const line = lines[(run.floor + run.seed) % lines.length];
    screenEl.innerHTML = `<div class="run-screen">${hudHTML()}<div class="run-body"><div class="scene" style="background-image:url(img/bg/${E.band(run).bg}.webp)"><div class="scene-inner">
      <div class="trader"><img src="img/units/trader.webp" alt="Barnaby the hermit crab trader"><div class="speech"><b>Barnaby's Drifting Emporium</b><br>${line}</div>
        <button class="btn small" data-act="tomap" style="align-self:flex-start">Leave</button></div>
      <div class="panel"><h3>Cards</h3><div class="shop-grid">${cards}</div>${keywordLegend(s.cards.map((it) => pseudo(it.id)))}</div>
      <div class="panel"><h3>Keepsakes, tonics and services</h3><div class="shop-row">${ks}${ts}${remove}</div></div>
      <button class="btn primary" data-act="tomap">Leave the shop</button>
    </div></div></div></div>`;
  }

  /* ----- Event ----- */
  function renderEvent() {
    const ev = E.eventDef(run);
    const st = run.event;
    let body;
    if (st.stage === 'choose') {
      body = `<div class="choice-list">${ev.options.map((o, i) => {
        const ok = E.optionAvailable(run, o);
        return `<button class="choice" data-act="evopt" data-i="${i}" ${ok === true ? '' : 'disabled'}><b>${o.label}</b><span>${o.desc}${o.decline ? ` +${E.DECLINE_SCORE.event} score.` : ''}</span>${ok === true ? '' : `<span class="reason">${ok}</span>`}</button>`;
      }).join('')}</div>`;
    } else {
      body = `<p class="lead">${st.text}</p>${st.outcome ? `<p class="lead outcome">${st.outcome}</p>` : ''}<button class="btn primary" data-act="evcontinue" autofocus>Continue</button>`;
    }
    screenEl.innerHTML = `<div class="run-screen">${hudHTML()}<div class="run-body"><div class="scene"><div class="scene-inner">
      <div class="event-art" style="background-image:url(img/scenes/${ev.art}.webp)"></div>
      <h1>${ev.title}</h1>
      ${st.stage === 'choose' ? `<p class="lead">${typeof ev.text === 'function' ? ev.text(run) : ev.text}</p>` : ''}
      ${body}
    </div></div></div></div>`;
    const f = $('[autofocus]', screenEl) || $('.choice:not([disabled])', screenEl);
    if (f && ui.lastPointer !== 'touch') f.focus({ preventScroll: true });
    if (st.stage === 'result' && st.next && !st.resolved) resolveEventNext();
  }

  function resolveEventNext() {
    const st = run.event;
    const next = st.next;
    // the result screen then says what happened, under the event's own text
    const done = (outcome) => { st.resolved = true; if (outcome) st.outcome = outcome; save(); render(); };
    const nameOf = (uid) => { const c = run.deck.find((x) => x.uid === uid); return c ? E.cardName(c) : 'The card'; };
    if (next.pick === 'remove') {
      if (!run.deck.length) return done();
      ui.allowCancelPick = false;
      showDeck('remove', (uid) => { const n = nameOf(uid); E.removeCard(run, uid); done(`${n} is gone from your deck.`); });
    } else if (next.pick === 'duplicate') {
      ui.allowCancelPick = false;
      showDeck('duplicate', (uid) => { const n = nameOf(uid); E.duplicateCard(run, uid); done(`A second ${n} joins your deck.`); });
    } else if (next.pick === 'upgrade') {
      if (!E.upgradeable(run).length) return done();
      ui.allowCancelPick = false;
      showDeck('upgrade', (uid) => { const n = nameOf(uid); E.upgradeCard(run, uid); done(`${n} is now ${nameOf(uid)}.`); });
    } else if (next.cards) {
      showCardChoice(next.cards, 'Choose a card', (id) => {
        E.takeEventCard(run, id);
        done(id ? `${BL.CARDS[id].name} joins your deck.` : 'You leave the cards where they are.');
      });
    } else if (next.fight) {
      st.resolved = true;
      // fight starts when the player presses Continue
    }
  }

  function eventContinue() {
    const st = run.event;
    if (st.next && st.next.fight) {
      const bonus = st.next.bonusPearls || 0;
      run.event = null;
      E.startCombat(run, st.next.fight, null, { bonusPearls: bonus });
      save();
      render();
      return;
    }
    if (st.next && !st.resolved) { resolveEventNext(); return; }
    E.backToMap(run);
    save();
    render();
  }

  /* ----- Treasure ----- */
  function renderTreasure() {
    const t = run.treasure;
    let body;
    if (!t.opened) {
      body = `<p class="lead">A sea chest, half buried, banded in iron gone green. Something inside is still glowing.</p><button class="btn primary" data-act="opentreasure" autofocus>Pry it open</button>`;
    } else {
      const k = t.keepsake ? BL.KEEPSAKES[t.keepsake] : null;
      const hasChoices = t.choices && t.choices.length;
      // like the Dread reward: the chest stays open where it was after the pick
      const picking = hasChoices && !k && !t.keepsakeLeft;
      const tPick = picking ? pickOf('tr-ks', t) : null;
      const choices = hasChoices
        ? `<div class="panel"><h3>${k ? 'You take the ' + k.name + '.' : t.keepsakeLeft ? 'You leave the keepsakes in the chest.' : `${t.choices.length === 1 ? 'A keepsake glints' : `${['Two', 'Three', 'Four'][t.choices.length - 2] || t.choices.length} keepsakes glint`} in the chest. Take one?`}</h3><div class="shop-row">${ksTiles(t.choices, t.keepsake, 'tr-ks', t.keepsakeLeft, tPick)}</div>${picking ? leaveKsBtn() : ''}</div>` : '';
      body = `<div class="reward-list">
        <div class="reward-item done"><span class="medal" style="display:grid;place-items:center">${ICON.pearl}</span><div class="grow"><b>${t.pearls} Pearls</b></div></div>
        ${k && !hasChoices ? `<div class="reward-item done"><span class="medal"><img src="img/icons/${k.art}.webp" alt=""></span><div class="grow"><b>Keepsake: ${k.name}</b><small>${k.desc}</small></div></div>` : ''}
      </div>${choices}${picking ? pickOkBtn('tr-ks', tPick) : '<button class="btn primary" data-act="tomap" autofocus>Continue</button>'}`;
    }
    screenEl.innerHTML = `<div class="run-screen">${hudHTML()}<div class="run-body"><div class="scene"><div class="scene-inner">
      <div class="chest" style="background-image:url(img/scenes/treasure.webp)"></div>
      <h1>A Wreck's Last Cargo</h1>${body}</div></div></div></div>`;
    const f = $('[autofocus]', screenEl);
    if (f) f.focus({ preventScroll: true });
  }

  /* ----- The Toll (v0.41.0) ----- */
  /* What a toll asks on a level: "5 HP, 20 Pearls or a Barnacle Growth" (`short`: no Barnacle). */
  function tollText(lv, short) {
    const t = E.TOLL[Math.min(E.TOLL.length - 1, lv)];
    return short ? `${t.hp} HP or ${t.pearls} Pearls` : `${t.hp} HP, ${t.pearls} Pearls or a Barnacle Growth in your deck`;
  }
  function renderToll() {
    const t = run.toll, c = E.tollOf(run), T = BL.TOLL;
    const body = t.paid
      ? `<p class="lead">${T.ways[t.paid].paid}</p><button class="btn primary" data-act="tomap" autofocus>Continue</button>`
      : `<p class="lead">${T.text}</p>
        <div class="choice-list">${E.TOLL_WAYS.map((w) => {
          const ok = E.tollCan(run, w);
          return `<button class="choice" data-act="toll" data-way="${w}" ${ok === true ? '' : 'disabled'}><b>${T.ways[w].label}</b><span>${T.ways[w].desc(c)}</span>${ok === true ? '' : `<span class="reason">${ok}</span>`}</button>`;
        }).join('')}</div>`;
    screenEl.innerHTML = `<div class="run-screen">${hudHTML()}<div class="run-body"><div class="scene"><div class="scene-inner">
      <div class="event-art" style="background-image:url(img/scenes/ev_toll.webp)"></div>
      <h1>${T.title}</h1>${body}</div></div></div></div>`;
    const f = $('[autofocus]', screenEl) || $('.choice:not([disabled])', screenEl);
    if (f && ui.lastPointer !== 'touch') f.focus({ preventScroll: true });
  }

  /* ----- End screens ----- */
  function fmtTime(ms) {
    const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  /* How the final score adds up, line by line (runs finished before v0.16.0 kept no lines). */
  function scorePartsHTML(fin) {
    const sp = fin.parts;
    if (!sp || !sp.parts.length) return '';
    const row = (label, how, pts, cls) => `<div${cls ? ` class="${cls}"` : ''}><dt>${label}${how ? ` <small>${how}</small>` : ''}</dt><dd>${pts}</dd></div>`;
    const rows = sp.parts.map((p) => row(p.label, p.n != null && p.each ? `${p.n} &times; ${p.each}` : p.n ? `${p.n}` : '', `+${p.pts}`));
    if (sp.mult !== 1) rows.push(row(`Currents: ${E.currents(run).map((k) => E.CURRENTS[k].name).join(', ')}`, `${sp.sum} &times; ${sp.mult}`, `+${sp.total - sp.sum}`, 'mult'));
    rows.push(row('Score', '', sp.total, 'sum'));
    return `<details class="score-parts" open><summary>How the score adds up</summary><dl>${rows.join('')}</dl></details>`;
  }
  /* What the end of a run did to the Lazaret. */
  function lazaretHTML(fin) {
    const z = fin.laz;
    if (z) {
      const parts = [];
      if (z.opened) parts.push('<b>Hester gives you the key to the Lazaret.</b> It is the locked store room at the lighthouse, on the title screen. Keepsakes kept there are yours until you take them down again, and you choose which to bring on each descent.');
      if ((z.added || []).length) parts.push(`Into the Lazaret: ${ksNames(z.added)}.${z.kept.length && z.kept.length < z.added.length ? ` New there: ${ksNames(z.kept)}.` : ''}`);
      // kit found on the expedition (the diving dress) is mended at home and joins the Workshop
      const kit = (z.found || []).map((id) => `<div class="unlock-box found-kit">${gearArt(BL.KIT[id])}<span><b>You carried home the ${BL.KIT[id].name}.</b> You mend it at the lighthouse. Wear it in your ${BL.KIT_PLACES.find((pl) => pl.id === BL.KIT[id].place).name} place, and the stair below Dark Water is open.</span></div>`).join('');
      return kit + (parts.length ? `<button class="unlock-box lz-box" data-act="lazaret">${parts.join(' ')}</button>` : '');
    }
    if (fin.lost && fin.lost.length) {
      /* v0.36.0, the user: "Maybe can choose to keep one keepsake at defeat". Wren holds on to one of them (E.keepOnFall),
         chosen here before she leaves this screen; the rest the bell calls back. */
      const kept = run.keptOnFall, gone = fin.lost.filter((k) => k !== kept);
      const brought = run.takenOut && (run.brought || []).some((k) => gone.indexOf(k) >= 0) ? ` ${kept ? 'The others' : 'The ones'} you brought from the Lazaret are gone from there too.` : '';
      if (!kept && !run.cheated && lazaretOpen()) {
        const pick = pickOf('fall-ks', run);
        return `<div class="unlock-box lz-box lost lz-keep"><p><b>The bell calls back every keepsake you carried.</b> Hold on to one, and it goes into the Lazaret. Choose before you leave this screen.${brought} What you left in the Lazaret is safe.</p>
          <div class="shop-row">${ksTiles(fin.lost, null, 'fall-ks', false, pick)}</div><div class="ks-actions">${pickOkBtn('fall-ks', pick, 'small')}</div></div>`;
      }
      const held = kept ? `You held on to the <b>${BL.KEEPSAKES[kept].name}</b>: it is in the Lazaret. ` : '';
      return `<div class="unlock-box lz-box lost">${held}${gone.length ? `The bell calls back ${kept ? 'the rest' : 'every keepsake you carried'}: ${ksNames(gone)}.${brought}` : ''} What you left in the Lazaret is safe.</div>`;
    }
    return '';
  }
  function renderEnd(win) {
    E.tick(run);
    const st = run.stats;
    if (!run.final) {
      const parts = E.scoreParts(run, win);
      const score = parts.total;
      const best = getNum(BEST_KEY);
      const fin = { score, parts, best, newBest: score > best, salvage: 0 };
      if (run.cheated) fin.newBest = false; // a run with debug cheats keeps no best score
      if (fin.newBest) setNum(BEST_KEY, score);
      if (!run.tutorial) {
        checkUnlocks(true);
        fin.salvage = E.earnSalvage(meta, score);
        // the Lazaret: coming home keeps what Wren carries, a fall loses it (a debug-cheated run keeps nothing)
        const curOpen = E.currentsOpen(meta);
        if (!run.cheated) E.recordRun(meta, run, win); // the logbook
        fin.currents = !curOpen && E.currentsOpen(meta);
        const wasOpen = lazaretOpen();
        if (win && !run.cheated) fin.laz = E.carryHome(meta, run);
        else if (!win && wasOpen) { fin.lost = E.lostKeepsakes(run); E.storeKeepsakes(meta, run); } // the fall: what was chosen and is gone is no longer chosen
        if (fin.laz) fin.laz.opened = !wasOpen;
        saveMeta();
      }
      fin.story = noteStory().map((en) => en.title);
      run.final = fin;
      fin.tell = !run.tutorial; // what just opened is told in a window, once this screen is drawn
    }
    const fin = run.final;
    // the score's own lines are in the breakdown; these are the rest of the run
    const stats = [
      ['Landings', E.landed(run).reduce((a, n) => a + (n || 0), 0)], ['Fights won', st.fights], ['Damage dealt', st.dmgDealt], ['Deck size', run.deck.length], ['Time', fmtTime(st.elapsed)],
    ].map((s) => `<div><b>${s[1]}</b><span>${s[0]}</span></div>`).join('');
    // on a wide screen the score and its lines sit side by side, so the buttons stay near the top
    const scoreHTML = `<div class="score-row"><div class="score-box"><span>Score</span><b>${fin.score}</b>${fin.newBest ? '<em>New best!</em>' : fin.best ? `<small>Best ${fin.best}</small>` : ''}${run.cheated ? '<small>Debug run: no best score, and nothing carried home</small>' : ''}</div>
      ${scorePartsHTML(fin)}</div>
      ${fin.currents ? `<div class="unlock-box"><b>Currents are open.</b> Choose them on shore before your next expedition: each makes it harder and raises your score.</div>` : ''}
      ${run.tutorial ? '' : `<div class="salvage-box">${ICON.salvage}<span><b>+${fin.salvage} ${MT.currency}</b>, 1 for every ${E.SALVAGE_PER_SCORE} score (${fin.score} &divide; ${E.SALVAGE_PER_SCORE}, rounded down). Spend it in the ${MT.shop} on the title screen. You have ${meta.salvage}.</span></div>`}
      ${lazaretHTML(fin)}
      ${fin.story && fin.story.length ? `<button class="unlock-box story-new" data-act="story">New in Story so far: ${fin.story.map((t) => `<b>${t}</b>`).join(', ')}. <u>Read it</u></button>` : ''}
      ${run.unlocks && run.unlocks.length ? `<div class="unlock-box">Unlocked in the ${MT.shop}: ${run.unlocks.map((a) => E.kitFor(a).map((id) => `<b>${BL.KIT[id].name}</b>`).join(', ')).join(', ')}.</div>` : ''}`;
    const title = win ? (run.heart ? 'The Lantern Heart rises' : run.quieted ? 'The Belfry is quiet' : 'Home with your haul') : 'The tide takes you';
    const text = win
      ? (run.heart ? E.band(run).win : run.quieted ? E.band(run).quiet : `You climb back up the drained stairs with everything you carry, and Bosun runs ahead to tell Hester. Behind you the bells start again, and the water creeps back over the landings. ${run.heartHome ? 'The great light turns over the town' : 'The lighthouse is still dark'}, and you know the way down now.`)
      : `The cold water closes over your lantern, and you go under. Past the bell's reach the sea gives you back, and Bosun hauls you up out of the surf by your collar. ${run.heartHome ? 'The great light still turns over the town.' : 'The lighthouse is still dark, and the water has risen a little higher toward the town.'}`;
    /* v0.44.0: Hester and Bosun on the end screens. Bringing the Heart home shows her on the gallery as the light turns;
       coming home shows her in the doorway with Bosun running ahead, the lamp lit once the Heart is home; a fall shows
       Bosun bringing Wren out of the surf (the first fall's story scene). */
    const endArt = win ? (run.heart ? 'scenes/sc_heart3' : run.heartHome ? 'scenes/end_home_lit' : 'scenes/end_home') : 'scenes/sc_fall';
    const endPos = { 'scenes/sc_heart3': '45% center', 'scenes/sc_fall': '58% center' }[endArt] || '55% center'; // where the people are, on a phone
    // no HUD on the end screens, so the dimming layer starts at the very top (--hud-h: 0)
    screenEl.innerHTML = `<div class="run-screen" style="--hud-h:0px"><div class="run-body"><div class="scene" style="background-image:url(img/${endArt}.webp);background-position:${endPos}"><div class="scene-inner" style="padding-top:8vh">
      <h1>${title}</h1><p class="lead">${text}</p>
      ${scoreHTML}
      <div class="stats end-stats">${stats}</div>
      <div class="row-buttons"><button class="btn primary" data-act="newrun" autofocus>${win ? 'Go down again' : 'Try again'}</button><button class="btn" data-act="totitle">Title screen</button></div>
    </div></div></div></div>`;
    const f = $('[autofocus]', screenEl);
    if (f) f.focus({ preventScroll: true });
    // coming home with the dress or with the Heart, and the first fall, have a story scene the first time; then what opened is told
    if (fin.tell) { fin.tell = false; playScene(win && run.heart ? 'heart' : win && run.quieted ? 'quiet' : fin.laz && (fin.laz.found || []).indexOf('suit') >= 0 ? 'dress' : !win ? 'fell' : '', showNews, win ? 'Home' : 'Go on'); }
  }

  /* ================================================================== *
   *  Click handling (event delegation)
   * ================================================================== */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const act = t.dataset.act;
    if (t.disabled) return;
    handleAct(act, t, e);
  });

  /* Actions that swap or drop the current run wait for an enemy turn to finish first:
     the enemy turn is an async loop over `run`, and changing `run` under it broke it. */
  const SWAPS_RUN = ['totitle', 'confirmabandon', 'tutorial', 'tutskip'];
  function handleAct(act, t, e) {
    if (ui.busy && SWAPS_RUN.indexOf(act) >= 0) {
      closeOverlay(true);
      toast('One moment: finishing the enemy turn');
      const again = () => (ui.busy ? setTimeout(again, 100) : handleAct(act, t, e));
      setTimeout(again, 100);
      return;
    }
    switch (act) {
      case 'close': closeOverlay(); break;
      case 'newsok': E.tellFeatures(meta, ui.news || []); ui.news = null; saveMeta(); closeOverlay(true); break;
      case 'tutorial': closeOverlay(true); Teach.startTutorial(); break;
      case 'tutorialskip': Teach.setStatus('skipped'); closeOverlay(true); prepareDive(); break;
      case 'tutnext': Teach.next(); break;
      case 'tutskip': closeOverlay(true); Teach.endTutorial(false); break;
      case 'tutback': closeOverlay(true); Teach.endTutorial(true); break;
      case 'tutstart': closeOverlay(true); Teach.endTutorial(true); run = null; render(); handleAct('newrun', t, e); break;
      case 'hintok': Teach.closeHint(); Teach.checkHints(); break;
      case 'newrun':
        if (run && loadSave() && run.screen !== 'victory' && run.screen !== 'defeat') {
          openOverlay(modal('Start a new descent?', `<p>Your current run will be lost.${broughtLoss(run)}</p>`, '<button class="btn" data-act="close">Keep playing</button><button class="btn primary" data-act="confirmnew">Start over</button>', 'narrow'));
        } else if (!run && loadSave()) {
          openOverlay(modal('Start a new descent?', `<p>You have a run in progress. Starting over will erase it.${broughtLoss(loadSave())}</p>`, '<button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="confirmnew">Start over</button>', 'narrow'));
        } else beginNewRun();
        break;
      case 'confirmnew': closeOverlay(true); beginNewRun(); break;
      case 'workshop': showWorkshop(); break;
      case 'kitbuy': {
        const id = t.dataset.g, g = BL.KIT[id];
        if (!g || E.ownsKit(meta, id)) break;
        if (meta.salvage < g.price) { toast(`Not enough ${MT.currency}`); break; }
        { const sc = $('.modal-body', overlayEl); ui.kitScroll = sc ? sc.scrollTop : 0; }
        openOverlay(modal(`Buy ${g.name} for ${g.price} ${MT.currency}?`,
          `<div class="buy-item">${gearArt(g)}<div><b>${g.name}</b><p>${g.desc}</p></div></div><p class="buy-left">You have ${meta.salvage} ${MT.currency}; ${meta.salvage - g.price} left after this.</p>`,
          `<button class="btn" data-act="kitback" data-g="${id}">Back</button><button class="btn primary" data-act="kitbuyconfirm" data-g="${id}" autofocus>Buy</button>`, 'narrow'));
        break;
      }
      case 'holdup': {
        const p = E.holdUpPrice(meta), n = meta.holdUp || 0;
        if (p == null) break;
        if (meta.salvage < p) { toast(`Not enough ${MT.currency}: ${E.HOLD_UP_NAMES[n]} costs ${p}`); break; }
        { const sc = $('.modal-body', overlayEl); ui.kitScroll = sc ? sc.scrollTop : 0; }
        openOverlay(modal(`${E.HOLD_UP_NAMES[n]} for ${p} ${MT.currency}?`,
          `<p>Your Hold goes from <b>${E.metaHold(meta)}</b> to <b>${E.metaHold(meta) + E.HOLD_UP.step} Roil</b> on every expedition, for good.</p><p class="buy-left">You have ${meta.salvage} ${MT.currency}; ${meta.salvage - p} left after this.</p>`,
          `<button class="btn" data-act="holdback">Back</button><button class="btn primary" data-act="holdupconfirm" autofocus>Buy</button>`, 'narrow'));
        break;
      }
      case 'holdupconfirm':
      case 'holdback': {
        if (act === 'holdupconfirm' && E.buyHoldUp(meta)) { saveMeta(); sfx('coin'); toast(`Your lantern burns steadier: Hold ${E.metaHold(meta)}.`); if (!run) render(); }
        showWorkshop('[data-act="holdup"]');
        { const sc = $('.modal-body', overlayEl); if (sc) { sc.scrollTop = ui.kitScroll || 0; updateScrollCue(sc); } }
        break;
      }
      case 'kitbuyconfirm':
        if (E.buyKit(meta, t.dataset.g)) {
          // worn straight away when its place is empty
          const pl = BL.KIT[t.dataset.g].place;
          if (!meta.kit[pl]) meta.kit[pl] = t.dataset.g;
          saveMeta();
          sfx('coin');
          if (!run) render();
        }
        // back to the screen the purchase started from, at the same scroll, on the piece just bought
        ui.kitFrom === 'pack' ? showKit(`[data-g="${t.dataset.g}"]`) : showWorkshop(`[data-g="${t.dataset.g}"]`);
        { const sc = $('.modal-body', overlayEl); if (sc) { sc.scrollTop = ui.kitScroll || 0; updateScrollCue(sc); } }
        break;
      case 'kitback':
        ui.kitFrom === 'pack' ? showKit(`[data-g="${t.dataset.g}"]`) : showWorkshop(`[data-g="${t.dataset.g}"]`);
        { const sc = $('.modal-body', overlayEl); if (sc) { sc.scrollTop = ui.kitScroll || 0; updateScrollCue(sc); } }
        break;
      case 'kitslot': {
        ui.kitSlot = t.dataset.place;
        redrawKit(`[data-act="kitslot"][data-place="${ui.kitSlot}"]`);
        // when the tray starts low in the view, scroll Wren to the top so her slots and the tray show together
        const sc = $('.modal-body', overlayEl), tray = $('.kit-tray', overlayEl), doll = $('.doll', overlayEl);
        if (sc && tray && doll) {
          const b = sc.getBoundingClientRect();
          if (tray.getBoundingClientRect().top > b.top + b.height * 0.6) {
            sc.scrollTo({ top: sc.scrollTop + doll.getBoundingClientRect().top - b.top - 8, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
          }
        }
        break;
      }
      case 'kitwear':
        if (E.equipKit(meta, t.dataset.g)) { saveMeta(); sfx('select'); }
        redrawKit(`[data-act="kitwear"][data-g="${t.dataset.g}"]`);
        break;
      case 'dive': closeOverlay(true); startNewRun(meta.kit); break;
      case 'current': {
        const k = t.dataset.k;
        if (E.toggleCurrent(meta, k)) { saveMeta(); sfx('select'); }
        redrawKit(`[data-act="current"][data-k="${k}"]`);
        break;
      }
      case 'gohome': if (E.goHome(run)) { sfx('victory'); clearSave(); render(); } break;
      case 'godeeper': if (E.goDeeper(run)) {
        sfx('bell');
        // reaching a level for the first time counts for good (the Hold), even if Wren falls or turns back
        if (E.noteReached(meta, run)) saveMeta();
        save(); render();
        // after save(): its Story so far toasts would push this one out of the stack of three (no growth while E.HOLD_STEP is 0)
        if (run.holdRose) toast(`You stand in deeper aether, and it steadies around you: your Hold grows from ${run.holdRose.from} to ${run.holdRose.to}, for good.`, 5200);
      } break;
      case 'lazaret': showLazaret(); break;
      case 'ksbreak': {
        const k = t.dataset.k, n = E.breakDown(meta, k);
        if (!n) break;
        saveMeta();
        sfx('coin');
        toast(`You break down a spare ${BL.KEEPSAKES[k].name} for its brass and bone: +${n} ${MT.currency}.`);
        const sc = $('.modal-body', overlayEl), top = sc ? sc.scrollTop : 0;
        showLazaret();
        const sc2 = $('.modal-body', overlayEl); if (sc2) sc2.scrollTop = top;
        const b = $(`[data-act="ksbreak"][data-k="${k}"]`, overlayEl) || $(`[data-act="ksbring"][data-k="${k}"]`, overlayEl); if (b) b.focus({ preventScroll: true });
        break;
      }
      case 'logbook': showLogbook(); break;
      case 'ksbring': {
        const k = t.dataset.k, packing = t.dataset.pack;
        if (E.toggleBring(meta, k)) { saveMeta(); sfx('select'); }
        if (packing) redrawKit(`[data-act="ksbring"][data-k="${k}"]`);
        else {
          const sc = $('.modal-body', overlayEl), top = sc ? sc.scrollTop : 0;
          showLazaret();
          const sc2 = $('.modal-body', overlayEl); if (sc2) sc2.scrollTop = top;
          const b = $(`[data-act="ksbring"][data-k="${k}"]`, overlayEl); if (b) b.focus({ preventScroll: true });
        }
        break;
      }
      case 'kitinfo': if (ui.lastPointer !== 'mouse') showTip(t, tipContent(t.dataset.tip)); break;
      case 'continue': run = loadSave(); render(); break;
      case 'help': showHelp(); break;
      case 'jukebox': showJukebox(); break;
      case 'jukefilter':
        if (['all', 'song', 'cue'].indexOf(t.dataset.filter) < 0) break;
        ui.jukeFilter = t.dataset.filter;
        drawJuke();
        break;
      case 'jukeplay': {
        if (!jukeOpen(t.dataset.kind, t.dataset.key)) break;
        // choosing a track means you want to hear it: switch the music on if it's off
        const off = !prefs.music;
        Sound.juke.pick(t.dataset.kind, t.dataset.key, off);
        if (off) { prefs.music = true; savePrefs(); Sound.changed(); toast('Music on'); }
        drawJuke();
        break;
      }
      case 'jukeskip': Sound.juke.seek(0, +t.dataset.by); ui.jukeSeekAt = 0; drawJuke(); break;
      case 'jukeprev': jukeStep(-1); break;
      case 'jukenext': jukeStep(1); break;
      case 'jukepp': { // the player's play or pause: the track chosen, or the first in the list when none is
        const st = Sound.juke.state(), id = jukeId(st) || jukeTracks()[0];
        if (!id) break;
        const [kind, key] = id.split(':'), off = !prefs.music;
        Sound.juke.pick(kind, key, off || !jukeId(st));
        if (off) { prefs.music = true; savePrefs(); Sound.changed(); toast('Music on'); }
        drawJuke();
        break;
      }
      case 'jukeshuffle':
        prefs.jukeShuffle = !prefs.jukeShuffle;
        ui.jukeOrder = null; // a fresh order from the song playing
        savePrefs();
        drawJuke();
        break;
      case 'jukewords': showWords(t.dataset.key); break;
      case 'jukeback': showJukebox(true); break;
      case 'changelog': showChangelog(); break;
      case 'credits': showCredits(); break;
      case 'story': showStory(); break;
      case 'storytab': sfx('page'); ui.storyTab = t.dataset.tab; $('.story', overlayEl).outerHTML = storyHTML(ui.storyTab); $('.modal-body', overlayEl).scrollTop = 0; { const b = $(`.tab[data-tab="${ui.storyTab}"]`, overlayEl); if (b) b.focus({ preventScroll: true }); } break;
      case 'opening': closeOverlay(true); showOpening(0, () => showStory('story'), true); break;
      case 'opnext': if (ui.opening && +t.dataset.i + 1 < ui.opening.beats.length) { sfx('page'); showOpening(+t.dataset.i + 1); } else endOpening(); break;
      case 'scene': closeOverlay(true); showOpening(0, () => showStory('story'), true, t.dataset.id); break;
      case 'opskip': endOpening(); break;
      case 'opback': if (ui.opening && +t.dataset.i > 0) { sfx('page'); showOpening(+t.dataset.i - 1, null, false, null, null, true); } break;
      case 'helptab': ui.helpTab = t.dataset.tab; $('.help', overlayEl).outerHTML = helpHTML(ui.helpTab); { const b = $(`.tab[data-tab="${ui.helpTab}"]`, overlayEl); if (b) b.focus({ preventScroll: true }); } break;
      case 'menu': showMenu(); break;
      case 'togglesound': prefs.sound = !prefs.sound; savePrefs(); Sound.changed(); showMenu(); break;
      case 'togglefast': prefs.fast = !prefs.fast; savePrefs(); showMenu(); break;
      case 'togglemusic': prefs.music = !prefs.music; savePrefs(); Sound.changed(); showMenu(); break;
      case 'totitle': save(); closeOverlay(true); run = null; render(); break;
      case 'abandon':
        openOverlay(modal('Abandon this run?', `<p>Your progress will be lost.${broughtLoss(run)}</p>`, '<button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="confirmabandon">Abandon</button>', 'narrow'));
        break;
      case 'confirmabandon': clearSave(); closeOverlay(true); run = null; render(); break;
      case 'progress':
        openOverlay(modal('Your progress', `<p>Your progress lives in this browser: ${MT.currency} and kit, the Lazaret, achievements, the Heart's record, best score, the Logbook, Story so far and a run in progress.</p>
          <div class="choice-list" style="margin:0 auto">
            <button class="choice" data-act="exportsave"><b>Download a backup</b><span>Saves it all to a file, with your settings.</span></button>
            <button class="choice" data-act="importsave"><b>Restore from a backup</b><span>Loads a backup file. It replaces the progress in this browser.</span></button>
            <button class="choice danger" data-act="resetask"><b>Reset progress</b><span>Start again as a new keeper. Your settings stay.</span></button>
          </div>`, null, 'narrow'));
        break;
      case 'exportsave': downloadBackup(); break;
      case 'importsave': pickBackupFile(); break;
      case 'importconfirm': if (ui.pendingBackup) restoreBackup(ui.pendingBackup); break;
      case 'resetask':
        openOverlay(modal('Reset all progress?', `<p>This erases everything you have earned in this browser:</p>
          <ul class="reset-list"><li>${MT.currency}, and the kit you bought in the ${MT.shop}</li><li>the Lazaret and every keepsake kept there</li><li>achievements, the Heart's record, best score and the Logbook</li><li>Story so far, the hints and the tutorial</li><li>any run in progress</li></ul>
          <p>Sound, music and animation settings stay. This can't be undone, unless you download a backup first.</p>`,
          '<button class="btn" data-act="close" autofocus>Cancel</button><button class="btn" data-act="exportsave">Download a backup</button><button class="btn danger" data-act="resetconfirm">Reset everything</button>', 'narrow'));
        break;
      case 'resetconfirm': wipeProgress(); location.reload(); break;
      case 'deck': if (run) { ui.allowCancelPick = true; showDeck('view'); } break;
      case 'deckpick': deckPick(+t.dataset.uid); break;
      case 'deckback': {
        const m = ui.deckMode;
        const locked = ui.overlayLocked;
        if (m) { const keep = ui.allowCancelPick; showDeck(m.mode, m.onPick); ui.allowCancelPick = keep; if (locked) ui.overlayLocked = true; }
        break;
      }
      case 'deckconfirm': {
        const m = ui.deckMode;
        const uid = ui.pending;
        if (!m || uid == null) break;
        if (m.mode === 'shopremove') {
          if (E.buyRemoval(run, uid)) sfx('coin'); // the Scrub tile now reads "Done"
          closeOverlay(true); save(); renderKeepScroll();
        } else {
          closeOverlay(true);
          if (m.onPick) m.onPick(uid);
        }
        ui.deckMode = null;
        ui.pending = null;
        break;
      }
      case 'pile': if (run && run.combat) showPile(t.dataset.pile); break;
      case 'ks':
        // between fights a keepsake opens, so it can be dropped; in a fight it only explains itself
        if (run && run.screen !== 'combat' && !run.tutorial) showKeepsake(t.dataset.k);
        else if (ui.lastPointer !== 'mouse') showTip(t, tipContent('ks:' + t.dataset.k));
        break;
      case 'ksdrop': {
        const K = BL.KEEPSAKES[t.dataset.k];
        if (E.dropKeepsake(run, t.dataset.k)) { closeOverlay(true); save(); render(); toast(`You leave the ${K.name} behind.`); }
        break;
      }
      case 'leaveks': if (E.leaveKeepsakes(run)) { sfx('select'); save(); render(); } break;
      case 'tonic': {
        const slot = +t.dataset.slot;
        if (ui.tonicSel === slot) { ui.tonicSel = null; updateCombat(); break; }
        showTonic(slot);
        break;
      }
      case 'tonicuse': closeOverlay(true); useTonic(+t.dataset.slot); break;
      case 'tonicdiscard': E.discardTonic(run, +t.dataset.slot); closeOverlay(true); save(); updateHud(); break;
      case 'pick': {
        const sc = t.dataset.scope;
        const of = sc === 'rw-card' || sc === 'rw-ks' || sc === 'rw-one' ? run && run.rewards : sc === 'tr-ks' ? run && run.treasure : sc === 'fall-ks' ? run : ui.cardChoiceDone;
        if (of) setPick(t, of);
        break;
      }
      case 'pickok': {
        const sc = t.dataset.scope;
        const of = sc === 'rw-card' || sc === 'rw-ks' || sc === 'rw-one' ? run && run.rewards : sc === 'tr-ks' ? run && run.treasure : sc === 'fall-ks' ? run : ui.cardChoiceDone;
        const key = pickOf(sc, of);
        if (key == null) break;
        delete ui.picks[sc];
        // a fall: the one keepsake held on to goes into the Lazaret; the end screen stays where it was scrolled
        if (sc === 'fall-ks') {
          if (E.keepOnFall(meta, run, key)) { saveMeta(); sfx('keepsake'); }
          const sc0 = $('.scene', screenEl), top = sc0 ? sc0.scrollTop : 0;
          render();
          const sc1 = $('.scene', screenEl); if (sc1) sc1.scrollTop = top;
          const box = $('.lz-box.lost', screenEl); if (box && ui.lastPointer !== 'touch') { box.setAttribute('tabindex', '-1'); box.focus({ preventScroll: true }); }
          break;
        }
        if (sc === 'choice') { const cb = ui.cardChoiceDone; ui.cardChoiceDone = null; closeOverlay(true); if (cb) cb(key); render(); break; }
        if (sc === 'rw-card') { E.takeRewardCard(run, +key); sfx('select'); }
        if (sc === 'rw-ks') { E.takeRewardKeepsake(run, key); sfx('keepsake'); }
        if (sc === 'rw-one' && /^\d+$/.test(key)) { E.takeRewardCard(run, +key); sfx('select'); } else if (sc === 'rw-one') { E.takeRewardKeepsake(run, key); sfx('keepsake'); }
        if (sc === 'tr-ks') { E.takeTreasureKeepsake(run, key); sfx('keepsake'); }
        // on to the map, unless the reward's card or keepsakes still wait to be decided, or a tonic could still be taken
        const rw = run.rewards;
        const waits = sc !== 'tr-ks' && rw && ((rw.cards.length && !rw.cardTaken) || (rw.keepsakeChoices && rw.keepsakeChoices.length && !rw.keepsake && !rw.keepsakeLeft)
          || (rw.tonic && !rw.tonicTaken && run.tonics.indexOf(null) >= 0));
        if (!waits) E.backToMap(run);
        save();
        render();
        break;
      }
      case 'choosecard': {
        const id = t.dataset.id;
        const cb = ui.cardChoiceDone;
        ui.cardChoiceDone = null;
        closeOverlay(true);
        if (cb) cb(id || null);
        render();
        break;
      }
      case 'node': chooseNode(+t.dataset.row, +t.dataset.col); break;
      case 'endturn': endTurn(); break;
      case 'swellact': swellAct(t.dataset.kind); break;
      case 'enemy': onEnemyClick(t, e); break;
      case 'field': onFieldClick(e); break;
      case 'dock': if (e.target === t || e.target.id === 'hand') deselect(); break;
      case 'rewardcard': {
        const i = t.dataset.i === '' ? null : +t.dataset.i;
        const rc = i == null ? null : run.rewards.cards[i];
        E.takeRewardCard(run, i);
        if (rc) sfx('select'); // the heading changes to "Added to your deck" and the card lights up, so no toast
        save();
        render();
        break;
      }
      case 'taketonic': if (E.takeRewardTonic(run)) { sfx('tonic'); save(); render(); } break;
      case 'tomap': {
        // a keepsake on offer is taken or left first (the button is disabled until then)
        const ksWait = (src, list) => src && !src.keepsake && !src.keepsakeLeft && list && list.length;
        if (ksWait(run.rewards, run.rewards && run.rewards.keepsakeChoices) || ksWait(run.treasure, run.treasure && run.treasure.choices)) break;
        if (E.stairCacheOpen(run)) { showCache(); break; } // the keepers' cache is open: choose from it first
        E.backToMap(run);
        save();
        render();
        break;
      }
      case 'stairdo': stairDo(t.dataset.id); break;
      case 'sea': showSea((k, uid) => { const o = E.giveToSea(run, k, uid); if (!o) return; run.restMsg = seaLine(o); sfx('douse'); save(); render(); }); break;
      case 'seapick': seaPicked(t.dataset.k); break;
      case 'rest': {
        const h = E.rest(run);
        run.restMsg = `You sleep beside the lantern and wake mended. Healed ${h} HP.`;
        sfx('buff');
        save();
        render();
        break;
      }
      case 'refit':
        ui.allowCancelPick = true;
        showDeck('upgrade', (uid) => {
          E.upgradeCard(run, uid);
          const c = run.deck.find((x) => x.uid === uid);
          run.restDone = true;
          run.restMsg = `You work through the night by lantern light. ${c ? E.cardName(c) : 'Your card'} is ready.`;
          sfx('buff');
          save();
          render();
        });
        break;
      case 'buy': {
        // check first, then confirm: a stray click should not spend Pearls
        const kind = t.dataset.kind, i = +t.dataset.i;
        const it = run.shop[kind][i];
        if (!it || it.sold) break;
        const p = E.price(run, it.base);
        if (run.pearls < p) { toast('Not enough Pearls'); break; }
        if (kind === 'tonics' && run.tonics.indexOf(null) < 0) { toast('Your tonic slots are full'); break; }
        const def = kind === 'cards' ? BL.CARDS[it.id] : kind === 'keepsakes' ? BL.KEEPSAKES[it.id] : BL.TONICS[it.id];
        const what = kind === 'cards'
          ? `<div class="compare">${staticCard(pseudo(it.id))}</div>`
          : `<div class="buy-item"><span class="medal"><img src="img/icons/${def.art}.webp" alt=""></span><div><b>${kind === 'tonics' ? 'Tonic: ' : ''}${def.name}</b><p>${def.desc}</p></div></div>`;
        let left = `<p class="buy-left">You have ${run.pearls} Pearls; ${run.pearls - p} left after this.</p>`;
        if (kind === 'keepsakes') {
          const ch = E.charge(run, it.id), h = E.hold(run), rf = E.roil(run, it.id);
          left += `<p class="buy-left">Roil ${def.charge}: you'd carry ${ch} of your Hold of ${h}${rf.steps ? `, so every fight would have <b>${roilWords(rf)}</b>` : ''}.</p>`;
        }
        openOverlay(modal(`Buy ${def.name} for ${p} Pearls?`, what + left,
          `<button class="btn" data-act="close">Back</button><button class="btn primary" data-act="buyconfirm" data-kind="${kind}" data-i="${i}" autofocus>Buy</button>`, 'narrow'));
        break;
      }
      case 'buyconfirm': {
        const kind = t.dataset.kind, i = +t.dataset.i;
        const it = run.shop[kind][i];
        closeOverlay(true);
        if (it && E.buy(run, kind, i)) {
          sfx('coin'); // the item now reads "Sold" and the Pearl count drops, so no toast over the shop
          save();
          renderKeepScroll();
        }
        break;
      }
      case 'shopremove': {
        if (run.shop.removed) break;
        if (run.pearls < E.removePrice(run)) { toast('Not enough Pearls'); break; }
        ui.allowCancelPick = true;
        showDeck('shopremove', null);
        break;
      }
      case 'evopt': {
        const res = E.chooseEventOption(run, +t.dataset.i);
        if (!res) break;
        sfx('select');
        save();
        render();
        break;
      }
      case 'evcontinue': eventContinue(); break;
      case 'toll': if (E.payToll(run, t.dataset.way)) { sfx('toll'); save(); render(); } break;
      case 'opentreasure': E.openTreasure(run); sfx('treasure'); save(); render(); break;
    }
  }

  function onEnemyClick(t, e) {
    const c = run && run.combat;
    if (!c) return;
    e.stopPropagation();
    const uid = t.dataset.uid;
    const en = E.enemyByUid(c, uid);
    if (!en) return;
    const aiming = ui.tonicSel != null || (ui.sel != null && selNeedsTarget());
    if (aiming && !E.reachable(en)) { toast(`${en.name} is Submerged: only Crests and waves reach it`); return; }
    if (ui.tonicSel != null) { useTonic(ui.tonicSel, uid); return; }
    if (ui.sel != null) {
      const card = c.hand.find((x) => x.uid === ui.sel);
      if (card && E.needsTarget(card)) { ui.target = uid; tryPlaySelected(uid); }
      else tryPlaySelected();
      return;
    }
    if (ui.lastPointer !== 'mouse') {
      if (ui.tipFor === uid) hideTip();
      else { showTip($('.sprite', t), tipContent('unit:' + uid)); ui.tipFor = uid; }
    }
  }
  function onFieldClick(e) {
    const c = run && run.combat;
    if (!c || e.target.closest('.enemy') || e.target.closest('.player')) {
      if (c && e.target.closest('.player') && ui.lastPointer !== 'mouse') showTip($('.unit.player .sprite'), tipContent('unit:p'));
      return;
    }
    if (ui.tonicSel != null) { ui.tonicSel = null; updateCombat(); return; }
    if (ui.sel != null) {
      const card = c.hand.find((x) => x.uid === ui.sel);
      if (card && !E.needsTarget(card)) tryPlaySelected();
      else deselect();
    }
  }

  /* ================================================================== *
   *  Keyboard
   * ================================================================== */
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    Sound.unlock();
    if (Teach && Teach.onKey(e)) return;
    const k = e.key;
    if (!overlayEl.hidden) {
      if (k === 'Escape') { e.preventDefault(); closeOverlay(); return; }
      // the story's pictures: the arrow keys page back and on (v0.40.0, the user: "Cannot go back in story slides")
      if (ui.opening && (k === 'ArrowLeft' || k === 'ArrowRight')) {
        const b = $(`[data-act="${k === 'ArrowLeft' ? 'opback' : 'opnext'}"]`, overlayEl);
        if (b) { e.preventDefault(); b.click(); }
        return;
      }
      // number keys pick cards in a card choice
      if (/^[1-9]$/.test(k)) {
        const opts = $$('[data-act="pick"], [data-act="deckpick"]', overlayEl);
        const o = opts[+k - 1];
        if (o) { e.preventDefault(); o.click(); const ok = $('[data-act="pickok"]:not([disabled])', overlayEl); if (ok) ok.focus({ preventScroll: true }); }
      }
      if ((k === 'Enter' || k === ' ') && document.activeElement && document.activeElement.matches('[role="button"][data-act]')) {
        e.preventDefault(); document.activeElement.click();
      }
      return;
    }
    if (!run) return;
    const active = document.activeElement;
    const onButton = active && active !== document.body && (active.tagName === 'BUTTON' || active.getAttribute('role') === 'button') && !active.closest('#hand');
    if ((k === 'Enter' || k === ' ') && active && active.matches('[role="button"][data-act]')) { e.preventDefault(); active.click(); return; }
    if (k === 'd' || k === 'D') { e.preventDefault(); ui.allowCancelPick = true; showDeck('view'); return; }
    if (run.screen === 'combat') return combatKey(e, onButton);
    if (run.screen === 'map') return mapKey(e);
    if (run.screen === 'reward' && /^[1-3]$/.test(k)) {
      const el = $$('.card[data-act="pick"][data-scope="rw-card"], .card[data-act="pick"][data-scope="rw-one"]', screenEl)[+k - 1];
      if (el) { e.preventDefault(); el.click(); const ok = $('[data-act="pickok"]:not([disabled])', screenEl); if (ok) ok.focus({ preventScroll: true }); }
    }
  });

  function combatKey(e, onButton) {
    const c = run.combat;
    const k = e.key;
    if (!c) return;
    if (k === 'Escape' || k === 'ArrowDown') { e.preventDefault(); deselect(); return; }
    if (ui.busy || c.phase !== 'player') return;
    ui.kbd = true;
    ui.lastPointer = ui.lastPointer === 'touch' ? 'touch' : 'keyboard';
    if (/^[0-9]$/.test(k) || k === 'ArrowLeft' || k === 'ArrowRight') {
      const a = document.activeElement;
      if (a && a !== document.body && a.blur) a.blur();
    }
    if (/^[0-9]$/.test(k)) {
      const idx = k === '0' ? 9 : +k - 1;
      const card = c.hand[idx];
      if (!card) return;
      e.preventDefault();
      if (ui.sel === card.uid) tryPlaySelected();
      else select(card.uid);
      return;
    }
    if (k === 'e' || k === 'E') { e.preventDefault(); endTurn(); return; }
    if (k === 'b' || k === 'B' || k === 's' || k === 'S') { e.preventDefault(); swellAct(k.toLowerCase() === 'b' ? 'bail' : 'stir'); return; }
    if ('zxcvZXCV'.indexOf(k) >= 0 && k.length === 1) { // V: the fourth slot, with the Spare Flask
      const slot = { z: 0, x: 1, c: 2, v: 3 }[k.toLowerCase()];
      if (run.tonics[slot]) { e.preventDefault(); showTonic(slot); }
      return;
    }
    if (k === 'ArrowLeft' || k === 'ArrowRight') {
      e.preventDefault();
      const dir = k === 'ArrowLeft' ? -1 : 1;
      if ((ui.sel != null && selNeedsTarget()) || ui.tonicSel != null) {
        const al = E.targets(c);
        if (!al.length) return;
        let i = al.findIndex((x) => x.uid === ui.target);
        i = i < 0 ? 0 : (i + dir + al.length) % al.length;
        ui.target = al[i].uid;
        updateCombat();
      } else if (c.hand.length) {
        let i = c.hand.findIndex((x) => x.uid === ui.sel);
        i = i < 0 ? (dir > 0 ? 0 : c.hand.length - 1) : (i + dir + c.hand.length) % c.hand.length;
        select(c.hand[i].uid);
      }
      return;
    }
    if (k === 'Enter' || k === ' ' || k === 'ArrowUp') {
      if (onButton && k !== 'ArrowUp') return;
      e.preventDefault();
      if (ui.tonicSel != null) { if (ui.target) useTonic(ui.tonicSel, ui.target); return; }
      if (ui.sel != null) tryPlaySelected();
      else if (k !== 'ArrowUp' && c.hand.length) select(c.hand[0].uid);
    }
  }

  function mapKey(e) {
    const k = e.key;
    const btns = $$('.node.avail', screenEl);
    if (!btns.length) return;
    if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') {
      e.preventDefault();
      const cur = btns.indexOf(document.activeElement);
      const n = cur < 0 ? 0 : (cur + (k === 'ArrowLeft' || k === 'ArrowDown' ? -1 : 1) + btns.length) % btns.length;
      btns[n].focus();
      return;
    }
    if (/^[1-9]$/.test(k) && btns[+k - 1]) { e.preventDefault(); btns[+k - 1].click(); return; }
    if ((k === 'Enter' || k === ' ') && !btns.includes(document.activeElement)) { e.preventDefault(); btns[0].focus(); }
  }

  /* ================================================================== *
   *  Boot
   * ================================================================== */
  window.addEventListener('resize', () => {
    computeSizes();
    if (run && run.screen === 'map') renderMap();
    if (run && run.combat) renderGlossary();
    fitScene();
    drawDollLines();
  });
  window.addEventListener('beforeunload', () => save());
  document.addEventListener('visibilitychange', () => { if (document.hidden) { save(); Sound.hide(); } else Sound.show(); });
  window.addEventListener('pagehide', () => Sound.hide());
  window.addEventListener('pageshow', () => { if (!document.hidden) Sound.show(); });

  Teach = BL.Teach({
    E, $, ui, save, loadSave, render, openOverlay, modal,
    getRun: () => run,
    setRun: (r) => { run = r; },
    overlayHidden: () => overlayEl.hidden,
  });
  // tidy up keys from older builds
  try { ['brinelight.seenhelp', 'brinelight.tip1'].forEach((k) => localStorage.removeItem(k)); } catch (e) { /* ignore */ }

  computeSizes();
  render();

  // exposed for debugging and the UI tests
  window.Brinelight = { get run() { return run; }, set run(r) { run = r; }, render, E, ui, get teach() { return Teach; }, get meta() { return meta; },
    // for js/debug.js
    juke: JUKE, jukeDepths: JUKE_DEPTHS, save, saveMeta, toast, sfx, modal, openOverlay, closeOverlay, onVictory, onDefeat,
    story, saveStory, showStory, showOpening, showLazaret,
    // for the UI test: what a backup holds, and loading one without the file picker; what the music and sound are doing
    backupData, askRestore, audio: () => Sound.state(), songToEnd: (secs) => Sound.toEnd(secs), fightSong };
})();

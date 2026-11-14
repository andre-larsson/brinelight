#!/usr/bin/env node
/* Screenshot every screen at the target sizes, for layout review.
   Usage: node tools/screens.js <outdir> [port=8874] [sizes=desktop,phone,small,land]
   Drives the game through window.Brinelight, so it needs no clicking. */
'use strict';
const fs = require('fs');
const path = require('path');
const { serve } = require('./serve');
const { launch, sleep } = require('./cdp');

const SIZES = {
  desktop: { w: 1280, h: 800 },
  phone: { w: 390, h: 844, mobile: true, touch: true },
  small: { w: 360, h: 640, mobile: true, touch: true },
  land: { w: 844, h: 390, mobile: true, touch: true },
};

(async () => {
  const out = path.resolve(process.argv[2] || 'screens');
  const port = +(process.argv[3] || 8874);
  const sizes = (process.argv[4] || 'desktop,phone,small,land').split(',');
  fs.mkdirSync(out, { recursive: true });
  const server = await serve(port, path.join(__dirname, '..'));
  const page = await launch();
  const base = `http://127.0.0.1:${port}/`;
  const MIN_PX = 12;
  const small = [];
  /* every visible text element rendered below MIN_PX (transforms included) */
  const audit = (tag, name) => page.eval(`(() => {
    const out = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    while (walk.nextNode()) {
      const t = walk.currentNode;
      const txt = t.textContent.trim();
      if (!txt) continue;
      const el = t.parentElement;
      if (!el || seen.has(el)) continue;
      seen.add(el);
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || +cs.opacity === 0 || el.closest('[hidden]') || el.closest('[aria-hidden="true"]')) continue;
      const scale = el.offsetHeight ? r.height / el.offsetHeight : 1;
      const px = parseFloat(cs.fontSize) * scale;
      if (px < ${MIN_PX} - 0.05) out.push(px.toFixed(1) + 'px ' + (el.className && el.className.baseVal === undefined ? '.' + String(el.className).split(' ')[0] : el.tagName) + ' "' + txt.slice(0, 30) + '"');
    }
    return out;
  })()`).then((list) => { if (list.length) small.push(`${tag}_${name}: ${list.length}\n    ` + list.slice(0, 8).join('\n    ')); });
  const shot = async (tag, name) => { await sleep(350); await page.screenshot(path.join(out, `${tag}_${name}.png`)); await audit(tag, name); };
  const setup = (js) => page.eval(`(() => { const B = window.Brinelight, E = B.E, BL = window.BL; ${js}; })()`);
  try {
    for (const tag of sizes) {
      const s = SIZES[tag];
      await page.viewport(s.w, s.h, s);
      await page.goto(base + '?seed=4242');
      await page.eval(`(() => { try { localStorage.clear(); } catch (e) {} })()`);
      await page.goto(base + '?seed=4242');
      // review the screens themselves: mark the first-time hints and the tutorial offer as seen
      await page.eval(`(() => { localStorage.setItem('brinelight.hints.v1', JSON.stringify(window.Brinelight.teach ? window.Brinelight.teach.hintIds() : [])); localStorage.setItem('brinelight.tutorial.v1', 'done');
        const en = window.BL.E.storyEntries(); localStorage.setItem('brinelight.story.v1', JSON.stringify({ opening: true, marks: en.map((x) => x.when).filter(Boolean), read: en.map((x) => x.id) })); })()`);
      await page.goto(base + '?seed=4242');
      await sleep(400);
      await shot(tag, '01_title');
      // map
      await setup(`const r = E.newRun(4242, 0); B.run = r; B.render();`);
      await shot(tag, '02_map');
      // first fight
      await setup(`const r = B.run; E.enterNode(r, E.availableNodes(r)[0]); B.render();`);
      await sleep(1600);
      await shot(tag, '03_combat');
      // select first card
      await setup(`const c = B.run.combat; document.querySelector('#hand .card').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'mouse' })); document.querySelector('#hand .card').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, pointerType: 'mouse' }));`);
      await shot(tag, '04_selected');
      // a two-enemy fight with statuses and ward, mid-fight
      await setup(`const r = E.newRun(77, 0); B.run = r; E.startCombat(r, 'hard', ['crab', 'jelly']); const c = r.combat; c.player.ward = 7; c.enemies[0].ward = 9; c.enemies[1].st.brine = 3; c.player.st.soaked = 1; c.tide = 5; r.tonics = ['ink', 'kelptea', null]; r.keepsakes.push('anchor', 'whaletooth'); B.render();`);
      await sleep(1600);
      await shot(tag, '05_combat_busy');
      // reward
      await setup(`const r = B.run; const c = r.combat; c.enemies.forEach((e) => { e.dead = true; e.hp = 0; }); c.won = true; E.finishCombat(r); B.render();`);
      await sleep(900);
      await shot(tag, '06_reward');
      // shop
      await setup(`const r = B.run; E.backToMap(r); r.pearls = 180; E.enterNode(r, { row: 3, col: 1, type: 'shop' }); B.render();`);
      await shot(tag, '07_shop');
      // rest
      await setup(`const r = B.run; E.backToMap(r); r.hp = 40; E.enterNode(r, { row: 4, col: 1, type: 'rest' }); B.render();`);
      await shot(tag, '08_rest');
      // event
      await setup(`const r = B.run; E.backToMap(r); E.enterNode(r, { row: 5, col: 1, type: 'event' }); B.render();`);
      await shot(tag, '09_event');
      // treasure, opened
      await setup(`const r = B.run; E.backToMap(r); E.enterNode(r, { row: 5, col: 2, type: 'treasure' }); E.openTreasure(r); B.render();`);
      await shot(tag, '10_treasure');
      // elite fight
      await setup(`const r = B.run; E.backToMap(r); E.startCombat(r, 'elite', ['angler', 'angler']); B.render();`);
      await sleep(1800);
      await shot(tag, '11_elite');
      // the Dread's reward: a keepsake pick with Roil (the run carries Whale Tooth and Drowned Anchor, over the Hold)
      await setup(`const r = B.run; const c = r.combat; c.enemies.forEach((e) => { e.dead = true; e.hp = 0; }); c.won = true; E.finishCombat(r); B.render();`);
      await sleep(900);
      await shot(tag, '11b_elite_reward');
      // defeat screen
      await setup(`const r = B.run; r.combat = null; r.screen = 'defeat'; r.floor = 6; B.render();`);
      await shot(tag, '12_defeat');
      // help
      await setup(`B.run = null; B.render();`);
      await page.eval(`document.querySelector('[data-act="help"]') && document.querySelector('[data-act="help"]').click()`);
      await shot(tag, '13_help');
      // the Workshop and the kit before a dive
      await setup(`B.closeOverlay(true); const m = B.meta; m.salvage = 40; m.earned = 200; m.owned = ['cork', 'purse', 'floodbell', 'honed', 'net']; m.ach = ['twocrests', 'dreadhunter']; m.kit = E.fitKit(['honed', 'cork', 'purse']); B.saveMeta(); B.render(); document.querySelector('[data-act="workshop"]').click();`);
      await shot(tag, '14_workshop');
      await page.eval(`document.querySelector('#overlay [data-act="kitslot"][data-place="coat"]').click()`);
      await sleep(200);
      await shot(tag, '14b_workshop_coat');
      await setup(`B.closeOverlay(true); document.querySelector('[data-act="newrun"]').click();`);
      await shot(tag, '15_kit');
      // Story so far: a player part-way in (some entries new, some locked), then the opening
      await setup(`B.closeOverlay(true); B.story.marks = ['fell', 'won:0', 'shop', 'cove', 'keepsake', 'ev:ghost', 'en:sailor']; B.story.read = ['fall', 'barnaby', 'cove']; B.render(); document.querySelector('[data-act="story"]').click();`);
      await shot(tag, '16_story');
      await page.eval(`document.querySelector('[data-act="storytab"][data-tab="world"]').click()`);
      await shot(tag, '17_story_world');
      await page.eval(`document.querySelector('[data-act="storytab"][data-tab="notes"]').click()`);
      await shot(tag, '18_story_notes');
      await setup(`B.closeOverlay(true); B.showOpening(0)`);
      await sleep(900);
      await shot(tag, '19_opening_1');
      await page.eval(`document.querySelector('[data-act="opnext"]').click()`);
      await sleep(900);
      await shot(tag, '19b_opening_2');
      await page.eval(`document.querySelector('[data-act="opnext"]').click()`);
      await sleep(900);
      await shot(tag, '20_opening_3');
      await page.eval(`document.querySelector('[data-act="opnext"]').click()`);
      await sleep(900);
      await shot(tag, '21_opening_4');
      await page.eval(`document.querySelector('[data-act="opnext"]').click()`);
      // the Lazaret: five keepsakes kept, two chosen (over the Shallows Hold), then the choice before a descent
      await setup(`B.closeOverlay(true); const m = B.meta; m.record.hearts = Math.max(1, m.record.hearts || 0); m.record.wins = Math.max(m.record.wins, 1); m.record.runs = Math.max(m.record.runs, 1); m.currents = ['fed']; m.lazOpen = true; m.lazaret = ['whaletooth', 'stormbottle', 'moonshard', 'biscuit', 'coralcrown']; m.bring = ['whaletooth', 'stormbottle']; B.saveMeta(); B.run = null; B.render(); document.querySelector('[data-act="lazaret"]').click();`);
      await shot(tag, '22_lazaret');
      await setup(`B.closeOverlay(true); document.querySelector('[data-act="newrun"]').click();`);
      await sleep(200);
      await shot(tag, '23_pack');
      // a win: one new keepsake kept, one the Lazaret already holds
      await setup(`B.closeOverlay(true); const r = E.newRun(4242, 0, B.meta.kit, B.meta.bring); E.gainKeepsake(r, 'anchor'); E.gainKeepsake(r, 'moonshard'); r.floor = 8; r.cleared = [0]; r.screen = 'pin'; B.run = r; B.render();`);
      await shot(tag, '24_pin');
      await setup(`B.run.screen = 'victory'; B.render();`);
      await shot(tag, '24_home');
      // a fall: the found keepsakes are lost
      await setup(`const r = E.newRun(4242, 0, B.meta.kit, B.meta.bring); E.gainKeepsake(r, 'gullfeather'); E.gainKeepsake(r, 'tidewatch'); r.floor = 6; r.screen = 'defeat'; B.run = r; B.render();`);
      await shot(tag, '25_defeat_lost');
      // a Roiled fight: 3 steps past the Hold, so a Seep, Thrash 1 and a Bell Minnow; then the keepsake that causes it
      await setup(`const r = E.newRun(4242, 0, B.meta.kit, ['whaletooth', 'stormbottle', 'coralcrown']); B.run = r; E.startCombat(r, 'hard', ['crab', 'jelly']); B.render();`);
      await sleep(1800);
      await shot(tag, '27_roiled_fight');
      await setup(`const r = B.run; const c = r.combat; c.enemies.forEach((e) => { e.dead = true; e.hp = 0; }); c.won = true; E.finishCombat(r); E.backToMap(r); B.render(); document.querySelector('.hud .charge').click();`);
      await shot(tag, '28_roil_tip');
      await setup(`document.querySelector('.hud .medal[data-k="whaletooth"]').click();`);
      await shot(tag, '29_keepsake_roiled');
      // the logbook
      await setup(`B.closeOverlay(true); B.meta.record = { runs: 14, wins: 3, deep: { level: 1, floor: 7 } }; B.saveMeta(); B.run = null; B.render(); document.querySelector('[data-act="logbook"]').click();`);
      await shot(tag, '30_logbook');
      await setup(`B.closeOverlay(true);`);
      // Dark Water: a Submerged Ray with a Lamp Hermit's Shell, a Gulper holding a card, the Buoy's lock, a Fog event, the win
      await setup(`const r = E.newRun(4242, 1); B.run = r; E.startCombat(r, 'hard', ['ray', 'leech', 'hermit']); const c = r.combat; c.enemies[0].st.submerged = 1; c.enemies[0].intent = 'rise'; c.enemies[2].ward = 8; c.enemies[2].intent = 'withdraw'; B.render();`);
      await sleep(1800);
      await shot(tag, '31_dark_fight');
      await setup(`const r = B.run; E.backToMap(r); E.startCombat(r, 'elite', ['gulper']); const g = r.combat.enemies[0]; g.mem.swallowed = [E.newCard(r, 'swell')]; g.st.swallowed = 1; g.intent = 'gulp'; r.combat.player.st.doused = 1; B.render();`);
      await sleep(1800);
      await shot(tag, '32_dark_gulper');
      await setup(`const r = B.run; E.backToMap(r); E.startCombat(r, 'boss', ['buoy']); r.combat.enemies[0].intent = 'toll'; r.combat.tide = 5; B.render();`);
      await sleep(1800);
      await shot(tag, '33_dark_buoy');
      await setup(`const r = B.run; E.backToMap(r); r.event = { id: 'garden', stage: 'choose', text: null, next: null }; r.screen = 'event'; B.render();`);
      await shot(tag, '34_dark_event');
      // v0.20.0: Dark Water's pin with the stair shut and the diving dress hanging above it
      await setup(`const r = E.newRun(4242, 1); r.landed = [8]; r.floor = 8; r.cleared = [0, 1]; r.found = 'suit'; r.screen = 'pin'; B.run = r; B.render();`);
      await shot(tag, '35_dark_pin_dress');
      await setup(`const r = E.newRun(4242, 0); r.floor = 8; r.cleared = [0]; r.screen = 'pin'; B.run = r; E.goDeeper(r); B.render();`);
      await shot(tag, '36_stair_cove');
      // v0.20.0: the Belfry: a fight in the diving dress, the Oarfish's Coil, the Bellwether, the Thing in the Bell, the Cantor, a Fog event, the Heart
      await setup(`const r = E.newRun(4242, 2); r.kit.coat = 'suit'; B.run = r; E.startCombat(r, 'hard', ['belljelly', 'bladder', 'minnow']); const c = r.combat; c.enemies[0].st.belled = 1; c.enemies[0].intent = Object.keys(BL.ENEMIES.belljelly.moves)[0]; B.render();`);
      await sleep(1800);
      await shot(tag, '40_belfry_fight');
      await setup(`const r = B.run; E.backToMap(r); E.startCombat(r, 'elite', ['oarfish']); r.combat.enemies[0].intent = 'coil'; r.combat.player.st.breathless = 1; B.render();`);
      await sleep(1800);
      await shot(tag, '41_belfry_oarfish');
      await setup(`const r = B.run; E.backToMap(r); E.startCombat(r, 'boss', ['bell']); r.combat.enemies[0].intent = 'toll'; B.render();`);
      await sleep(1800);
      await shot(tag, '42_bellwether');
      await setup(`const r = B.run, c = r.combat; c.enemies[0].hp = 1; c.enemies[0].ward = 0; const j = E.newCard(r, 'jab'); c.hand.unshift(j); c.light = 3; E.playCard(r, j.uid, c.enemies[0].uid); B.render();`);
      await sleep(2400);
      await shot(tag, '43_thing_in_the_bell');
      await setup(`const r = E.newRun(4242, 2, null, null, [], true); r.kit.coat = 'suit'; B.run = r; E.startCombat(r, 'boss', ['cantor']); B.render();`);
      await sleep(1800);
      await shot(tag, '44_cantor');
      await setup(`const r = B.run; E.backToMap(r); r.event = { id: 'lanterns', stage: 'choose', text: null, next: null }; r.screen = 'event'; B.render();`);
      await shot(tag, '45_belfry_event');
      await setup(`const r = E.newRun(4242, 2); r.landed = [8, 8]; r.floor = 8; r.cleared = [0, 1, 2]; r.heart = true; r.screen = 'victory'; B.run = r; B.render();`);
      await shot(tag, '46_heart_victory');
      // v0.21.0: Dark Water's own Dread, the Garden Strider, after it has tended its garden
      await setup(`const r = E.newRun(4242, 1); B.run = r; E.startCombat(r, 'elite', ['strider']); E.endTurn(r); r.combat.enemies[0].intent = 'graze'; B.render();`);
      await sleep(1800);
      await shot(tag, '47_dark_strider');
      await setup(`B.run = null; B.render(); document.querySelector('[data-act="help"]').click();`);
      await setup(`document.querySelector('[data-act="helptab"][data-tab="keywords"]').click();`);
      await shot(tag, '36_help_keywords');
      await setup(`B.closeOverlay(true);`);
      // v0.16.0: Rites marked in the hand, and the confirmation before a reset
      await setup(`const r = E.newRun(4242, 0); B.run = r; E.startCombat(r, 'easy', ['kelp']); const c = r.combat; c.hand = ['beam', 'jab', 'moonpull', 'brace', 'spindrift'].map((id) => E.newCard(r, id)); B.render();`);
      await sleep(1800);
      await shot(tag, '37_rite_hand');
      await setup(`B.run = null; B.render(); document.querySelector('[data-act="menu"]').click();`);
      await shot(tag, '38_title_menu');
      await setup(`document.querySelector('[data-act="progress"]').click();`);
      await shot(tag, '38b_progress');
      await setup(`document.querySelector('[data-act="resetask"]').click();`);
      await shot(tag, '39_reset_confirm');
      await setup(`B.closeOverlay(true);`);
      // the title screen with every button: a saved run, the Workshop and the Lazaret
      await setup(`const r = E.newRun(4242, 0); r.floor = 3; B.run = r; B.save(); B.run = null; B.render();`);
      await shot(tag, '26_title_full');
    }
    fs.writeFileSync(path.join(out, 'small-text.txt'), small.join('\n') + '\n');
    console.log(small.length ? `Text below ${MIN_PX}px on ${small.length} screens (see small-text.txt)` : `No text below ${MIN_PX}px`);
    if (page.errors.length) { console.log('Page errors:\n' + page.errors.join('\n')); process.exitCode = 1; }
    console.log('Screenshots in ' + out);
  } finally {
    await page.close();
    server.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });

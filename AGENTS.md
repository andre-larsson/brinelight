# AGENTS.md instructions for brinelight

<INSTRUCTIONS>
- Primary goal: Brinelight, a single-player roguelike deckbuilder for the browser (plain HTML, CSS and JavaScript, no dependencies, no build step).
- Repository: GitHub Pages project site, published at `https://andre-larsson.github.io/brinelight/` by `.github/workflows/pages.yml` on push to `main`.
- Git: commit straight to `main`; don't make feature branches. Pushing to `main` deploys the site, so push only when asked.
- Run locally: `npm start` (serves http://localhost:8000) or `node tools/serve.js <port>`. Opening `index.html` from disk also works. Add `?debug` for the debug and cheat panel (`js/debug.js`; `?debug=0` turns it off).
- Build: `npm run build` copies only what the page loads (`index.html`, `style.css`, `js/`, `img/`) into `_site/` and fails if a referenced file is missing. The Pages workflow runs the rule tests, then this.
- Tests: `npm test` runs the Node rule tests (`tests/*.test.js`, no browser, about a second). `npm run test:ui` plays the game through the real UI in headless Chrome (desktop mouse and keyboard, phone touch, the tutorial three ways) and fails on any JS error; it needs Chrome and takes about 5 minutes. Add `--root DIR --path /brinelight/` to test a built copy under a sub-path.
- Balance: `npm run measure` plays 1000 seeds with the bot for each row of a table (the built-in one, or `node tools/measure.js <spec.js>` for your own rows) and prints win rates. It uses every core, so a table takes seconds.
- Checks: `npm run screens -- <outdir>` screenshots every screen at 1280x800, 390x844, 360x640 and 844x390 and lists any text rendered below 12px. `npm run opening -- --ui` measures the first fight and the tutorial in actions and seconds. `node tools/tutorial-shots.js <outdir>` screenshots each tutorial step.
- Code map: `js/version.js` (version number and What's new list), `js/data.js` (cards, enemies, the bands in `BL.BANDS` (each part of the Reach's encounters, Fog events, boss and paintings), keepsakes with their Roil (`charge` in the code), events, tutorial deck, Workshop kit and achievements, and the opening and Story so far text in `BL.STORY`), `js/engine.js` (rules, seeded RNG, the Workshop and Lazaret rules, no DOM), `js/tutorial.js` (guided fight and first-time hints), `js/ui.js` (rendering, input, sound, saving).
- Versioning: every player-facing change bumps `BL.VERSION` in `js/version.js` (minor for rules, content or features; patch for fixes only), adds a plain-language entry at the top of `BL.CHANGELOG`, and updates `package.json` to match. `npm test` checks they agree.
- Notes: Keep asset paths relative (the site lives under `/brinelight/`). localStorage keys all start with `brinelight.`. Rules in README.md and How to Play must stay backed by tests. Decisions, measurements and open questions are in GAME_NOTES.md. The fiction, and what later story text has to agree with, is in WORLD.md.
- For game design or iteration work, follow the game-iteration skill.
</INSTRUCTIONS>

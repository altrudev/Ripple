# Ripple — handover

For whoever picks this up next (a person or an AI session). Read this, then [ROADMAP.md](ROADMAP.md). Together they're everything you need to carry on.

Last updated 2026-11-18 · **v0.8.1 live** · Phases 0–5 done · next: Phase 6 (Movement), then Phase 7 (homepage portfolio).

---

## 1. What Ripple is

A code visualizer by ALTRU.dev. Code becomes visual objects on a live map; switch any object off and a ripple shows everything that depends on it. Works on one repo (`github.com/owner/repo`), a whole account (`github.com/owner`), a `.zip`, or the built-in example — and now inside a single file (its functions).

- Live tool: https://altru.dev/apps/ripple/try
- Product page: https://altru.dev/apps/ripple
- Repo: `altrudev/Ripple` (public, Apache-2.0)

## 2. Where things are

| What | Where |
|---|---|
| The app | `index.html` — the whole thing, one file, vanilla JS, no build step |
| Logic tests | `tests/core.test.js` — Node, no dependencies |
| Browser checks | `tests/browser.check.js` — Playwright, see §5 |
| Plan + status per phase | `ROADMAP.md` |
| Working copy used for deploys | VPS, `~/Ripple` (a normal clone of this repo) |
| **Private ops note** (host, SSH alias, live path, backups, product DB row) | VPS, `~/Ripple-HANDOFF.md` — kept out of this public repo on purpose |
| Real-data check scripts | VPS, `~/claude-scratch/pw/ripple-*.js` (see §5) |

The VPS is reachable from Claude sessions through Desktop Commander (device `vps-377a113a`). The GitHub CLI there is logged in as `altrudev`.

## 3. What's shipped

| Version | What |
|---|---|
| v0.2 | Repo + account + zip modes, ripple, insights, engine-model export |
| v0.3 | **Phase 0** — app fits the window, no page scroll; 21 languages |
| v0.4 | **Phase 1 Time** — time bar: account history (births, recent-work glow, fade), commit replay in a repo; readable fonts; map follows window resize |
| v0.5 | **Phase 2 Health** — green / amber / grey rings with a reason; "Needs attention" list |
| v0.6 | **Phase 3 Meaning** — Group by Purpose / Family / Language, explainable purpose guess, labels never overlap |
| v0.7 | **Phase 4 Ghost links** — suggested links between repos with reasons + "Copy README snippet" |
| v0.8 | **Phase 5 Inside a file** — zoom into a code file to see its functions; ripple through calls |
| v0.7.1 / v0.8.1 | Fixes: page could grow taller than the window with a long details panel; neighbour labels overlapping |

Numbers from the real altrudev account (53 repos): 32 agent safety & trust · 7 developer tools · 6 web & apps · 3 games · 2 accessibility · 2 privacy & messaging · 1 money; 47 healthy, 6 worth a look; 58 suggested links, 37 of 38 standalone repos matched.

## 4. How the code is laid out

`index.html` = CSS, HTML, then one `<script>` in two halves.

### CORE (between `// ===== CORE START =====` and `// ===== CORE END =====`)
Pure functions, no DOM — `tests/core.test.js` loads this section straight out of the HTML. **Anything that decides something goes here and gets a test.**

| Section | Key functions |
|---|---|
| File readers | `jsRefs`, `pyRefs`, `goRefs`, `rustRefs`, … (one per language), `readerFor(path)` |
| Repo graph | `buildGraph(files)` → `{ nodes, edges, missing, unknownTotal, unusedDeps, … }`; `linkUp(g)` adds `inn`/`out`; `rippleFrom(ids, byId)` → depth map |
| Time (Ph 1) | `repoLook(created, pushed, T)`, `commitGlow(commits, i)`, `addedTimes(commits)` |
| Health (Ph 2) | `fileHealth(nodes)`, `repoHealth(repo, now)` → `{ level: ok/warn/quiet, why }` |
| Meaning (Ph 3) | `PURPOSES` word lists, `classifyPurpose(name, desc, topics, readme)` → `{ label, words }` |
| Ghost links (Ph 4) | `ghostLinks(items, linked)` — TF-IDF cosine + shared deps + family → `[{ a, b, score, why }]` |
| Inside a file (Ph 5) | `fileFunctions(path, src)` → defs with body extents; `insideGraph(path, src, outFiles, inFiles)` → graph of functions |

### UI (after `// ===== UI =====`)
- **State:** one object `S` (nodes, edges, view, selection, removed set, time, ghosts, health, `unit` = `repos` / `files` / `functions`).
- **Loaders:** `loadGitHub` (repo: tree + raw files + 1 call for commits), `loadAccount` (1 API call + raw README/manifests), `loadZip`, the built-in `SAMPLE` (+ `SAMPLE_HISTORY`).
- **Account graph:** `buildAccountGraph(owner, repos)` (repos as nodes, purpose/family/language groups, ghosts).
- **`start(res)`** — the single entry for every map. `res.meta.kind` is `github | zip | sample | account | inside`. It sizes nodes, calls `layoutGroups`, `setupHealth`, `setupTime`, then the `render*` panel functions.
- **Canvas:** `tick()` (force layout), `draw(t)` (edges → ghost lines → glow/rings/shapes → cluster titles → labels with collision), `loop()`; `fit()`, `resize()`, `zoomAt()` (also the semantic-zoom trigger in/out of a file).
- **Panels:** `renderHead`, `renderInsights`, `renderLegend`, `renderPkgs`, `renderSel`, `renderImpact`; Phase sections below them (`ghost links`, `health`, `time bar`), then `engineModel()` export and inputs.

Node shape (both modes): `{ id, kind: 'file'|'package', sub, label, group, inn, out, x, y, r, color }` plus per-mode extras (`repo` for account nodes, `where` for inside nodes, `_h` health, `_glow/_hid/_born/_ta` time).

## 5. Testing — every change

1. `node tests/core.test.js` — 15 tests, must all pass.
2. `node tests/browser.check.js` — 13 checks: example map, time, health, inside view + ripple, account groups/links/health, frame time < 16 ms, and **no page scroll across 40 states** (4 window sizes × selected / insight open / inside a file / time moved back). Needs Playwright + Chromium wherever you run it (on the VPS: `playwright-core` with Chromium in `~/.cache/ms-playwright`).
3. After deploying, a **real-data check** on the live page (VPS, `~/claude-scratch/pw/`): `ripple-settle.js` (altrudev account, waits for the layout to settle), `ripple-ghost.js`, `ripple-inside.js` (Lullwire-Relay → relay.go), `ripple-time.js` (+ PWX). These spend the VPS IP's GitHub allowance (~60 unauthenticated calls/hour): account map = 1 call, repo map ≈ 4.

Always check the *busy* states, not just the empty map — the v0.7.1 scroll bug only showed with a long details panel open.

## 6. Shipping

1. Tests (§5) pass.
2. Commit + push to `main`.
3. On the VPS: `git pull` in `~/Ripple`, re-run `node tests/core.test.js`.
4. Back up the live file with a timestamp, upload `index.html`, then confirm the live page's SHA-256 equals the local file's. Exact host, alias, paths and backup folder: the private ops note.
5. Real-data check on the live page.
6. Update `ROADMAP.md` (status table + the phase heading) and this file.

## 7. Working rules (from the owner)

- One `index.html`, vanilla JS, no build step, no frameworks. CDN only for JSZip. cPanel/Apache static hosting.
- **The tool fits the window — the page never scrolls.** Only side panels scroll inside. Phones: full map + bottom sheet.
- Simple on the surface, detail on demand. A visitor with no training should get the map in 5 seconds. Plain language, no jargon in the UI.
- Every judgment the tool makes shows its reason (rings, purpose, suggested links). If something can't be known, say so instead of guessing.
- Prefer inventive hybrid approaches; if something can't be done, say so plainly.
- No Mac/Apple-style UI.
- **Public copy** (README, product page, posts) comes from Val's own words — don't pre-write it. Sign public text "— Val (ALTRU.dev)".
- Commits are authored as `Altru.dev <266135212+altrudev@users.noreply.github.com>`.

## 8. Practical tips for AI sessions

- **Editing the big file:** small Python find-and-replace scripts that assert each snippet is found exactly once, then run the tests. Safer than rewriting the 100 KB file.
- **Getting work to the VPS:** push to GitHub, then `git pull` in `~/Ripple`. To try something on the VPS before merging, push a `wip-*` branch and `git show origin/wip-x:index.html`; squash-merge into `main` afterwards.
- **Deleting a branch:** the Claude session's git proxy refuses it — run `gh api -X DELETE repos/altrudev/Ripple/git/refs/heads/<branch>` on the VPS.
- **Desktop Commander** returns after ~3 s: start long jobs in the background (`(cmd > /tmp/x.log 2>&1 &)`), wait, then read the log.
- **Screenshots of the map:** the force layout needs ~5–9 s to settle; screenshot earlier and clusters look mixed when they aren't.
- **GitHub limits:** on 2026-11-18 the VPS `gh` login used all 5,000 calls for an hour — something else on the VPS calls GitHub heavily (Ripple used < 200). If `gh` returns 403, check `gh api rate_limit` and wait for the reset.

## 9. Known limits and loose ends

- `README.md` still describes v0.3 — needs Val's wording for the new features (time, health, purpose, suggested links, inside a file).
- Function readers: JS/TS, Python, Go, Rust, PHP, GDScript, Ruby only. Not yet Java/Kotlin/C#/C/C++/Swift/Dart/Lua, or inline `<script>` in single-file HTML apps (Ripple itself can't be opened inside).
- Inside a file: static reading — calls through variables aren't followed; `obj.save()` matches any function named `save`.
- Health per repo doesn't yet know about tests folders or CI (needs a token or the Phase 7 snapshot).
- Suggested links between files inside a repo (Phase 4 "optional") not built.
- Repo mode caps at 600 source files; unauthenticated GitHub limit is ~60 calls/hour per visitor.

## 10. Next: Phase 6 — Movement (watch it run)

Goal from the roadmap: pick an entry point → particles travel along edges in load/run order, so structure becomes behaviour. **Done when** picking `.github/workflows/*.yml` in PWX animates workflow → `safeaudit.sh` → gitleaks / trivy / semgrep.

Suggested shape (keep it in the existing patterns):
- CORE: `runOrder(byId, entryId)` → BFS along `out` edges (what it loads/runs/imports) → `Map id → step`; test it on the sample and a PWX-like workflow (core tests already have one).
- Entry points: `ENTRY_RE` already recognises them; add an "Entry points" insight card and a **Watch it run** button in the details of any file, workflow, page or (inside a file) function.
- Drawing: particles move along edges from step *d* to *d+1*, one wave at a time; objects light up as they're reached; a small "step 3 of 7" control to pause/step. Workflows: label edges job → step → script → tool.
- Same no-scroll rule, reasons on hover ("reached at step 2: runs safeaudit.sh").

## 11. Then: Phase 7 — Living portfolio on the altru.dev homepage

- **Snapshot service** on the VPS (cron, using the `gh` login): builds `ripple-snapshot.json` (repos, links, health, timeline, purpose, suggested links, plus token-only detail like tests/CI) a few times a day and uploads it to the site. Keep it in the owner's stack (Go or PHP).
- **Embed mode** in `index.html`: read-only, no top bar, loads the snapshot → zero GitHub calls from visitors, instant.
- Click a repo → its altru.dev product page when one exists (products table), else GitHub.
- **Done when** the homepage map loads in < 1 s, fits the hero area without scrolling, and works on phones.

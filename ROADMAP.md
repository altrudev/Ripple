# Ripple — Roadmap

Last updated: 2026-11-18 · Current version: **v0.2 (live)**

Ripple's idea in one line: *code becomes visual objects; flip a switch, see the consequence.*
The goal of the next versions is to make the map feel **alive** (time, health), **meaningful** (purpose, ghost links) and **actionable** (what to fix next) — and to put it on the altru.dev homepage as a living portfolio.

---

## Where we are (v0.2 — shipped 2026-11-18)

| Area | Status |
|---|---|
| Repo mode (`github.com/owner/repo`) | ✅ Every text file is an object: code ●, script ⬢, config/workflow ▲, doc ▮, outside package/tool/action/image ◆ |
| Account mode (`github.com/owner`) | ✅ Every non-fork repo is an object (rounded square, sized by repo size), coloured by name family, linked by imports / links / mentions; shared outside packages as ◆ |
| Drill-down | ✅ Account → "Map its files" → repo map → "← All repos" back |
| Zip mode + built-in sample | ✅ Works offline, also inside claude.ai previews |
| Ripple | ✅ Switch any object off → animated ripple through dependents, count + list of affected |
| Insights | ✅ Most relied on, nothing uses these, outside dependencies, installed-never-imported, missing references, runtime-loaded code; account: standalone repos, families |
| Engine model export | ✅ JSON: nodes, edges (typed), levers, effects, snapshot |
| Languages | ✅ JS/TS/Vue/Svelte, Python, HTML, CSS, shell (+shebang), YAML/workflows, Dockerfile, Markdown, Rust, Go, PHP, Ruby, C/C++, Java/Kotlin/Scala + universal "mentions" |
| Hosting | ✅ altru.dev/apps/ripple/try (static), product page altru.dev/apps/ripple (featured) |
| Tests | ✅ `tests/core.test.js` (Node, no deps). Browser tests were run ad hoc with Playwright — not yet in repo |

First real-data run (altrudev, 52 repos): 11 repo-to-repo links, 37 standalone repos, 6 families, shared packages `cryptography` ×4, `react` ×2, `jsonschema` ×2.

### Known limits
- Unauthenticated GitHub API: ~60 calls/hour per visitor IP. Repo mode = 2 calls; account mode = 1 call (READMEs/manifests come from raw.githubusercontent.com, which is not API-limited).
- Static analysis only: code loaded by computed names is flagged, not followed.
- Repo mode caps at 600 source files (code first, docs last).
- Account mode reads only README + top-level manifests per repo.
- Layout: the page scrolls (header + insights + map + side panel). **Must change — see Phase 0.**

---

## Hard requirement for everything below

**The app fits the window. No page scrolling.** On desktop the whole tool (input, insights, map, side panel) fits in `100dvh`. The map takes all remaining space; only side panels scroll internally. On phones: map full-screen, panels as a bottom sheet. The same applies to the portfolio embed on the altru.dev homepage.

UI rule (applies to every phase): *simple on the surface, meaningful detail on demand.* A visitor with no training should understand the map in 5 seconds.

---

## Phase 0 — App shell that fits the window (prerequisite)

- Single-screen grid: top bar (logo · input · mode) → slim insight strip (chips, expandable) → map | side panel.
- Collapse the big hero once a map is loaded (input moves into the top bar).
- Insight cards become a one-row strip of chips; click to expand detail in the side panel.
- Side panel = tabs: *Selected · Ripple · Outside · Insights*; each scrolls internally.
- Phone: map fills the screen, panel is a draggable bottom sheet.
- **Done when:** at 1366×768, 1920×1080 and 390×844 the document never scrolls (`document.scrollingElement.scrollHeight === innerHeight`), all features reachable.

## Phase 1 — Time (the map breathes)

- **Account:** timeline slider from first `created_at` to today. Repos appear at birth; glow intensity = recency of `pushed_at`; untouched repos fade. Play button animates the history. *(Data already in the one repo-list call.)*
- **Repo:** commit timeline from `/repos/{o}/{r}/commits?per_page=100` (1 call). File-level "first seen / last touched" needs per-commit file lists → token-only, or via the snapshot service (Phase 7).
- **Done when:** dragging the slider re-renders in <16 ms per frame for 100 repos; activity glow visible without explanation.

## Phase 2 — Health (vital-sign rings)

- Ring around each object: green / amber / grey.
- **Account signals (no extra calls):** has description, license, archived, open issues, days since push, has README (already fetched), has manifest.
- **Account signals (token or snapshot):** tests folder, CI workflow present.
- **Repo signals:** per file — test coverage hint (a test file references it), hub-without-tests warning, size, unknown runtime loads.
- "Needs attention" list in the side panel, sorted by risk = reach × missing safety.
- **Done when:** every ring has a one-line "why" on hover.

## Phase 3 — Meaning (group by purpose, not by name)

- Group toggle: *Family · Purpose · Language*.
- Purpose from repo `topics` + description keywords (deterministic classifier first: agent safety/assurance, accessibility, games, privacy tools, web apps, developer tools, research…). Optional AI labelling later, clearly marked as a guess.
- **Done when:** the altrudev map shows readable purpose clusters with a legend, and every label is explainable ("matched: 'assurance', 'agent'").

## Phase 4 — Ghost links (what *should* be connected)

- Faint dotted lines between repos that never reference each other but clearly belong together: description/README similarity (TF-IDF cosine, in-browser) + shared dependencies + same family.
- Side panel: "Suggested links" with a one-click **copy README snippet** ("## Related projects …").
- Optional: suggested file links inside a repo (e.g. a doc that should mention a script).
- **Done when:** for altrudev it proposes links for most of the 37 standalone repos, each with a stated reason.

## Phase 5 — Zoom all the way in (semantic zoom)

- One continuous zoom: account → repo → file → functions/classes inside a file.
- Function extraction per language (JS/TS, Python, Go, Rust, PHP first); call edges within a file; cross-file calls where imports make them unambiguous.
- **Done when:** zooming into a file shows its functions as objects and switching a function off ripples to its callers.

## Phase 6 — Movement (watch it run)

- Pick an entry point (web page, CLI script, workflow, `main`) → particles travel along edges in load/run order (BFS depth), so structure becomes behaviour.
- Workflows: show job → step → script → tool chains as a flow.
- **Done when:** picking `.github/workflows/*.yml` in PWX animates workflow → `safeaudit.sh` → gitleaks/trivy/semgrep.

## Phase 7 — Living portfolio on the altru.dev homepage

- Read-only, window-fitting embed of the altrudev account map on the homepage; click a repo → its product page (if one exists in the altru.dev products table) or GitHub.
- **Snapshot service** (hybrid, avoids visitor rate limits): a small script on the VPS (cron, using the existing `gh` login) builds `ripple-snapshot.json` (repos, links, health, timeline) a few times a day and uploads it to altru.dev. The embed loads the JSON — zero GitHub calls from visitors, instant load.
- Same snapshot unlocks token-level detail (tests, CI, commit history) for Phases 1–2 without visitors needing a token.
- **Done when:** homepage map loads in <1 s, fits the hero area without scrolling, and works on mobile.

---

## Later / ideas parked

- Compare two commits/branches → visual drift (ties into MCP DriftGuard).
- Private repos via GitHub App instead of pasted tokens.
- Engine reuse: same renderer for interactive quotes, agent-permission previews, living agreements (the original "configurator" idea).
- Export a map as an image/SVG for READMEs.

## Working rules for contributors (and AI sessions)

1. One `index.html`, vanilla JS, no build step, no frameworks. CDN only for JSZip.
2. Keep the CORE section pure (no DOM) so `tests/core.test.js` can run it in Node.
3. Every change: run `node tests/core.test.js`, then a headless browser check (sample, a zip, a real repo, an account).
4. Deploy = copy `index.html` to the live path, back up the previous file first, verify the live file's SHA-256 matches.
5. Plain language in the UI. No jargon on the surface.

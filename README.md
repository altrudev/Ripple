# Ripple

**Paste a repo. Switch something off. Watch what breaks.**

Ripple turns code into visual objects. Every file — code, scripts, configs, workflows and docs — becomes an object on a live map, linked by what it imports, runs, mentions or uses. Switch any object off and a ripple spreads through everything that depends on it.

**Try it:** https://altru.dev/apps/ripple/try
**Product page:** https://altru.dev/apps/ripple

## Three ways in

| You paste | You get |
|---|---|
| `github.com/owner/repo` | One repo: every file as an object, plus the outside packages, tools, GitHub Actions and container images it relies on |
| `github.com/owner` | A whole account: every repo as an object, sized by repo size, coloured by family, linked where one repo uses, links to or names another |
| a `.zip` | Any project, offline — nothing leaves the browser |

## What it reads

**21 languages:** JavaScript, TypeScript, Python, Go, Rust, Java, Kotlin, Scala, C, C++, C#, PHP, Ruby, Swift, Dart, Lua, Solidity, GDScript (Godot), Shell, HTML, CSS — plus Vue and Svelte components, web/service workers, extensionless scripts with a shebang.

**Also:** GitHub workflows and YAML, Dockerfiles, Markdown links, Godot scenes/project files, and manifests (package.json, pyproject.toml, requirements.txt, Cargo.toml, go.mod, pubspec.yaml) — plus a universal "mentions" pass that links any file naming another file of the repo.

## What it tells you

- What everything leans on most (and how far a break would spread)
- Files nothing uses (leftovers, or entry points)
- Packages installed but never imported
- References to files that don't exist
- Code loaded by name at runtime that no static map can see
- For an account: standalone repos, families, shared outside packages

## Privacy

Runs entirely in your browser. No server, no account, no tracking. It talks only to GitHub (`api.github.com`, `raw.githubusercontent.com`) to read what you ask for. An optional GitHub token stays in memory for that tab and is never stored.

## How it's built

One self-contained `index.html`, vanilla JavaScript, no build step. Drop it on any static host.

- **Core** (between `// ===== CORE START =====` and `// ===== CORE END =====`): per-language readers → one graph of nodes and edges. Pure functions, testable in Node.
- **UI**: canvas force map, panels, ripple animation.
- **Engine model**: "Copy engine model" exports the map as JSON — nodes, edges, levers, effects and a snapshot of your switches. The same format is meant to drive interactive quotes, agent-permission previews and agreements later.

```
node tests/core.test.js     # parser + graph tests, no dependencies
```

See [ROADMAP.md](ROADMAP.md) for where this is going.

## License

Apache-2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).

— Val (ALTRU.dev)

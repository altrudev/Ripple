// Ripple core tests — no dependencies. Run: node tests/core.test.js
// Loads the CORE section (+ SAMPLE) straight out of index.html and checks the graph it builds.
const fs = require('fs'), path = require('path'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.split('<script>\n')[1].split('</script>\n</body>')[0];
const core = script.split('// ===== CORE START =====')[1].split('// ===== UI =====')[0];
const R = {};
new Function('R', core + ';R.buildGraph=buildGraph;R.linkUp=linkUp;R.rippleFrom=rippleFrom;R.SAMPLE=SAMPLE;R.wanted=wanted;R.kindOf=kindOf;R.repoLook=repoLook;R.commitGlow=commitGlow;R.addedTimes=addedTimes;R.DAY=DAY;R.fileHealth=fileHealth;R.repoHealth=repoHealth;R.classifyPurpose=classifyPurpose;R.ghostLinks=ghostLinks;R.fileFunctions=fileFunctions;R.insideGraph=insideGraph;')(R);

let passed = 0;
function test(name, fn) { try { fn(); passed++; console.log('ok  ', name); } catch (e) { console.error('FAIL', name, '\n     ', e.message); process.exitCode = 1; } }
const edge = (g, a, b, how) => g.edges.some(e => e.from === a && e.to === b && (!how || e.how === how));

test('sample PWA: imports, workers, CDN, unused deps, missing, runtime loads', () => {
  const g = R.buildGraph(R.SAMPLE);
  assert(edge(g, 'js/app.js', 'js/router.js', 'imports'));
  assert(edge(g, 'sw.js', 'js/sw-cache.js', 'runs'), 'importScripts bare name is a path');
  assert(edge(g, 'js/app.js', 'sw.js', 'runs'), 'serviceWorker.register');
  assert(edge(g, 'index.html', 'pkg:cdn:marked'));
  assert.deepStrictEqual(g.unusedDeps, ['lodash']);
  assert.strictEqual(g.missing.length, 1);
  assert.strictEqual(g.unknownTotal, 1);
});

test('ripple: removing dayjs reaches its dependents in depth order', () => {
  const g = R.buildGraph(R.SAMPLE), by = R.linkUp(g), d = R.rippleFrom(['pkg:dayjs'], by);
  assert.strictEqual(d.get('js/utils/format.js'), 1);
  assert.strictEqual(d.get('index.html'), 4);
});

test('shell repo (PWX-like): workflow, script, docs, tools, actions, images', () => {
  const g = R.buildGraph({
    '.github/workflows/ci.yml': 'jobs:\n  a:\n    steps:\n      - uses: actions/checkout@v4\n      - run: ./audit.sh .\n      - run: docker run --rm zricethezav/gitleaks:latest detect\n',
    'audit.sh': '#!/usr/bin/env bash\n# see CHECKS.md\ncommand -v trivy && trivy fs .\n',
    'CHECKS.md': 'Run `./audit.sh`', 'NOTICE': 'See the LICENSE file.', 'LICENSE': 'Apache'
  });
  const kinds = Object.fromEntries(g.nodes.filter(n => n.kind === 'file').map(n => [n.id, n.sub]));
  assert.strictEqual(kinds['.github/workflows/ci.yml'], 'workflow');
  assert.strictEqual(kinds['audit.sh'], 'script');
  assert.strictEqual(kinds['LICENSE'], 'doc');
  assert(edge(g, '.github/workflows/ci.yml', 'audit.sh', 'runs'));
  assert(edge(g, '.github/workflows/ci.yml', 'pkg:action:actions/checkout'));
  assert(edge(g, '.github/workflows/ci.yml', 'pkg:image:zricethezav/gitleaks'));
  assert(edge(g, 'audit.sh', 'pkg:tool:trivy'));
  assert(edge(g, 'NOTICE', 'LICENSE', 'mentions'));
});

test('Python: relative, absolute, package, stdlib, third-party', () => {
  const g = R.buildGraph({
    'pkg/__init__.py': 'from .core import run\n', 'pkg/core.py': 'import os\nfrom pkg.util import h\nfrom . import db\nimport requests\n',
    'pkg/util.py': '"""import fake"""\nimport numpy as np\n', 'pkg/db.py': 'from ..outside import x\n'
  });
  assert(edge(g, 'pkg/core.py', 'pkg/util.py'));
  assert(edge(g, 'pkg/core.py', 'pkg/db.py'));
  assert(edge(g, 'pkg/core.py', 'pkg:requests'));
  assert(edge(g, 'pkg/util.py', 'pkg:numpy'));
  assert(!g.nodes.some(n => n.id === 'pkg:fake'), 'docstring imports ignored');
  assert(g.missing.some(m => m.spec === '..outside'));
});

test('Go, Rust, PHP, Ruby, C, Java, CSS, Dockerfile, extensionless scripts', () => {
  const g = R.buildGraph({
    'go.mod': 'module example.com/app\n', 'cmd/main.go': 'import (\n "fmt"\n "example.com/app/internal/db"\n "github.com/spf13/cobra"\n)\n', 'internal/db/db.go': 'package db',
    'src/main.rs': 'mod net;\nuse crate::net::client;\nuse serde::Deserialize;\n', 'src/net/mod.rs': 'pub mod client;\n', 'src/net/client.rs': '',
    'web/index.php': "<?php require_once __DIR__ . '/inc/db.php';", 'web/inc/db.php': '<?php',
    'lib/a.rb': "require_relative 'b'\n", 'lib/b.rb': '', 'c/main.c': '#include "util.h"\n', 'c/util.h': '',
    'App.java': 'import com.acme.Util;\n', 'com/acme/Util.java': '',
    'site/a.css': "@import 'b.css';", 'site/b.css': '',
    'Dockerfile': 'FROM node:20\nCOPY package.json ./\nRUN npm ci\n', 'package.json': '{}',
    'tools/deploy': '#!/bin/bash\nsource ./tools/env.sh\nrsync -a x y\n', 'tools/env.sh': 'X=1'
  });
  assert(edge(g, 'cmd/main.go', 'internal/db/db.go'));
  assert(edge(g, 'cmd/main.go', 'pkg:github.com/spf13/cobra'));
  assert(edge(g, 'src/main.rs', 'src/net/mod.rs'));
  assert(edge(g, 'src/net/mod.rs', 'src/net/client.rs'));
  assert(edge(g, 'src/main.rs', 'pkg:serde'));
  assert(edge(g, 'web/index.php', 'web/inc/db.php'));
  assert(edge(g, 'lib/a.rb', 'lib/b.rb'));
  assert(edge(g, 'c/main.c', 'c/util.h'));
  assert(edge(g, 'App.java', 'com/acme/Util.java'));
  assert(edge(g, 'site/a.css', 'site/b.css'));
  assert(edge(g, 'Dockerfile', 'pkg:image:node'));
  assert(edge(g, 'Dockerfile', 'pkg:tool:npm'));
  assert(edge(g, 'tools/deploy', 'tools/env.sh', 'runs'));
  assert(edge(g, 'tools/deploy', 'pkg:tool:rsync'));
});

test('GDScript/Godot, Solidity, C#, Swift, Dart, Lua', () => {
  const g = R.buildGraph({
    'project.godot': '[application]\nrun/main_scene="res://scenes/main.tscn"\n',
    'scenes/main.tscn': '[ext_resource type="Script" path="res://scripts/board.gd" id="1"]\n',
    'scripts/board.gd': 'extends "res://scripts/base.gd"\nconst Unit = preload("res://scripts/unit.gd")\n', 'scripts/base.gd': 'extends Node\n', 'scripts/unit.gd': '',
    'contracts/Vault.sol': 'import "./lib/Math.sol";\nimport {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";\n', 'contracts/lib/Math.sol': '',
    'App/Program.cs': 'using System;\nusing Acme.Core;\nusing Newtonsoft.Json;\n', 'App/Core/Thing.cs': 'namespace Acme.Core;\n',
    'Sources/main.swift': 'import Foundation\nimport Alamofire\n',
    'pubspec.yaml': 'name: myapp\n', 'lib/main.dart': "import 'package:flutter/material.dart';\nimport 'package:myapp/util.dart';\nimport 'dart:io';\n", 'lib/util.dart': '',
    'game/main.lua': 'local u = require("game.util")\n', 'game/util.lua': ''
  });
  assert(edge(g, 'project.godot', 'scenes/main.tscn', 'uses'));
  assert(edge(g, 'scenes/main.tscn', 'scripts/board.gd', 'uses'));
  assert(edge(g, 'scripts/board.gd', 'scripts/base.gd', 'imports'));
  assert(edge(g, 'scripts/board.gd', 'scripts/unit.gd', 'loads'));
  assert(edge(g, 'contracts/Vault.sol', 'contracts/lib/Math.sol'));
  assert(edge(g, 'contracts/Vault.sol', 'pkg:@openzeppelin/contracts'));
  assert(edge(g, 'App/Program.cs', 'App/Core/Thing.cs'));
  assert(edge(g, 'App/Program.cs', 'pkg:Newtonsoft.Json'));
  assert(edge(g, 'Sources/main.swift', 'pkg:Alamofire'));
  assert(!g.nodes.some(n => n.id === 'pkg:Foundation'));
  assert(edge(g, 'lib/main.dart', 'lib/util.dart'));
  assert(edge(g, 'lib/main.dart', 'pkg:flutter'));
  assert(edge(g, 'game/main.lua', 'game/util.lua'));
});

test('file filter: text in, binaries and lockfiles out', () => {
  assert(R.wanted('LICENSE', 100));
  assert(R.wanted('tools/deploy', 10));
  assert(!R.wanted('a.png', 1));
  assert(!R.wanted('package-lock.json', 1));
  assert(!R.wanted('node_modules/x/index.js', 1));
});

test('time: repo look (hidden before birth, glow when recent, fade when quiet)', () => {
  const D = R.DAY, c = 1000 * D, p = 1400 * D;
  assert.strictEqual(R.repoLook(c, p, c - D), null, 'not born yet');
  assert(R.repoLook(c, p, c + D).born > 0.9, 'just born flashes');
  assert.strictEqual(R.repoLook(c, p, c + 100 * D).glow, 0, 'before last push: no claim about activity');
  assert(R.repoLook(c, p, p + 3 * D).glow > 0.9, 'recent push glows');
  assert.strictEqual(R.repoLook(c, p, p + 100 * D).glow, 0);
  assert(R.repoLook(c, p, p + 700 * D).alpha < 0.4, 'quiet for long: faded');
  assert.strictEqual(R.repoLook(c, p, p + 30 * D).alpha, 1);
});

test('time: commit glow trail and first-seen times', () => {
  const cs = [{ t: 1, files: [{ p: 'a.js', s: 'added' }] }, { t: 2 }, { t: 3, files: [{ p: 'b.js', s: 'added' }, { p: 'a.js', s: 'modified' }] }];
  const g = R.commitGlow(cs, 2);
  assert.strictEqual(g.get('b.js'), 1); assert.strictEqual(g.get('a.js'), 1);
  const g0 = R.commitGlow(cs, 1);
  assert(g0.get('a.js') > 0 && g0.get('a.js') < 1, 'older commits leave a fading trail');
  assert(!g0.has('b.js'));
  const a = R.addedTimes(cs);
  assert.strictEqual(a.get('a.js'), 1); assert.strictEqual(a.get('b.js'), 3);
});

test('health: files — tested, hub without tests, quiet', () => {
  const g = R.buildGraph(R.SAMPLE), by = R.linkUp(g), h = R.fileHealth(g.nodes);
  assert.strictEqual(h.get('js/utils/format.js').level, 'ok', 'imported by a test');
  assert.strictEqual(h.get('js/store.js').level, 'ok');
  assert.strictEqual(h.get('tests/format.test.js').level, 'ok');
  assert.strictEqual(h.get('js/ui/render.js').level, 'warn', 'many rely on it, no test');
  assert(/rely on it/.test(h.get('js/ui/render.js').why));
  assert.strictEqual(h.get('js/utils/retry.js').level, 'quiet');
  assert(!h.has('package.json'), 'configs get no ring');
  const h2 = R.fileHealth([{ id: 'src/foo.py', kind: 'file', sub: 'code', unknown: 0, inn: [], out: [] }, { id: 'tests/test_foo.py', kind: 'file', sub: 'code', unknown: 0, inn: [], out: [] }]);
  assert.strictEqual(h2.get('src/foo.py').level, 'ok', 'matched by test file name');
});

test('health: repos — archived, idle, missing pieces, healthy', () => {
  const now = 2000 * R.DAY, base = { readme: true, desc: 'x', license: 'MIT', issues: 0, pushedT: now - 5 * R.DAY };
  assert.strictEqual(R.repoHealth(base, now).level, 'ok');
  assert.strictEqual(R.repoHealth({ ...base, archived: true }, now).level, 'quiet');
  assert.strictEqual(R.repoHealth({ ...base, pushedT: now - 400 * R.DAY }, now).level, 'quiet');
  const w = R.repoHealth({ ...base, license: '', desc: '' }, now);
  assert.strictEqual(w.level, 'warn'); assert.strictEqual(w.why, 'No description · no license'); assert.strictEqual(w.miss, 2);
});

test('meaning: purpose guess is deterministic and explains itself', () => {
  const a = R.classifyPurpose('MCP-DriftGuard', 'Detects drift in agent tool servers', ['mcp', 'security'], '');
  assert.strictEqual(a.label, 'Agent safety & trust'); assert(a.words.includes('drift'));
  assert.strictEqual(R.classifyPurpose('Battleboard-Game', 'A Godot RPG', [], '').label, 'Games');
  assert.strictEqual(R.classifyPurpose('webgazer-aac', '', ['accessibility', 'assistive'], '').label, 'Accessibility');
  assert.strictEqual(R.classifyPurpose('notes', '', [], 'Just my notes.').label, 'Other', 'no telling words → Other');
  assert.strictEqual(R.classifyPurpose('x', '', [], 'one app').label, 'Other', 'a single README word is not enough');
  const code = R.classifyPurpose('x', '', [], '```\ngame game game\n```');
  assert.strictEqual(code.label, 'Other', 'code blocks are ignored');
});

test('ghost links: similar READMEs pair up, with reasons; linked pairs and unrelated repos do not', () => {
  const it = (id, text, deps = [], family = null) => ({ id, name: id, text, deps, family });
  const items = [
    it('gaze-board', 'eye gaze communication board for nonverbal users, webgazer calibration, aac symbols'),
    it('aac-kit', 'aac symbols and eye gaze input, webgazer calibration helpers for communication boards'),
    it('pay-proof', 'signed payment receipts for agents, ledger evidence, wallet', ['cryptography']),
    it('receipt-spec', 'receipt format specification, ledger evidence and signature verification', ['cryptography']),
    it('cooking', 'sourdough bread starter feeding schedule and oven temperatures'),
    it('weather', 'rain radar tiles for coastal kayaking trips'),
  ];
  const g = R.ghostLinks(items, new Set());
  const has = (a, b) => g.find(x => (x.a === a && x.b === b) || (x.a === b && x.b === a));
  assert(has('gaze-board', 'aac-kit'), 'similar READMEs');
  assert(/gaze|webgazer|aac|calibration/.test(has('gaze-board', 'aac-kit').why));
  assert(/cryptography/.test(has('pay-proof', 'receipt-spec').why), 'shared package is a reason');
  assert(!g.some(x => x.a === 'cooking' || x.b === 'cooking'), 'nothing in common → no made-up link');
  const linked = R.ghostLinks(items, new Set(['gaze-board\u0000aac-kit']));
  assert(!linked.find(x => (x.a === 'gaze-board' && x.b === 'aac-kit') || (x.b === 'gaze-board' && x.a === 'aac-kit')), 'already linked → not suggested');
});

const names = (p, src) => R.fileFunctions(p, src).defs.map(d => d.kind[0] + ':' + d.name).join(' ');
const callsIn = (g, a, b) => g.edges.some(e => e.from === a && e.to === b);

test('inside: functions per language (JS/TS, Python, Go, Rust, PHP)', () => {
  assert.strictEqual(names('a.ts', 'export async function load(x: string) {}\nconst save = async (a) => a\nclass Store {\n  private get(k: string): number { return 1 }\n}\nif (x) { y() }'), 'f:load f:save c:Store m:get');
  assert.strictEqual(names('a.py', 'import os\nclass Box:\n    def open(self):\n        pass\ndef main():\n    Box().open()\n'), 'c:Box m:open f:main');
  assert.strictEqual(names('a.go', 'package x\ntype Server struct{}\nfunc (s *Server) Handle(w int) {}\nfunc main() {}\n'), 'c:Server m:Handle f:main');
  assert.strictEqual(names('a.rs', 'pub struct Gate;\nimpl Gate {\n    pub fn open(&self) {}\n}\nfn main() {}\n'), 'c:Gate f:open f:main');
  assert.strictEqual(names('a.php', '<?php\nclass Cart {\n  public function total() {}\n}\nfunction helper($a) {}\n'), 'c:Cart f:total f:helper');
  assert.strictEqual(names('a.md', '# nope'), '');
});

test('inside: calls, top-level code, other files, callers — and the ripple reaches callers', () => {
  const g = R.insideGraph('js/ui/render.js', R.SAMPLE['js/ui/render.js'], { 'js/utils/format.js': R.SAMPLE['js/utils/format.js'] }, { 'js/ui/pages/home.js': R.SAMPLE['js/ui/pages/home.js'] });
  assert(callsIn(g, 'fn:render', 'fn:layout') && callsIn(g, 'fn:render', 'fn:header') && callsIn(g, 'fn:list', 'fn:row'), 'calls inside the file');
  assert(callsIn(g, 'fn:row', 'fn:escape') && callsIn(g, 'fn:show', 'fn:layout'), 'method calls');
  assert(callsIn(g, 'fn:show', 'fn:Toast'), 'method belongs to its class');
  assert(callsIn(g, 'fn:row', 'ext:js/utils/format.js#fmt') && callsIn(g, 'fn:header', 'ext:js/utils/format.js#fmtRange'), 'calls into another file');
  assert(callsIn(g, 'in:js/ui/pages/home.js', 'fn:render'), 'a file that calls in');
  assert(!callsIn(g, 'fn:render', 'fn:render'), 'a definition is not a call to itself');
  const by = R.linkUp(g), d = R.rippleFrom(['fn:escape'], by);
  ['fn:row', 'fn:list', 'fn:render', 'in:js/ui/pages/home.js', 'fn:show'].forEach(id => assert(d.has(id), 'ripple reaches ' + id));
  assert(!d.has('fn:header'), 'header does not use escape');
  const go = R.insideGraph('s.go', 'package x\ntype A struct{}\ntype B struct{}\nfunc (a *A) Run() { help() }\nfunc (b B) Stop() {}\nfunc help() {}\n', {}, {});
  assert(callsIn(go, 'fn:Run', 'fn:A') && callsIn(go, 'fn:Stop', 'fn:B') && !callsIn(go, 'fn:Run', 'fn:B'), 'Go methods belong to their receiver type');
  assert(callsIn(go, 'fn:Run', 'fn:help') && !callsIn(go, 'fn:help', 'fn:B'), 'plain functions belong to no type');
  const py = R.insideGraph('m.py', 'def a():\n    b()\n\ndef b():\n    pass\n\nif __name__ == "__main__":\n    a()\n', {}, {});
  assert(callsIn(py, 'fn:a', 'fn:b') && callsIn(py, 'fn:(top)', 'fn:a') && !callsIn(py, 'fn:b', 'fn:a'), 'Python body ends at dedent; top-level call');
});

console.log('\n' + passed + ' passed' + (process.exitCode ? ', some FAILED' : ''));

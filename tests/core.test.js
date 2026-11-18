// Ripple core tests — no dependencies. Run: node tests/core.test.js
// Loads the CORE section (+ SAMPLE) straight out of index.html and checks the graph it builds.
const fs = require('fs'), path = require('path'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.split('<script>\n')[1].split('</script>\n</body>')[0];
const core = script.split('// ===== CORE START =====')[1].split('// ===== UI =====')[0];
const R = {};
new Function('R', core + ';R.buildGraph=buildGraph;R.linkUp=linkUp;R.rippleFrom=rippleFrom;R.SAMPLE=SAMPLE;R.wanted=wanted;R.kindOf=kindOf;')(R);

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

test('file filter: text in, binaries and lockfiles out', () => {
  assert(R.wanted('LICENSE', 100));
  assert(R.wanted('tools/deploy', 10));
  assert(!R.wanted('a.png', 1));
  assert(!R.wanted('package-lock.json', 1));
  assert(!R.wanted('node_modules/x/index.js', 1));
});

console.log('\n' + passed + ' passed' + (process.exitCode ? ', some FAILED' : ''));

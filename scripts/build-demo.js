/**
 * Build script to bundle the editor for the GitHub Pages demo.
 * Produces: docs/rp-image-editor.bundle.js (IIFE, global = RpImageEditor)
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const DEMO = path.join(ROOT, 'demo');

// Ensure docs/demo directories exist
fs.mkdirSync(DOCS, { recursive: true });
fs.mkdirSync(DEMO, { recursive: true });

// Bundle with esbuild
console.log('Bundling editor for demo...');
execSync(
  [
    'npx esbuild',
    'packages/core/src/index.ts',
    '--bundle',
    '--format=iife',
    '--global-name=RpImageEditor',
    '--sourcemap',
    '--minify',
    '--target=es2020',
    '--outfile=docs/rp-image-editor.bundle.js',
  ].join(' '),
  { cwd: ROOT, stdio: 'inherit' }
);

// Mirror to demo/ so `npx serve demo` always uses the latest bundle
fs.copyFileSync(
  path.join(DOCS, 'rp-image-editor.bundle.js'),
  path.join(DEMO, 'rp-image-editor.bundle.js'),
);
fs.copyFileSync(
  path.join(DOCS, 'rp-image-editor.bundle.js.map'),
  path.join(DEMO, 'rp-image-editor.bundle.js.map'),
);

console.log('Demo bundle built: docs/rp-image-editor.bundle.js');
console.log('Demo bundle mirrored: demo/rp-image-editor.bundle.js');

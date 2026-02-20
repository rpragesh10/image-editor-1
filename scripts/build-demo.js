/**
 * Build script to bundle the editor for the GitHub Pages demo.
 * Produces: docs/rp-image-editor.bundle.js (IIFE, global = RpImageEditor)
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');

// Ensure docs directory exists
fs.mkdirSync(DOCS, { recursive: true });

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

console.log('Demo bundle built: docs/rp-image-editor.bundle.js');

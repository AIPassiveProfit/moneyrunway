/**
 * Builds a single self-contained HTML file from the real app source.
 *
 * Run: npm run preview
 * Output: preview/money-runway-preview.html
 *
 * Everything is inlined — no CDN, no separate CSS or JS files — so the page can
 * be opened from a phone, emailed, or published as a link without a server.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import * as esbuild from 'esbuild';

const root = path.resolve(import.meta.dirname, '..');
const work = mkdtempSync(path.join(tmpdir(), 'mr-preview-'));

// 1. Bundle the React app, entry point through to the calc engine.
const cssOut = path.join(work, 'app.css');
const bundle = await esbuild.build({
  entryPoints: [path.join(root, 'preview/entry.tsx')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  jsx: 'automatic',
  write: false,
  define: { 'process.env.NODE_ENV': '"production"' },
  alias: { '@': path.join(root, 'src') },
  loader: { '.css': 'empty' },
});
const js = bundle.outputFiles[0].text;

// 2. Compile Tailwind against the same source files the app uses.
execFileSync(
  'npx',
  ['@tailwindcss/cli', '-i', path.join(root, 'preview/input.css'), '-o', cssOut, '--minify'],
  { cwd: root, stdio: 'inherit' },
);
const css = readFileSync(cssOut, 'utf8');

// 3. Assemble one file.
const html = `<title>Money Runway</title>
<style>
${css}
/* The app commits to one light, calm look on purpose — it is the brand. */
html, body { background: #f7f4ee; color: #102a43; margin: 0; }
#root { min-height: 100vh; }
</style>
<div id="root"></div>
<script>
${js}
</script>
`;

const out = path.join(root, 'preview/money-runway-preview.html');
writeFileSync(out, html);

const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`\nBuilt ${path.relative(root, out)} (${kb} KB)`);

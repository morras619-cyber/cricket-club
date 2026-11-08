// The production build: `npm run build` writes dist/, the folder that is published or wrapped for Android (Capacitor).
// The game loads most pictures and sounds by names it builds while running (img/batter-${team}.webp), so img/ and snd/ are copied across untouched
// rather than bundled; the code and the stylesheet are bundled and minified.
import { defineConfig } from 'vite';
import { cpSync, existsSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const copyAssets = () => ({
  name: 'copy-game-assets',
  closeBundle() {
    for (const d of ['img', 'snd']) if (existsSync(d)) cpSync(d, resolve('dist', d), { recursive: true });
    // The service worker and the web manifest must sit at the root, under their own names (the manifest's icon paths and "./" scope are relative to it).
    cpSync('sw.js', resolve('dist/sw.js')); cpSync('manifest.webmanifest', resolve('dist/manifest.webmanifest'));
    const page = resolve('dist/index.html'), html = readFileSync(page, 'utf8');
    const fixed = html.replace(/href="\.\/assets\/manifest-[^"]+\.webmanifest"/, 'href="manifest.webmanifest"');
    if (fixed === html) throw new Error('build: the manifest link was not found in dist/index.html');
    writeFileSync(page, fixed);
    for (const f of readdirSync(resolve('dist/assets'))) if (/^manifest-.*\.webmanifest$/.test(f)) rmSync(resolve('dist/assets', f));
  },
});

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [copyAssets()],
  build: { target: 'es2020', outDir: 'dist', emptyOutDir: true, assetsInlineLimit: 0, chunkSizeWarningLimit: 2000, sourcemap: false },
});

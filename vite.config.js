// The production build: `npm run build` writes dist/, the folder that is published or wrapped for Android (Capacitor).
// The game loads most pictures and sounds by names it builds while running (img/batter-${team}.webp), so img/ and snd/ are copied across untouched
// rather than bundled; the code and the stylesheet are bundled and minified.
import { defineConfig } from 'vite';
import { cpSync, existsSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const copyAssets = () => ({
  name: 'copy-game-assets',
  closeBundle() {
    for (const d of ['img', 'snd', 'fonts']) if (existsSync(d)) cpSync(d, resolve('dist', d), { recursive: true });
    // The service worker and the web manifest must sit at the root, under their own names (the manifest's icon paths and "./" scope are relative to it).
    cpSync('sw.js', resolve('dist/sw.js')); cpSync('manifest.webmanifest', resolve('dist/manifest.webmanifest'));
    const page = resolve('dist/index.html'), html = readFileSync(page, 'utf8');
    const fixed = html.replace(/href="\.\/assets\/manifest-[^"]+\.webmanifest"/, 'href="manifest.webmanifest"');
    if (fixed === html) throw new Error('build: the manifest link was not found in dist/index.html');
    writeFileSync(page, fixed);
    for (const f of readdirSync(resolve('dist/assets'))) if (/^manifest-.*\.webmanifest$/.test(f)) rmSync(resolve('dist/assets', f));
  },
});

// The source keeps its small painted images as base64 text inside js/packed.js, js/shoparts.js and css/style.css (that is how the web version stays under its file
// limit). In the build they become real image files: the text is not downloaded and parsed at start-up, and each picture is decoded only when it is used.
const unpackImages = () => ({
  name: 'unpack-embedded-images',
  generateBundle(_, bundle) {
    const made = new Map();
    const file = (type, b64) => {
      const hash = createHash('sha1').update(b64).digest('hex').slice(0, 10), name = `assets/emb-${hash}.${type === 'jpeg' ? 'jpg' : type}`;
      if (!made.has(name)) { made.set(name, 1); this.emitFile({ type: 'asset', fileName: name, source: Buffer.from(b64, 'base64') }); }
      return name.slice('assets/'.length);   // (the chunk and the stylesheet both sit in assets/)
    };
    let n = 0;
    for (const f of Object.values(bundle)) {
      if (f.type === 'chunk') {
        f.code = f.code.replace(/(["'`])data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/=]+)\1/g, (_, q, t, b64) => { n++; return `new URL(${JSON.stringify(file(t, b64))},import.meta.url).href`; });
      } else if (f.fileName.endsWith('.css')) {
        f.source = String(f.source).replace(/url\((["']?)data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/=]+)\1\)/g, (_, q, t, b64) => { n++; return `url(${file(t, b64)})`; });
      }
    }
    this.info?.(`unpacked ${n} embedded images into ${made.size} files`);
  },
});

// The web version takes its type from Google Fonts; the build ships the same faces (fonts/, latin and latin-ext) so the app needs no network for its text.
const localFonts = () => ({
  name: 'local-fonts',
  transformIndexHtml(html) {
    const out = html.replace(/<link[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>\s*/g, '');
    if (out === html) throw new Error('build: the Google Fonts links were not found in index.html');
    return out.replace('</head>', '<link rel="stylesheet" href="fonts/fonts.css">\n</head>');
  },
});

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [localFonts(), unpackImages(), copyAssets()],
  build: { target: 'es2022', outDir: 'dist', emptyOutDir: true, assetsInlineLimit: 0, chunkSizeWarningLimit: 2000, sourcemap: false },
});

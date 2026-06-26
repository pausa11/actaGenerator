const { existsSync, mkdirSync, copyFileSync } = require('fs');
const { resolve } = require('path');

const src = resolve(__dirname, '../node_modules/@ffmpeg/core/dist/umd');
const dest = resolve(__dirname, '../public/ffmpeg');

if (!existsSync(src)) {
  console.warn('[copy-ffmpeg] @ffmpeg/core not found in node_modules — skipping');
  process.exit(0);
}

if (!existsSync(dest)) mkdirSync(dest, { recursive: true });

const files = ['ffmpeg-core.js', 'ffmpeg-core.wasm', 'ffmpeg-core.worker.js'];
for (const f of files) {
  const srcPath = `${src}/${f}`;
  if (existsSync(srcPath)) {
    copyFileSync(srcPath, `${dest}/${f}`);
    console.log(`[copy-ffmpeg] Copied ${f}`);
  }
}

// Builds one self-contained page (code and styles inline) for the claude.ai share link.
// Usage: npm run build && node tools/build-share.mjs <outdir>
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] || 'share';
const assets = join('dist', 'assets');
const files = readdirSync(assets);
const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');
const js = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n').replace(/<\/script/gi, '<\\/script');
const icon = 'data:image/svg+xml;base64,' + readFileSync('public/icon.svg').toString('base64');

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'page.html'), `<title>myDoc</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="icon" href="${icon}">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Kaushan+Script&family=Poppins:wght@400;500;600;700;800&display=swap">
<style>:root{color-scheme:light}html,body{background:#E4E8EC}${css}</style>
<div id="root"></div>
<script type="module">${js}</script>
`);
console.log('wrote', join(out, 'page.html'));

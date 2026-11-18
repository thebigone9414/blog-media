// 감명 예시 캡처 - 사이트의 「예시 보기」 창을 그대로 찍는다 (운영자 지정 2026-11-18).
//
// 무엇을  mindlumi.ai 홈의 상품별 「예시 보기 →」 를 눌렀을 때 뜨는 예시 보고서(운영자 본인 명반으로 만든 공개 예시)를
//         소제목 단위 그림으로 잘라 저장한다. 블로그 글과 숏츠에서 「이런 감명 결과를 받는다」를 보여 줄 때 쓴다.
// 원리    capture_chart.mjs 와 같다. Star-Chart 를 이 컨테이너에서 개발 서버로 띄우고 외부 요청은 전부 막는다.
//         글씨체는 사이트와 같은 웹폰트를 npm(@fontsource)으로 넣고, 적용이 안 됐으면 그림을 남기지 않는다.
//         관리자 표시 플래그를 세우지 않는다. 방문자가 보는 화면 그대로다.
//
// 사용    node capture_example.mjs <Star-Chart 경로> <출력 폴더> <상품 이름> [slug]
//  상품   「인생 전체 흐름」「10년 흐름」「올해 흐름」「돈과 재물」「일과 직장」「사랑과 배우자」「자녀」 (홈 화면의 상품 이름 그대로)
//  예     node capture_example.mjs /home/claude/star-chart ../examples "올해 흐름" sohan
// 결과    <slug>-00-top.png (창 머리 + 첫 화면) · <slug>-01.png … (소제목 단위) · <slug>-sections.json (소제목 글자 목록)
//
// ⛔ 예시 보고서에 없는 내용을 덧붙이거나 고쳐 찍지 않는다. ⛔ 실고객 보고서(/r/...)는 찍지 않는다.
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import { createRequire } from 'node:module';
import path from 'node:path';

const [repo, outDir, product, slugArg] = process.argv.slice(2);
if (!product) { console.error('인자 부족. 파일 머리말의 사용법 참고'); process.exit(2); }
const slug = slugArg || 'example';
const PORT = 5198;
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const FONTS = { 'gowun-batang': [400, 700], 'noto-serif-kr': [400, 700, 900], 'noto-sans-kr': [300, 400, 500, 700] };
const fontDir = path.join(os.homedir(), '.cache', 'mindlumi-fonts');
const fontMods = path.join(fontDir, 'node_modules', '@fontsource');
if (!Object.keys(FONTS).every(k => fs.existsSync(path.join(fontMods, k)))) {
  fs.mkdirSync(fontDir, { recursive: true });
  if (!fs.existsSync(path.join(fontDir, 'package.json'))) fs.writeFileSync(path.join(fontDir, 'package.json'), '{"private":true}');
  execSync('npm install --no-audit --no-fund ' + Object.keys(FONTS).map(k => '@fontsource/' + k).join(' '), { cwd: fontDir, stdio: 'ignore' });
}
const FONT_HOST = 'https://fonts.gstatic.com/local/';
let fontCss = '';
for (const [pkg, weights] of Object.entries(FONTS)) for (const w of weights) {
  fontCss += fs.readFileSync(path.join(fontMods, pkg, `${w}.css`), 'utf8').replaceAll('url(./files/', `url(${FONT_HOST}${pkg}/files/`) + '\n';
}

const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
  cwd: repo, stdio: 'ignore',
  env: { ...process.env, VITE_SUPABASE_URL: 'http://127.0.0.1:9', VITE_SUPABASE_ANON_KEY: 'local-capture' },
});
const stop = () => { try { vite.kill('SIGTERM'); } catch {} };
process.on('exit', stop);
const base = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(base)).ok) break; } catch {}
  await new Promise(r => setTimeout(r, 1000));
  if (i === 59) { console.error('개발 서버가 뜨지 않음'); process.exit(1); }
}

const browser = await chromium.launch();
// 창 안이 스크롤되지 않도록 화면을 아주 길게 잡는다. 폭은 휴대폰 폭.
const ctx = await browser.newContext({ viewport: { width: 430, height: 16000 }, deviceScaleFactor: 2 });
await ctx.route('**/*', r => {
  const u = r.request().url();
  if (u.startsWith(base)) return r.continue();
  if (u.startsWith('https://fonts.googleapis.com/')) return r.fulfill({ contentType: 'text/css', body: fontCss });
  if (u.startsWith(FONT_HOST)) {
    const f = path.join(fontMods, u.slice(FONT_HOST.length).split('?')[0]);
    if (f.startsWith(fontMods) && fs.existsSync(f)) return r.fulfill({ contentType: f.endsWith('.woff2') ? 'font/woff2' : 'font/woff', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(f) });
  }
  return r.abort();
});
const page = await ctx.newPage();
await page.goto(`${base}/#/`, { waitUntil: 'domcontentloaded' });
await page.getByText('예시 보기').first().waitFor({ timeout: 60000 });

// 상품 이름이 든 가장 가까운 칸의 「예시 보기」 를 누른다.
const clicked = await page.evaluate((name) => {
  const btns = [...document.querySelectorAll('button')].filter(b => b.textContent.includes('예시 보기'));
  for (const b of btns) {
    let el = b;
    // 그 버튼만 들어 있는 가장 작은 칸(예시 보기 버튼이 하나뿐인 조상)에 상품 이름이 있어야 한다.
    for (let i = 0; i < 6 && el; i++) {
      el = el.parentElement; if (!el) break;
      const n = [...el.querySelectorAll('button')].filter(x => x.textContent.includes('예시 보기')).length;
      if (n > 1) break;
      if (el.textContent.includes(name)) { b.click(); return true; }
    }
  }
  return false;
}, product);
if (!clicked) { console.error(`「${product}」 상품의 예시 보기 버튼을 찾지 못함`); await browser.close(); stop(); process.exit(4); }

const dialog = page.locator('[role="dialog"]').first();
await dialog.waitFor({ timeout: 15000 });
await page.waitForTimeout(1500);
await page.waitForLoadState('networkidle');

fs.mkdirSync(outDir, { recursive: true });
// 본문이 iframe(완성형 HTML 예시)이면 그 안을, 아니면 창 자체를 본다.
const frameEl = await dialog.locator('iframe').first().elementHandle().catch(() => null);
const frame = frameEl ? await frameEl.contentFrame() : null;
const root = frame || page;
await root.evaluate(() => document.fonts.ready);
const fontBad = await page.evaluate(() => {
  const loaded = new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/["']/g, '')));
  return ['Noto Sans KR'].filter(n => !loaded.has(n));
});
if (fontBad.length) { console.error('웹폰트 미적용: ' + fontBad.join(', ') + ' - 캡처를 남기지 않는다'); await browser.close(); stop(); process.exit(3); }
await page.waitForTimeout(800);

const out = [];
// 소제목(h2, 없으면 h3) 위치로 자른다. 좌표는 페이지 기준.
const offset = frameEl ? await frameEl.boundingBox() : { x: 0, y: 0 };
const heads = await root.evaluate((inFrame) => {
  const scope = inFrame ? document : document.querySelector('[role="dialog"]');
  let hs = [...scope.querySelectorAll('h2')]; if (hs.length < 2) hs = [...scope.querySelectorAll('h3')];
  const body = inFrame ? document.documentElement : scope;
  const last = hs[hs.length - 1]; let end = last;
  if (last) { const sibs = [...last.parentElement.children]; end = sibs[sibs.length - 1]; }
  const bottom = end ? end.getBoundingClientRect().bottom + 10 : (inFrame ? document.documentElement.scrollHeight : scope.getBoundingClientRect().bottom);
  return { heads: hs.map(h => ({ t: h.textContent.trim().replace(/\s+/g, ' '), y: h.getBoundingClientRect().top })), bottom, width: (inFrame ? document.documentElement.clientWidth : scope.getBoundingClientRect().width), left: inFrame ? 0 : scope.getBoundingClientRect().left };
}, !!frame);
const secs = [];
for (let i = 0; i < heads.heads.length; i++) {
  const y0 = heads.heads[i].y - 14, y1 = (i + 1 < heads.heads.length ? heads.heads[i + 1].y : heads.bottom) - 6;
  const h = Math.max(40, Math.min(y1 - y0, 2600));
  const f = path.join(outDir, `${slug}-${String(i + 1).padStart(2, '0')}.png`);
  await page.screenshot({ path: f, clip: { x: offset.x + heads.left, y: offset.y + Math.max(0, y0), width: heads.width, height: h } });
  out.push(f); secs.push({ file: path.basename(f), title: heads.heads[i].t, height: Math.round(h) });
}
// 창 머리(「예시」 라벨)부터 첫 화면 - 「사이트에서 이렇게 보인다」를 보여 줄 때 쓴다.
if (heads.heads.length) {
  const top = path.join(outDir, `${slug}-00-top.png`);
  const y0 = Math.max(0, offset.y + heads.heads[0].y - 150);
  await page.screenshot({ path: top, clip: { x: offset.x + heads.left, y: y0, width: heads.width, height: 760 } });
  out.unshift(top);
}
fs.writeFileSync(path.join(outDir, `${slug}-sections.json`), JSON.stringify({ product, sections: secs }, null, 1));
out.forEach(f => console.log(f));
await browser.close();
stop();
process.exit(0);

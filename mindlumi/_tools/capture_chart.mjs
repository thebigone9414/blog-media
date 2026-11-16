// 인물 글용 실제 명반 캡처 - 관리자 로그인 없이, 운영자 PC 없이 찍는다.
//
// 원리  Star-Chart 저장소를 이 컨테이너에서 개발 서버로 띄워(사이트와 같은 코드·같은 엔진) 그 화면을 찍는다.
//       명반 계산은 전부 브라우저 안에서 돌기 때문에 운영 서버·DB·관리자 비밀번호가 필요 없다.
//       로컬 탭의 sessionStorage 에 화면 표시용 플래그만 세운다(운영 사이트에는 아무 영향이 없다).
//       외부로 나가는 요청은 전부 막는다. 고객 기록 목록은 불러오지 않으므로 캡처에 섞일 일이 없다.
// 글씨체 운영 사이트와 같은 웹폰트(Gowun Batang · Noto Serif KR · Noto Sans KR)를 쓴다 (운영자 지정 2026-11-16).
//       작업 컨테이너에서는 구글 폰트 서버가 막혀 있어, 같은 폰트를 npm(@fontsource)으로 받아 그 요청 자리에 넣어 준다.
//       폰트가 실제로 적용됐는지 검사하고, 안 됐으면 그림을 남기지 않고 실패로 끝낸다(다른 글씨체로 찍힌 명반이 나가지 않게).
//
// 사용  node capture_chart.mjs <Star-Chart 경로> <출력 폴더> <slug> <YYYY-MM-DD> <solar|lunar> <male|female> <시진 한 글자> [표시 이름]
//  예   node capture_chart.mjs /home/claude/star-chart ../ jensen 1963-02-17 solar male 묘 "젠슨 황"
// 결과  <slug>-chart-wonban.png · <slug>-chart-secondary.png · <slug>-chart-overlay.png
//
// ⛔ 공개 인물(보도로 생시가 확인된 외국인)과 표본 명반에만 쓴다. 실고객 생년월일시를 넣지 않는다.
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import { createRequire } from 'node:module';
import path from 'node:path';

const [repo, outDir, slug, date, cal, gender, hour, name = ''] = process.argv.slice(2);
if (!hour) { console.error('인자 부족. 파일 머리말의 사용법 참고'); process.exit(2); }
const [Y, M, D] = date.split('-').map(Number);
const PORT = 5199;
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

// ── 웹폰트 준비 (한 번 받아 두고 재사용) ──
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
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1100 }, deviceScaleFactor: 2 });
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
await ctx.addInitScript(() => sessionStorage.setItem('mindlumi_admin', '1'));
const page = await ctx.newPage();
await page.goto(`${base}/#/ziwei/chart`, { waitUntil: 'domcontentloaded' });
await page.getByText('명반 생성').first().waitFor({ timeout: 60000 });

if (name) await page.getByPlaceholder('이름을 입력하세요').fill(name);
await page.getByRole('button', { name: cal === 'lunar' ? '음력' : '양력', exact: true }).click();
await page.getByPlaceholder('1990년').fill(String(Y));
const selects = page.locator('select');
await selects.nth(0).selectOption(String(M));
await selects.nth(1).selectOption(String(D));
await selects.nth(2).selectOption(hour);
await page.getByRole('button', { name: gender === 'female' ? '여 (女)' : '남 (男)', exact: true }).click();
await page.getByRole('button', { name: '명반 생성', exact: true }).click();

const grid = page.locator('div.grid-cols-4').first();
await grid.waitFor({ timeout: 30000 });
const fontCheck = async () => {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  const bad = await page.evaluate(() => {
    const need = ['Gowun Batang', 'Noto Sans KR'];
    const loaded = new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/["']/g, '')));
    const failed = [...document.fonts].filter(f => f.status === 'error').length;
    return [...need.filter(n => !loaded.has(n)), ...(failed ? [`로딩 오류 ${failed}건`] : [])];
  });
  if (bad.length) { console.error('웹폰트 미적용: ' + bad.join(', ') + ' - 캡처를 남기지 않는다'); await browser.close(); stop(); process.exit(3); }
};
const shot = async (suffix) => {
  await page.waitForTimeout(600);
  await fontCheck();
  const f = path.join(outDir, `${slug}-chart-${suffix}.png`);
  await grid.screenshot({ path: f });
  console.log(f);
};
const tab = (label, row) => page.getByRole('button', { name: label, exact: true }).nth(row);

await shot('wonban');
await tab('제2명반', 0).click();
await shot('secondary');
await tab('원반', 1).click();      // 둘째 줄 = 중첩 선택 행
await tab('제2명반', 1).click();
await page.getByRole('button', { name: '중첩', exact: true }).click();
await shot('overlay');

await browser.close();
stop();
process.exit(0);

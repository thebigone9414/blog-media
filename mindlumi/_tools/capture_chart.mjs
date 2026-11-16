// 인물 글용 실제 명반 캡처 - 관리자 로그인 없이, 운영자 PC 없이 찍는다.
//
// 원리  Star-Chart 저장소를 이 컨테이너에서 개발 서버로 띄워(사이트와 같은 코드·같은 엔진) 그 화면을 찍는다.
//       명반 계산은 전부 브라우저 안에서 돌기 때문에 운영 서버·DB·관리자 비밀번호가 필요 없다.
//       로컬 탭의 sessionStorage 에 화면 표시용 플래그만 세운다(운영 사이트에는 아무 영향이 없다).
//       외부로 나가는 요청은 전부 막는다. 고객 기록 목록은 불러오지 않으므로 캡처에 섞일 일이 없다.
//
// 사용  node capture_chart.mjs <Star-Chart 경로> <출력 폴더> <slug> <YYYY-MM-DD> <solar|lunar> <male|female> <시진 한 글자> [표시 이름]
//  예   node capture_chart.mjs /home/claude/star-chart ../ jensen 1963-02-17 solar male 묘 "젠슨 황"
// 결과  <slug>-chart-wonban.png · <slug>-chart-secondary.png · <slug>-chart-overlay.png
//
// ⛔ 공개 인물(보도로 생시가 확인된 외국인)과 표본 명반에만 쓴다. 실고객 생년월일시를 넣지 않는다.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const [repo, outDir, slug, date, cal, gender, hour, name = ''] = process.argv.slice(2);
if (!hour) { console.error('인자 부족. 파일 머리말의 사용법 참고'); process.exit(2); }
const [Y, M, D] = date.split('-').map(Number);
const PORT = 5199;
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

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
await ctx.route('**/*', r => (r.request().url().startsWith(base) ? r.continue() : r.abort()));
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
const shot = async (suffix) => {
  await page.waitForTimeout(600);
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

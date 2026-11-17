import React from "react";
import {
  AbsoluteFill, Sequence, Audio, Img, staticFile, useCurrentFrame, useVideoConfig,
  interpolate, spring, Easing,
} from "remotion";

// ---------- types ----------
type Word = { w: string; s: number; e: number }; // seconds within the card
type Card = {
  tag: string; title: string; sub?: string;
  big?: string; flow?: string[]; grid?: string[]; stat?: { value: string; label: string; tone?: string };
  cta?: boolean;
  // 캐릭터 그림. image 는 한 장, images 는 두 장을 나란히(별이 만나는 장면).
  // 그림이 있으면 다른 연출(big/flow/grid)보다 우선한다 - 자막 띠까지 공간이 510px 뿐이라 겹쳐 쓸 수 없다.
  image?: string; images?: string[]; caption?: string; fit?: "cover" | "contain";
  // 찾아보기형(lookup). rows 가 있으면 카드 전체가 표 한 장이 된다 - 시청자가 자기 줄을 찾느라 멈추고 다시 본다.
  // 잘 되는 사주 숏츠(구독 수백 명 채널의 10만~30만 회)가 거의 이 형태였다(2026-11-16 벤치마크).
  // rows: [키, 값, 한마디]. note 는 표 아래 작은 주석, 자막은 띄우지 않는다(표를 가린다).
  rows?: string[][]; rowsHead?: string[]; note?: string; keyW?: number; col2W?: number; light?: boolean; pill?: string; ask?: string; pop?: boolean; motion?: boolean; bright?: boolean; hl?: string; faceBase?: string; ask2?: string; kicker?: string;
  startFrame: number; durFrames: number; words: Word[]; idx: number;
};
export type Data = {
  fps: number; series: string; accent: string; accent2: string; footerBrand: string;
  // site 를 주면 CTA 카드가 사이트를 크게 앞세우고 블로그는 아래 줄로 내려간다.
  // 사이트 홍보가 목적인 채널(MindLumi)에서 블로그 링크가 주인공이 되면 안 된다.
  cta: { naver: string; tistory: string; site?: string; siteLabel?: string };
  audio?: string | null; bgm?: string | null;
  totalFrames: number; cards: Card[];
};

const mix = (hex: string, pct: number, white = true) => {
  const n = parseInt(hex.slice(1), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = white ? 255 : 0; const f = pct / 100;
  return `rgb(${Math.round(r + (t - r) * f)},${Math.round(g + (t - g) * f)},${Math.round(b + (t - b) * f)})`;
};

// parse a title with <br> <b> <em> into lines of tokens
type Tok = { t: string; b?: boolean; em?: boolean };
function parseTitle(html: string): Tok[][] {
  return html.split("<br>").map((line) => {
    const toks: Tok[] = []; const re = /<(b|em)>(.*?)<\/\1>|([^<]+)/g; let m;
    while ((m = re.exec(line))) {
      if (m[1]) toks.push({ t: m[2], b: m[1] === "b", em: m[1] === "em" });
      else if (m[3]) toks.push({ t: m[3] });
    }
    return toks;
  });
}

const FONT = "'Noto Sans CJK KR','Noto Sans KR',sans-serif";
const EFONT = "'Noto Sans CJK KR','Noto Sans KR','Noto Color Emoji',sans-serif";

// ---------- background ----------
const Bg: React.FC<{ accent: string }> = ({ accent }) => {
  const f = useCurrentFrame();
  const dx = Math.sin(f / 90) * 30, dy = Math.cos(f / 110) * 24;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(160deg,#0b1220 0%,#0e1a2d 52%,#0a1526 100%)" }}>
      <AbsoluteFill style={{
        background: `radial-gradient(1200px 900px at ${78 + dx / 10}% ${-8 + dy / 10}%, ${mix(accent, 18)}2e, transparent 60%),
                     radial-gradient(1100px 1000px at ${10 - dx / 12}% ${108 + dy / 12}%, rgba(56,98,180,0.22), transparent 58%)`,
        transform: `translate(${dx}px,${dy}px)`,
      }} />
    </AbsoluteFill>
  );
};

// ---------- progress dots ----------
const Dots: React.FC<{ total: number; idx: number; accent: string }> = ({ total, idx, accent }) => (
  <div style={{ position: "absolute", top: 84, left: 92, right: 92, display: "flex", gap: 10 }}>
    {Array.from({ length: total }).map((_, j) => (
      <div key={j} style={{ height: 7, flex: 1, borderRadius: 99, background: j <= idx ? accent : "rgba(255,255,255,0.14)" }} />
    ))}
  </div>
);

// ---------- karaoke caption ----------
const Caption: React.FC<{ words: Word[]; tCard: number; accent2: string }> = ({ words, tCard, accent2 }) => {
  if (!words?.length) return null;
  return (
    <div style={{
      position: "absolute", left: 90, right: 150, bottom: 600, display: "flex", flexWrap: "wrap", gap: "0 16px",
      fontSize: 42, fontWeight: 800, lineHeight: 1.4, justifyContent: "center", textAlign: "center",
    }}>
      {words.map((wd, i) => {
        const spoken = tCard >= wd.s; const current = tCard >= wd.s && tCard < wd.e;
        const col = current ? accent2 : spoken ? "#ffffff" : "rgba(255,255,255,0.33)";
        const sc = current ? 1.06 : 1;
        return <span key={i} style={{ color: col, transform: `scale(${sc})`, transition: "none", display: "inline-block" }}>{wd.w}</span>;
      })}
    </div>
  );
};

// ---------- stage content ----------
const Stage: React.FC<{ card: Card; accent: string; accent2: string; cta: Data["cta"]; appear: number }> = ({ card, accent, accent2, cta, appear }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const rise = interpolate(appear, [0, 1], [40, 0]);
  const box: React.CSSProperties = { opacity: appear, transform: `translateY(${rise}px)` };

  // 캐릭터 그림 - 다른 연출보다 먼저 본다.
  if (card.image || card.images) {
    const srcs = card.images ?? [card.image as string];
    const two = srcs.length > 1;
    // 캡션이 붙으면 그만큼 그림을 줄인다. 안 줄이면 자막 띠(y≈1140)를 침범한다.
    const H = two ? 400 : card.caption ? 370 : 460;
    return (
      <div style={{ ...box, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <div style={{ display: "flex", gap: 24, alignItems: "flex-end", justifyContent: "center", width: "100%" }}>
          {srcs.map((s, i) => {
            const a = spring({ frame: frame - 4 - i * 9, fps, config: { damping: 18 } });
            return (
              <div key={i} style={{
                width: two ? "48%" : "86%", height: H, borderRadius: 28, overflow: "hidden",
                background: `${mix(accent, 10)}1a`, border: `1px solid ${mix(accent, 40)}`,
                opacity: a, transform: `translateY(${(1 - a) * 28}px) scale(${0.94 + a * 0.06})`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {/* cover 가 기본. 캐릭터는 꽉 채우는 게 낫다.
                    명반 캡처처럼 글자가 들어간 그림은 fit:"contain" 을 줘야 한다.
                    안 주면 좌우가 잘려 별 이름이 반쯤 날아간다(2026-11-15 에 실제로 그랬다). */}
                <Img src={s} style={{ width: "100%", height: "100%", objectFit: card.fit === "contain" ? "contain" : "cover" }} />
              </div>
            );
          })}
        </div>
        {card.caption && (
          <div style={{ fontSize: 44, fontWeight: 800, color: accent2, textAlign: "center" }}>{card.caption}</div>
        )}
      </div>
    );
  }
  // 3단 이상이면 조밀하게. 넉넉한 치수 그대로 3단을 그리면 세로로 624px 가 되어
  // 자막 띠(위쪽 끝 y≈1140)를 침범한다.
  if (card.flow) {
    const tight = card.flow.length >= 3;
    const pad = tight ? "24px 28px" : "38px 32px";
    const fs = tight ? 46 : 54;
    const gap = tight ? 14 : 24;
    const arrow = tight ? 34 : 48;
    return (
      <div style={{ ...box, display: "flex", flexDirection: "column", gap }}>
        {card.flow.map((s, i) => {
          const a = spring({ frame: frame - 6 - i * 7, fps, config: { damping: 16 } });
          return <React.Fragment key={i}>
            <div style={{ opacity: a, transform: `translateY(${(1 - a) * 24}px)`, padding: pad, borderRadius: 24, fontSize: fs, fontWeight: 800, textAlign: "center", background: `${mix(accent, 11)}1c`, border: `1px solid ${mix(accent, 45)}`, color: "#eafffb" }}>{s}</div>
            {i < card.flow!.length - 1 && <div style={{ fontSize: arrow, color: accent, textAlign: "center", opacity: a }}>↓</div>}
          </React.Fragment>;
        })}
      </div>
    );
  }
  if (card.grid) return (
    <div style={{ ...box, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26 }}>
      {card.grid.map((cell, i) => {
        const [k, e] = cell.split("\n"); const a = spring({ frame: frame - 6 - i * 6, fps, config: { damping: 16 } });
        return <div key={i} style={{ opacity: a, transform: `scale(${0.9 + a * 0.1})`, padding: "46px 28px", borderRadius: 26, background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.12)", textAlign: "center" }}>
          <div style={{ fontSize: 52, fontWeight: 800, color: mix(accent, 75), lineHeight: 1.2 }}>{k}</div>
          {e && <span style={{ display: "block", marginTop: 12, fontSize: 28, fontWeight: 600, color: "#8fa6ba" }}>{e}</span>}
        </div>;
      })}
    </div>
  );
  if (card.stat) {
    const tone = card.stat.tone || "none"; const col = tone === "up" ? "#34d399" : tone === "down" ? "#ff6b6b" : accent2;
    return <div style={{ ...box, display: "flex", flexDirection: "column", gap: 16, padding: "50px 44px", borderRadius: 28, background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.12)" }}>
      <div style={{ fontSize: 120, fontWeight: 900, letterSpacing: -2, lineHeight: 1, color: col }}>{card.stat.value}</div>
      <div style={{ fontSize: 40, fontWeight: 600, color: "#c3d2df" }}>{card.stat.label}</div>
    </div>;
  }
  if (card.cta && cta.site) return (
    // 사이트가 주인공. 블로그는 아래 한 줄로.
    <div style={{ ...box, display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{
        padding: "52px 44px", borderRadius: 30, textAlign: "center",
        background: `linear-gradient(135deg, ${accent}, ${mix(accent, 30, false)})`,
      }}>
        <div style={{ fontSize: 34, fontWeight: 800, color: "rgba(255,255,255,0.85)" }}>
          {cta.siteLabel ?? "지금 바로 확인"}
        </div>
        <div style={{ fontSize: 76, fontWeight: 900, color: "#ffffff", marginTop: 14, letterSpacing: -1 }}>
          {cta.site}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: "22px 30px", borderRadius: 20, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.14)" }}>
        <div style={{ width: 46, height: 46, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 900, background: "#03c75a", color: "#fff" }}>N</div>
        <span style={{ fontSize: 28, fontWeight: 600, color: "#9fb4c6" }}>{cta.naver}</span>
      </div>
    </div>
  );

  if (card.cta) return (
    <div style={{ ...box, display: "flex", flexDirection: "column", gap: 26 }}>
      {[["N", "#03c75a", "네이버 블로그", cta.naver], ["T", "#ff5a2e", "티스토리", cta.tistory]].map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 22, padding: "40px 44px", borderRadius: 24, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.14)" }}>
          <div style={{ width: 70, height: 70, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 900, background: r[1], color: "#fff" }}>{r[0]}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: "#f4f9fb" }}>{r[2]}</span>
            <span style={{ fontSize: 30, fontWeight: 600, color: "#9fb4c6", marginTop: 4 }}>{r[3]}</span>
          </div>
        </div>
      ))}
    </div>
  );
  if (card.big) return (
    <div style={{ ...box, fontSize: 60, fontWeight: 800, color: accent2, lineHeight: 1.34, letterSpacing: -0.5, padding: 40, borderRadius: 26, background: `${mix(accent2, 8)}14`, border: `1px solid ${mix(accent2, 32)}` }}
      dangerouslySetInnerHTML={{ __html: card.big.replace(/<em>/g, '<span style="color:#ff7a7a;font-size:76px;padding:0 10px;vertical-align:-6px">').replace(/<\/em>/g, "</span>") }} />
  );
  return null;
};

// ---------- lookup card (찾아보기형) ----------
// 안전 영역: 유튜브 쇼츠는 아래 약 420px 에 제목·설명, 오른쪽 약 140px 에 버튼이 덮인다.
// 표는 y 1400 위, x 930 왼쪽에서 끝낸다.
const LookupView: React.FC<{ card: Card; data: Data }> = ({ card, data }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const rows = card.rows ?? []; const lines = parseTitle(card.title);
  const RH = rows.length > 10 ? 70 : 80;
  const KW = card.keyW ?? 110; const C2 = card.col2W ?? 250;
  // 다 뜬 뒤에는 강조가 한 줄씩 내려간다. 정지 화면이면 넘겨 버린다.
  const sweepStart = 20 + rows.length * 2;
  const hi = frame > sweepStart ? Math.floor((frame - sweepStart) / 14) % rows.length : -1;
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: "#eef4f8" }}>
      <div style={{ position: "absolute", left: 70, right: 150, top: 116, display: "flex", alignItems: "center", gap: 16, fontSize: 32, fontWeight: 800, color: "#dbe7f0", opacity: 0.9 }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: `linear-gradient(135deg,${data.accent},#3862b4)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900, color: "#06131f" }}>{data.footerBrand.charAt(0).toUpperCase()}</div>{data.footerBrand}
        <span style={{ marginLeft: "auto", fontSize: 28, fontWeight: 700, color: "#8aa0b4" }}>{card.tag}</span>
      </div>
      <div style={{ position: "absolute", left: 70, right: 150, top: 196 }}>
        <div style={{ fontSize: 80, lineHeight: 1.2, fontWeight: 900, letterSpacing: -1.5, color: "#f4f9fb" }}>
          {lines.map((toks, li) => (
            <div key={li}>{toks.map((tk, ti) => (
              <span key={ti} style={{ whiteSpace: "pre", color: tk.b ? data.accent2 : "#f4f9fb" }}>{tk.t}</span>
            ))}</div>
          ))}
        </div>
        {card.sub && <div style={{ marginTop: 18, fontSize: 38, fontWeight: 700, color: mix(data.accent, 80) }}>{card.sub}</div>}
        {card.rowsHead && (
          <div style={{ marginTop: 26, display: "flex", alignItems: "center", fontSize: 26, fontWeight: 700, color: "#8aa0b4", padding: "0 18px" }}>
            <span style={{ width: KW }}>{card.rowsHead[0]}</span><span style={{ width: C2 }}>{card.rowsHead[1]}</span><span>{card.rowsHead[2]}</span>
          </div>
        )}
        <div style={{ marginTop: card.rowsHead ? 10 : 30, display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map((r, i) => {
            const a = spring({ frame: frame - 6 - i * 2, fps, config: { damping: 18 } });
            const on = i === hi;
            return (
              <div key={i} style={{
                height: RH, display: "flex", alignItems: "center", padding: "0 18px", borderRadius: 16,
                opacity: a, transform: `translateX(${(1 - a) * -30}px)`,
                background: on ? `${mix(data.accent2, 30)}3a` : i % 2 ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.07)",
                border: on ? `2px solid ${data.accent2}` : "2px solid transparent",
              }}>
                <span style={{ width: KW }}>
                  <span style={{ display: "inline-block", minWidth: 62, textAlign: "center", padding: rows.length > 10 ? "2px 12px" : "4px 12px", borderRadius: 12, fontSize: rows.length > 10 ? 36 : 42, fontWeight: 900, color: "#0b1220", background: data.accent }}>{r[0]}</span>
                </span>
                <span style={{ width: C2, fontSize: 44, fontWeight: 900, color: on ? data.accent2 : "#ffffff", whiteSpace: "nowrap" }}>{r[1]}</span>
                <span style={{ fontSize: 32, fontWeight: 600, color: "#c3d2df", whiteSpace: "nowrap" }}>{r[2]}</span>
              </div>
            );
          })}
        </div>
        {card.note && <div style={{ marginTop: 16, fontSize: 25, fontWeight: 500, color: "#8aa0b4" }}>{card.note}</div>}
        <div style={{ marginTop: 14, fontSize: 36, fontWeight: 800, color: data.accent2 }}>
          {data.cta.siteLabel ?? "내 명반 무료로 보기"} · {data.cta.site ?? ""}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- lookup card, bright (찾아보기형 밝은 판) ----------
// 2026-11-16 실제로 잘 되는 찾아보기 숏츠 5편을 열어 보고 맞춘 형태: 한 장 고정, 밝은 바탕, 화면을 위에서 아래까지 채우고,
// 시청자가 자기 출생연도를 그대로 찾는다. rows = [키, 큰 글자, 한마디, 출생연도 줄]
const LightLookupView: React.FC<{ card: Card; data: Data }> = ({ card, data }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const rows = card.rows ?? []; const lines = parseTitle(card.title);
  const many = rows.length > 10;
  const RH = many ? 84 : 94; const KW = card.keyW ?? 96; const C2 = card.col2W ?? 190;
  const INK = "#221a3a"; const RED = "#d8323c";
  const sweepStart = 20 + rows.length * 2;
  const hi = frame > sweepStart ? Math.floor((frame - sweepStart) / 14) % rows.length : -1;
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: INK, background: "linear-gradient(180deg,#fff7e8 0%,#fdebd2 55%,#f9dcc0 100%)" }}>
      <div style={{ position: "absolute", left: -120, top: -160, width: 520, height: 520, borderRadius: 999, background: `${data.accent}22` }} />
      <div style={{ position: "absolute", right: -160, top: 1500, width: 620, height: 620, borderRadius: 999, background: `${data.accent2}3a` }} />
      <div style={{ position: "absolute", left: 60, right: 60, top: 96, display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 800, color: "#5b4a8a" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg,${data.accent},#5b3fc4)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 23, fontWeight: 900, color: "#fff" }}>{data.footerBrand.charAt(0).toUpperCase()}</div>{data.footerBrand}
        <span style={{ marginLeft: "auto", fontSize: 27, fontWeight: 800, color: "#fff", background: data.accent, borderRadius: 99, padding: "4px 20px" }}>{card.tag}</span>
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, top: 162 }}>
        <div style={{ fontSize: 82, lineHeight: 1.17, fontWeight: 900, letterSpacing: -2, textAlign: "center" }}>
          {lines.map((toks, li) => (
            <div key={li}>{toks.map((tk, ti) => (
              <span key={ti} style={{ whiteSpace: "pre", color: tk.b ? RED : INK }}>{tk.t}</span>
            ))}</div>
          ))}
        </div>
        {card.pill && (
          <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: "#fff", background: RED, borderRadius: 14, padding: "8px 28px" }}>{card.pill}</span>
          </div>
        )}
        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map((r, i) => {
            const a = spring({ frame: frame - 6 - i * 2, fps, config: { damping: 18 } });
            const on = i === hi;
            return (
              <div key={i} style={{
                height: RH, display: "flex", alignItems: "center", padding: "0 16px", borderRadius: 18,
                opacity: a, transform: `translateY(${(1 - a) * 16}px)`,
                background: on ? "#fff3b8" : i % 2 ? "rgba(255,255,255,0.62)" : "#ffffff",
                border: on ? `3px solid ${RED}` : "3px solid rgba(34,26,58,0.07)",
                boxShadow: "0 3px 10px rgba(120,80,30,0.08)",
              }}>
                <span style={{ width: KW, flexShrink: 0 }}>
                  <span style={{ display: "inline-block", minWidth: 58, textAlign: "center", padding: "2px 12px", borderRadius: 12, fontSize: many ? 34 : 40, fontWeight: 900, color: "#fff", background: data.accent }}>{r[0]}</span>
                </span>
                <span style={{ width: C2, flexShrink: 0, fontSize: many ? 44 : 50, fontWeight: 900, color: on ? RED : INK, whiteSpace: "nowrap" }}>{r[1]}</span>
                <span style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
                  <span style={{ fontSize: many ? 26 : 29, fontWeight: 800, color: "#7a4bd6", whiteSpace: "nowrap" }}>{r[2]}</span>
                  {r[3] && <span style={{ fontSize: many ? 29 : 33, fontWeight: 800, color: INK, whiteSpace: "nowrap", letterSpacing: -0.5 }}>{r[3]}</span>}
                </span>
              </div>
            );
          })}
        </div>
        {card.note && <div style={{ marginTop: 14, fontSize: 25, fontWeight: 600, color: "#8a6f58", textAlign: "center" }}>{card.note}</div>}
        {card.ask && <div style={{ marginTop: 10, fontSize: 40, fontWeight: 900, color: INK, textAlign: "center" }}>{card.ask}</div>}
        <div style={{ marginTop: 10, fontSize: 34, fontWeight: 900, color: RED, textAlign: "center" }}>
          {data.cta.siteLabel ?? "내 명반 무료로 보기"} · {data.cta.site ?? ""}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- lookup card, bright professional (SureView 요약표 밝은 판) ----------
// rows = [키, 큰 글자, 한마디]. 밝은 바탕 + 흰 줄 카드. 안전 영역: 오른쪽 150, 표는 y 1400 위.
const BrightLookupView: React.FC<{ card: Card; data: Data }> = ({ card, data }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const rows = card.rows ?? []; const lines = parseTitle(card.title);
  const RH = rows.length > 8 ? 78 : 90;
  const KW = card.keyW ?? 110; const C2 = card.col2W ?? 290;
  const INK = "#0f2a3a"; const HL = card.hl ?? "#0b8f80"; const WARM = "#e8590c";
  const sweepStart = 20 + rows.length * 2;
  const hi = frame > sweepStart ? Math.floor((frame - sweepStart) / 14) % rows.length : -1;
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: INK, background: "linear-gradient(170deg,#ffffff 0%,#eef8fb 48%,#dff1f4 100%)" }}>
      <div style={{ position: "absolute", right: -180, top: -200, width: 640, height: 640, borderRadius: 999, background: `${data.accent}33` }} />
      <div style={{ position: "absolute", left: -200, top: 1480, width: 700, height: 700, borderRadius: 999, background: `${data.accent2}2e` }} />
      <div style={{ position: "absolute", left: 70, right: 150, top: 110, display: "flex", alignItems: "center", gap: 16, fontSize: 34, fontWeight: 900, color: INK }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: `linear-gradient(135deg,${data.accent},#1f6fb8)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 900, color: "#fff" }}>{data.footerBrand.charAt(0).toUpperCase()}</div>{data.footerBrand}
        <span style={{ marginLeft: "auto", fontSize: 27, fontWeight: 800, color: "#fff", background: HL, borderRadius: 99, padding: "6px 22px" }}>{card.tag}</span>
      </div>
      <div style={{ position: "absolute", left: 70, right: 150, top: 200 }}>
        <div style={{ fontSize: 82, lineHeight: 1.18, fontWeight: 900, letterSpacing: -2 }}>
          {lines.map((toks, li) => (
            <div key={li}>{toks.map((tk, ti) => (
              <span key={ti} style={{ whiteSpace: "pre", color: tk.b ? WARM : INK }}>{tk.t}</span>
            ))}</div>
          ))}
        </div>
        {card.sub && <div style={{ marginTop: 18, fontSize: 37, fontWeight: 800, color: HL }}>{card.sub}</div>}
        {card.rowsHead && (
          <div style={{ marginTop: 26, display: "flex", alignItems: "center", fontSize: 26, fontWeight: 800, color: "#5d7785", padding: "0 18px" }}>
            <span style={{ width: KW }}>{card.rowsHead[0]}</span><span style={{ width: C2 }}>{card.rowsHead[1]}</span><span>{card.rowsHead[2]}</span>
          </div>
        )}
        <div style={{ marginTop: card.rowsHead ? 10 : 30, display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r, i) => {
            const a = spring({ frame: frame - 6 - i * 2, fps, config: { damping: 18 } });
            const on = i === hi;
            return (
              <div key={i} style={{
                height: RH, display: "flex", alignItems: "center", padding: "0 18px", borderRadius: 18,
                opacity: a, transform: `translateX(${(1 - a) * -30}px)`,
                background: on ? "#fff4cc" : "#ffffff",
                border: on ? `3px solid ${WARM}` : "3px solid rgba(15,42,58,0.07)",
                boxShadow: "0 4px 14px rgba(20,70,90,0.10)",
              }}>
                <span style={{ width: KW, flexShrink: 0 }}>
                  <span style={{ display: "inline-block", minWidth: 62, textAlign: "center", padding: "4px 12px", borderRadius: 12, fontSize: 40, fontWeight: 900, color: "#fff", background: HL }}>{r[0]}</span>
                </span>
                <span style={{ width: C2, flexShrink: 0, fontSize: 46, fontWeight: 900, color: on ? WARM : INK, whiteSpace: "nowrap" }}>{r[1]}</span>
                <span style={{ fontSize: 32, fontWeight: 700, color: "#3d5866", whiteSpace: "nowrap" }}>{r[2]}</span>
              </div>
            );
          })}
        </div>
        {card.note && <div style={{ marginTop: 16, fontSize: 25, fontWeight: 600, color: "#5d7785" }}>{card.note}</div>}
        {card.ask && <div style={{ marginTop: 16, fontSize: 40, fontWeight: 900, color: INK }}>{card.ask}</div>}
        <div style={{ marginTop: 12, fontSize: 36, fontWeight: 900, color: WARM }}>
          {data.cta.siteLabel ?? "전체 글"} · {data.cta.site ?? ""}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- lookup card, pop (찾아보기형 - 눈에 띄는 판) ----------
// 운영자 지정 2026-11-16: 숏츠는 눈길을 확 끌어야 한다. 잘 되는 영상의 좋은 점(강한 색·큰 훅·그림·좋아요 유도)은 따라 한다.
// rows = [그림 자리(이모지 한 글자 또는 별 이름), 큰 글자, 빨간 한마디, 출생연도 줄]. faceBase 가 있으면 r[0] 이름의 캐릭터 얼굴을 쓴다.
const PopLookupView: React.FC<{ card: Card; data: Data }> = ({ card, data }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const rows = card.rows ?? []; const lines = parseTitle(card.title);
  const many = rows.length > 10;
  const RH = many ? 82 : 96; const C2 = card.col2W ?? 150; const AV = many ? 66 : 80;
  const GOLD = "#ffd84a"; const RED = "#d1121f"; const INK = "#1c1020";
  const pop = spring({ frame: frame - 1, fps, config: { damping: 9, stiffness: 160 } });
  const sweepStart = 16 + rows.length * 2;
  const hi = frame > sweepStart ? Math.floor((frame - sweepStart) / 12) % rows.length : -1;
  const pulse = 1 + 0.04 * Math.sin(frame / 4);
  // motion 판 (2026-11-17): 틱톡이 「움직이지 않는 이미지」를 추천에서 뺀다. 세 장면(제목 → 표가 한 줄씩 → 마무리)으로 나누고 화면 전체가 계속 움직이게 한다.
  const M = !!card.motion; const total = card.durFrames || 330;
  const IN0 = 40, IN1 = 60, ROW0 = M ? 62 : 5, RSTEP = M ? 5 : 2;
  const cl = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
  const introY = M ? interpolate(frame, [IN0, IN1], [430, 0], { ...cl, easing: Easing.out(Easing.cubic) }) : 0;
  const introS = M ? interpolate(frame, [IN0, IN1], [1.16, 1], cl) : 1;
  const zoom = M ? 1 + 0.035 * Math.min(1, Math.max(0, (frame - IN1) / Math.max(1, total - IN1))) : 1;
  const outA = M ? interpolate(frame, [total - 84, total - 68], [0, 1], cl) : 0;
  const outPop = spring({ frame: frame - (total - 80), fps, config: { damping: 10, stiffness: 140 } });
  const tailA = M ? interpolate(frame, [ROW0 + rows.length * RSTEP, ROW0 + rows.length * RSTEP + 10], [0, 1], cl) : 1;
  const sweepFrom = M ? ROW0 + rows.length * RSTEP + 10 : sweepStart;
  const hiM = frame > sweepFrom ? Math.floor((frame - sweepFrom) / 12) % rows.length : -1;
  return (
    <AbsoluteFill style={{ fontFamily: EFONT, color: "#fff", background: "radial-gradient(120% 60% at 50% 0%,#ff5a3c 0%,#d1121f 38%,#8a0b1c 100%)" }}>
      {M && <div style={{ position: "absolute", left: 540 + 380 * Math.cos(frame / 38) - 450, top: 760 + 520 * Math.sin(frame / 47) - 450, width: 900, height: 900, borderRadius: 999, background: "radial-gradient(circle, rgba(255,216,74,0.30) 0%, rgba(255,216,74,0) 65%)" }} />}
      {Array.from({ length: M ? 26 : 16 }).map((_, i) => {
        const x = M ? ((i * 197) % 1080) + 26 * Math.sin((frame + i * 13) / 21) : (i * 197) % 1080;
        const y = M ? ((((i * 331) - frame * (2 + (i % 4))) % 1920) + 1920) % 1920 : (i * 331) % 1920;
        const tw = 0.35 + 0.65 * Math.abs(Math.sin((frame + i * 9) / 11));
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: 10 + (i % 3) * 6, height: 10 + (i % 3) * 6, borderRadius: 99, background: GOLD, opacity: tw * 0.55, boxShadow: `0 0 18px ${GOLD}` }} />;
      })}
      <div style={{ position: "absolute", left: 56, right: 56, top: 92, display: "flex", alignItems: "center", gap: 12, fontSize: 28, fontWeight: 800, color: "#ffe9c2" }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: RED }}>{data.footerBrand.charAt(0).toUpperCase()}</div>{data.footerBrand}
        <span style={{ fontSize: 31, fontWeight: 900, color: "#ffffff", borderLeft: "3px solid rgba(255,233,194,0.6)", paddingLeft: 14, marginLeft: 4 }}>{card.kicker ?? "자미두수로 보는 내 사주"}</span>
        <span style={{ marginLeft: "auto", fontSize: 26, fontWeight: 900, color: RED, background: GOLD, borderRadius: 99, padding: "4px 20px" }}>{card.tag}</span>
      </div>
      <div style={{ position: "absolute", left: 56, right: 56, top: 150, transform: `translateY(${introY}px) scale(${zoom})`, transformOrigin: "50% 30%" }}>
        <div style={{ transform: `scale(${(0.7 + 0.3 * pop) * introS})`, fontSize: 92, lineHeight: 1.14, fontWeight: 900, letterSpacing: -2.5, textAlign: "center", textShadow: "0 6px 0 rgba(60,0,10,0.55), 0 0 28px rgba(255,200,80,0.35)" }}>
          {lines.map((toks, li) => (
            <div key={li}>{toks.map((tk, ti) => (
              <span key={ti} style={{ whiteSpace: "pre", color: tk.b ? GOLD : "#ffffff" }}>{tk.t}</span>
            ))}</div>
          ))}
        </div>
        {card.pill && (
          <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
            <span style={{ fontSize: 38, fontWeight: 900, color: INK, background: GOLD, borderRadius: 16, padding: "8px 30px", boxShadow: "0 5px 0 rgba(60,0,10,0.45)" }}>{card.pill}</span>
          </div>
        )}
        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map((r, i) => {
            const a = spring({ frame: frame - ROW0 - i * RSTEP, fps, config: { damping: 14 } });
            const on = i === (M ? hiM : hi);
            return (
              <div key={i} style={{
                height: RH, display: "flex", alignItems: "center", gap: 14, padding: "0 14px", borderRadius: 20,
                opacity: a, transform: `translateX(${(1 - a) * (i % 2 ? 60 : -60)}px) scale(${on ? 1.025 : 1})`,
                background: on ? "#fff2a8" : "#fffdf6", border: on ? `4px solid ${GOLD}` : "4px solid rgba(255,255,255,0.0)",
                boxShadow: on ? `0 0 26px ${GOLD}` : "0 4px 0 rgba(60,0,10,0.35)", color: INK,
              }}>
                {card.faceBase
                  ? <Img src={`${card.faceBase}${r[0]}.png`} style={{ width: AV, height: AV, borderRadius: 999, border: `4px solid ${RED}`, objectFit: "cover", flexShrink: 0 }} />
                  : <span style={{ width: AV, textAlign: "center", fontSize: AV * 0.78, lineHeight: 1, flexShrink: 0 }}>{r[0]}</span>}
                <span style={{ width: C2, flexShrink: 0, fontSize: many ? 44 : 52, fontWeight: 900, color: on ? RED : INK, whiteSpace: "nowrap", letterSpacing: -1 }}>{r[1]}</span>
                <span style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
                  <span style={{ fontSize: many ? 27 : 30, fontWeight: 900, color: RED, whiteSpace: "nowrap" }}>{r[2]}</span>
                  {r[3] && <span style={{ fontSize: many ? 29 : 33, fontWeight: 800, color: INK, whiteSpace: "nowrap", letterSpacing: -0.6 }}>{r[3]}</span>}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ opacity: tailA }}>
        {card.ask && (
          <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
            <span style={{ transform: `scale(${pulse})`, fontSize: 44, fontWeight: 900, color: INK, background: GOLD, borderRadius: 99, padding: "12px 40px", boxShadow: "0 6px 0 rgba(60,0,10,0.5)" }}>{card.ask}</span>
          </div>
        )}
        {card.ask2 && <div style={{ marginTop: 14, fontSize: 36, fontWeight: 900, color: "#fff", textAlign: "center" }}>{card.ask2}</div>}
        <div style={{ marginTop: 8, fontSize: 30, fontWeight: 800, color: "#ffe9c2", textAlign: "center" }}>
          {card.note ? `${card.note} · ` : ""}{data.cta.site ?? ""}
        </div>
        {data.cta.naver && (
          <div style={{ marginTop: 6, fontSize: 29, fontWeight: 800, color: "#ffffff", textAlign: "center" }}>📖 더 깊은 풀이 · {data.cta.naver}</div>
        )}
        </div>
      </div>
      {M && outA > 0 && (
        <AbsoluteFill style={{ opacity: outA, background: "radial-gradient(110% 70% at 50% 35%,#ff5a3c 0%,#c40f1c 45%,#6d0716 100%)", alignItems: "center", justifyContent: "center", padding: "0 70px", textAlign: "center" }}>
          <div style={{ fontSize: 40, fontWeight: 900, color: "#ffe9c2", marginBottom: 26 }}>{card.kicker ?? "자미두수로 보는 내 사주"}</div>
          {card.ask2 && <div style={{ transform: `scale(${0.6 + 0.4 * outPop})`, fontSize: 66, lineHeight: 1.25, fontWeight: 900, color: "#fff", wordBreak: "keep-all", textShadow: "0 6px 0 rgba(60,0,10,0.55)" }}>{card.ask2}</div>}
          {card.ask && <div style={{ marginTop: 44, transform: `scale(${pulse})`, fontSize: 46, fontWeight: 900, color: INK, background: GOLD, borderRadius: 99, padding: "16px 44px", boxShadow: "0 6px 0 rgba(60,0,10,0.5)" }}>{card.ask}</div>}
          <div style={{ marginTop: 40, fontSize: 60, fontWeight: 900, color: GOLD, transform: `translateY(${6 * Math.sin(frame / 6)}px)` }}>{data.cta.site ?? ""}</div>
          {data.cta.naver && <div style={{ marginTop: 16, fontSize: 32, fontWeight: 800, color: "#ffffff" }}>📖 더 깊은 풀이 · {data.cta.naver}</div>}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// ---------- one card ----------
const CardView: React.FC<{ card: Card; data: Data; total: number }> = ({ card, data, total }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const tCard = frame / fps;
  const appear = spring({ frame: frame - 2, fps, config: { damping: 18, stiffness: 120 } });
  const lines = parseTitle(card.title);
  let wi = 0;
  if (card.rows && card.bright) return <BrightLookupView card={card} data={data} />;
  if (card.rows && card.pop) return <PopLookupView card={card} data={data} />;
  if (card.rows) return card.light ? <LightLookupView card={card} data={data} /> : <LookupView card={card} data={data} />;
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: "#eef4f8" }}>
      <Dots total={total} idx={card.idx} accent={data.accent} />
      {/* watermark */}
      <div style={{ position: "absolute", right: 70, top: 150, fontSize: 300, fontWeight: 900, color: "rgba(255,255,255,0.035)", lineHeight: 1 }}>{String(card.idx + 1).padStart(2, "0")}</div>
      <div style={{ position: "absolute", inset: 0, padding: "232px 150px 860px 90px", display: "flex", flexDirection: "column" }}>
        {/* chip */}
        <div style={{ opacity: appear, transform: `translateY(${(1 - appear) * 20}px)`, display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: 14, padding: "16px 28px", border: `1px solid ${mix(data.accent, 55)}`, borderRadius: 99, fontSize: 30, fontWeight: 700, color: mix(data.accent, 80) }}>
          <span style={{ color: "#0b1220", background: data.accent, borderRadius: 8, padding: "2px 12px", fontSize: 28 }}>{String(card.idx + 1).padStart(2, "0")}</span>{card.tag}
        </div>
        {/* title with word stagger */}
        <div style={{ marginTop: 54, fontSize: 88, lineHeight: 1.26, fontWeight: 800, letterSpacing: -1, color: "#f4f9fb" }}>
          {lines.map((toks, li) => (
            <div key={li}>
              {toks.map((tk, ti) => {
                const delay = 4 + wi * 3; wi++;
                const a = spring({ frame: frame - delay, fps, config: { damping: 20 } });
                const col = tk.b ? mix(data.accent, 75) : tk.em ? data.accent2 : "#f4f9fb";
                // whiteSpace:pre - inline-block 은 토큰 가장자리 공백을 삼킨다.
                // 없으면 "그런데 <b>탐랑</b>은" 이 "그런데탐랑은" 으로 붙어 나온다.
                return <span key={ti} style={{ display: "inline-block", whiteSpace: "pre", opacity: a, transform: `translateY(${(1 - a) * 18}px)`, color: col }}>{tk.t}</span>;
              })}
            </div>
          ))}
        </div>
        {card.sub && <div style={{ marginTop: 40, fontSize: 40, lineHeight: 1.5, fontWeight: 500, color: "#9fb4c6", opacity: appear }}>{card.sub}</div>}
        {/* paddingBottom - 자막 띠(bottom:600, 최대 3줄 ≈ 180px)를 침범하지 않게 띄운다.
            자막 bottom:600 + 3줄(약 180px) 이면 자막 윗끝이 y≈1140 이므로 1920-1140=780. */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingBottom: 780 }}>
          <Stage card={card} accent={data.accent} accent2={data.accent2} cta={data.cta} appear={appear} />
        </div>
      </div>
      <Caption words={card.words} tCard={tCard} accent2={data.accent2} />
      {/* brand strip - kept high (above YouTube Shorts bottom UI) */}
      <div style={{ position: "absolute", left: 90, right: 150, top: 116, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: 0.9 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 32, fontWeight: 800, color: "#dbe7f0" }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: `linear-gradient(135deg,${data.accent},#3862b4)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900, color: "#06131f" }}>{data.footerBrand.charAt(0).toUpperCase()}</div>{data.footerBrand}
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: "#8aa0b4" }}>{data.series} #{String(card.idx + 1).padStart(2, "0")}</div>
      </div>
    </AbsoluteFill>
  );
};

export const SureViewShort: React.FC<{ data: Data }> = ({ data }) => {
  return (
    <AbsoluteFill>
      <Bg accent={data.accent} />
      {data.audio && <Audio src={staticFile(data.audio)} />}
      {data.bgm && <Audio src={staticFile(data.bgm)} volume={0.18} loop />}
      {data.cards.map((c) => (
        <Sequence key={c.idx} from={c.startFrame} durationInFrames={c.durFrames}>
          <CardView card={c} data={data} total={data.cards.length} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

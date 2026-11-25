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
  rows?: string[][]; rowsHead?: string[]; note?: string; keyW?: number; col2W?: number; light?: boolean; pill?: string; ask?: string; pop?: boolean; motion?: boolean; theme?: string; example?: { src: string; label?: string; h?: number }; hero?: string; roomy?: boolean; cine?: boolean; ep?: string; bright?: boolean; hl?: string; faceBase?: string; ask2?: string; kicker?: string; blog?: { title?: string; sub?: string; name?: string; url?: string; frames?: number };
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
const Caption: React.FC<{ words: Word[]; tCard: number; accent2: string; roomy?: boolean }> = ({ words, tCard, accent2, roomy }) => {
  if (!words?.length) return null;
  return (
    <div style={{
      position: "absolute", left: 90, right: 150, bottom: roomy ? 450 : 600, display: "flex", flexWrap: "wrap", gap: "0 16px",
      fontSize: roomy ? 44 : 42, fontWeight: 800, lineHeight: 1.4, justifyContent: "center", textAlign: "center",
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
    // roomy(넓은 배치): 그림을 가로 꽉 차게, 더 크게. 자막 띠를 아래로 내린 만큼 쓴다(자막 윗끝 y≈1290).
    const H = card.roomy ? (two ? 470 : card.caption ? 470 : 550) : two ? 400 : card.caption ? 370 : 460;
    return (
      <div style={{ ...box, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <div style={{ display: "flex", gap: 24, alignItems: "flex-end", justifyContent: "center", width: "100%" }}>
          {srcs.map((s, i) => {
            const a = spring({ frame: frame - 4 - i * 9, fps, config: { damping: 18 } });
            return (
              <div key={i} style={{
                width: two ? "48%" : card.roomy ? "100%" : "86%", height: H, borderRadius: 28, overflow: "hidden",
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
  // motion 판 (2026-11-18): 틱톡·릴스용. 표 한 장이 멈춘 그림으로 보이지 않게 세 장면(제목만 → 표가 한 줄씩 → 마무리)으로 나눈다.
  // 글자 크기·위치는 기본 판과 같다(확대 없음 - 안전영역 x 930, y 1400 을 그대로 지킨다). motion 이 없으면 예전과 똑같이 그린다.
  const M = !!card.motion; const total = card.durFrames || 360;
  const cl = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
  const IN0 = 36, IN1 = 56, ROW0 = M ? 60 : 6, RSTEP = M ? 6 : 2;
  const introY = M ? interpolate(frame, [IN0, IN1], [340, 0], { ...cl, easing: Easing.out(Easing.cubic) }) : 0;
  const bodyA = M ? interpolate(frame, [IN1 - 4, IN1 + 8], [0, 1], cl) : 1;
  const rowsEnd = ROW0 + rows.length * RSTEP;
  const tailA = M ? interpolate(frame, [rowsEnd, rowsEnd + 10], [0, 1], cl) : 1;
  const outA = M ? interpolate(frame, [total - 78, total - 62], [0, 1], cl) : 0;
  const outPop = spring({ frame: frame - (total - 74), fps, config: { damping: 14 } });
  const sweepStart = M ? rowsEnd + 12 : 20 + rows.length * 2;
  const hi = frame > sweepStart ? Math.floor((frame - sweepStart) / 14) % rows.length : -1;
  const dx = M ? 60 * Math.sin(frame / 40) : 0, dy = M ? 50 * Math.cos(frame / 52) : 0;
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: INK, background: "linear-gradient(170deg,#ffffff 0%,#eef8fb 48%,#dff1f4 100%)" }}>
      <div style={{ position: "absolute", right: -180 + dx, top: -200 + dy, width: 640, height: 640, borderRadius: 999, background: `${data.accent}33` }} />
      <div style={{ position: "absolute", left: -200 - dx, top: 1480 - dy, width: 700, height: 700, borderRadius: 999, background: `${data.accent2}2e` }} />
      {M && <div style={{ position: "absolute", left: 540 + 360 * Math.cos(frame / 44) - 380, top: 820 + 480 * Math.sin(frame / 57) - 380, width: 760, height: 760, borderRadius: 999, background: `radial-gradient(circle, ${data.accent}26 0%, ${data.accent}00 66%)` }} />}
      <div style={{ position: "absolute", left: 70, right: 150, top: 110, display: "flex", alignItems: "center", gap: 16, fontSize: 34, fontWeight: 900, color: INK }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: `linear-gradient(135deg,${data.accent},#1f6fb8)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 900, color: "#fff" }}>{data.footerBrand.charAt(0).toUpperCase()}</div>{data.footerBrand}
        <span style={{ marginLeft: "auto", fontSize: 27, fontWeight: 800, color: "#fff", background: HL, borderRadius: 99, padding: "6px 22px" }}>{card.tag}</span>
      </div>
      <div style={{ position: "absolute", left: 70, right: 150, top: 200 }}>
        <div style={{ fontSize: 82, lineHeight: 1.18, fontWeight: 900, letterSpacing: -2, transform: `translateY(${introY}px)` }}>
          {lines.map((toks, li) => (
            <div key={li}>{toks.map((tk, ti) => (
              <span key={ti} style={{ whiteSpace: "pre", color: tk.b ? WARM : INK }}>{tk.t}</span>
            ))}</div>
          ))}
        </div>
        {card.sub && <div style={{ marginTop: 18, fontSize: 37, fontWeight: 800, color: HL, opacity: bodyA }}>{card.sub}</div>}
        {card.rowsHead && (
          <div style={{ marginTop: 26, display: "flex", alignItems: "center", fontSize: 26, fontWeight: 800, color: "#5d7785", padding: "0 18px", opacity: bodyA }}>
            <span style={{ width: KW }}>{card.rowsHead[0]}</span><span style={{ width: C2 }}>{card.rowsHead[1]}</span><span>{card.rowsHead[2]}</span>
          </div>
        )}
        <div style={{ marginTop: card.rowsHead ? 10 : 30, display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r, i) => {
            const a = spring({ frame: frame - ROW0 - i * RSTEP, fps, config: { damping: 18 } });
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
        <div style={{ opacity: tailA }}>
        {card.note && <div style={{ marginTop: 16, fontSize: 25, fontWeight: 600, color: "#5d7785" }}>{card.note}</div>}
        {card.ask && <div style={{ marginTop: 16, fontSize: 40, fontWeight: 900, color: INK }}>{card.ask}</div>}
        <div style={{ marginTop: 12, fontSize: 36, fontWeight: 900, color: WARM }}>
          {data.cta.siteLabel ?? "전체 글"} · {data.cta.site ?? ""}
        </div>
        </div>
      </div>
      {M && outA > 0 && (
        <AbsoluteFill style={{ opacity: outA, background: "linear-gradient(170deg,#ffffff 0%,#eef8fb 48%,#dff1f4 100%)" }}>
          <div style={{ position: "absolute", right: -180 + dx, top: -200 + dy, width: 640, height: 640, borderRadius: 999, background: `${data.accent}33` }} />
          <div style={{ position: "absolute", left: 70, right: 150, top: 430 }}>
            <div style={{ fontSize: 34, fontWeight: 900, color: HL }}>{data.footerBrand} · {card.tag}</div>
            <div style={{ marginTop: 26, fontSize: 76, lineHeight: 1.2, fontWeight: 900, letterSpacing: -2, transform: `scale(${0.9 + 0.1 * outPop})`, transformOrigin: "0% 50%" }}>
              {lines.map((toks, li) => (
                <div key={li}>{toks.map((tk, ti) => (
                  <span key={ti} style={{ whiteSpace: "pre", color: tk.b ? WARM : INK }}>{tk.t}</span>
                ))}</div>
              ))}
            </div>
            {card.ask2 && <div style={{ marginTop: 40, fontSize: 44, lineHeight: 1.3, fontWeight: 900, color: INK, wordBreak: "keep-all" }}>{card.ask2}</div>}
            <div style={{ marginTop: 44, fontSize: 34, fontWeight: 800, color: "#5d7785" }}>{data.cta.siteLabel ?? "전체 글"}</div>
            <div style={{ marginTop: 6, fontSize: 50, fontWeight: 900, color: WARM, transform: `translateY(${5 * Math.sin(frame / 6)}px)` }}>{data.cta.site ?? ""}</div>
          </div>
        </AbsoluteFill>
      )}
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
  // theme (2026-11-18): 붉은 배경이 눈에 피로하다는 운영자 의견. 기본은 red 그대로, card.theme 으로 바꾼다.
  const THEMES: Record<string, { bg: string; out: string; acc: string; sh: string; text: string; sub: string; hl: string; glow: string }> = {
    red:    { bg: "radial-gradient(120% 60% at 50% 0%,#ff5a3c 0%,#d1121f 38%,#8a0b1c 100%)", out: "radial-gradient(110% 70% at 50% 35%,#ff5a3c 0%,#c40f1c 45%,#6d0716 100%)", acc: "#d1121f", sh: "60,0,10", text: "#ffffff", sub: "#ffe9c2", hl: "#ffd84a", glow: "255,216,74" },
    violet: { bg: "radial-gradient(120% 60% at 50% 0%,#8f6bff 0%,#5b3fd6 40%,#2a1c7a 100%)", out: "radial-gradient(110% 70% at 50% 35%,#8f6bff 0%,#5136c9 45%,#22165f 100%)", acc: "#5b3fd6", sh: "20,10,70", text: "#ffffff", sub: "#e6deff", hl: "#ffd84a", glow: "255,216,74" },
    teal:   { bg: "radial-gradient(120% 60% at 50% 0%,#2fd3b4 0%,#0e8f86 40%,#0a4f5c 100%)", out: "radial-gradient(110% 70% at 50% 35%,#2fd3b4 0%,#0d857d 45%,#083f4a 100%)", acc: "#0b7f78", sh: "0,40,50", text: "#ffffff", sub: "#d9fff6", hl: "#ffe169", glow: "255,225,105" },
    cream:  { bg: "radial-gradient(120% 60% at 50% 0%,#fffaf0 0%,#ffeed6 45%,#ffd9b0 100%)", out: "radial-gradient(110% 70% at 50% 35%,#fffaf0 0%,#ffe9cc 45%,#ffcf9e 100%)", acc: "#e0452f", sh: "150,80,30", text: "#2a1a12", sub: "#7a4a2a", hl: "#e0452f", glow: "255,170,60" },
  };
  const T = THEMES[card.theme ?? "red"] ?? THEMES.red;
  const GOLD = "#ffd84a"; const RED = T.acc; const INK = "#1c1020";
  const pop = spring({ frame: frame - 1, fps, config: { damping: 9, stiffness: 160 } });
  const sweepStart = 16 + rows.length * 2;
  const hi = frame > sweepStart ? Math.floor((frame - sweepStart) / 12) % rows.length : -1;
  const pulse = 1 + 0.04 * Math.sin(frame / 4);
  // motion 판 (2026-11-17): 틱톡이 「움직이지 않는 이미지」를 추천에서 뺀다. 세 장면(제목 → 표가 한 줄씩 → 마무리)으로 나누고 화면 전체가 계속 움직이게 한다.
  const M = !!card.motion; const total = card.durFrames || 330;
  const IN0 = 28, IN1 = 44, ROW0 = M ? 46 : 5, RSTEP = M ? 3 : 2;  // 2026-11-18: 표를 빨리 다 띄우고 오래 보여 준다(운영자: 표를 볼 시간이 부족하다)
  const cl = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
  const introY = M ? interpolate(frame, [IN0, IN1], [430, 0], { ...cl, easing: Easing.out(Easing.cubic) }) : 0;
  const introS = M ? interpolate(frame, [IN0, IN1], [1.16, 1], cl) : 1;
  const zoom = M ? 1 + 0.035 * Math.min(1, Math.max(0, (frame - IN1) / Math.max(1, total - IN1))) : 1;
  // blog 판 (2026-11-18 SureView 운영자 지정): 마지막 장을 블로그 안내로 쓴다. card.blog 가 없으면 예전 마무리 그대로.
  const BL = M ? card.blog : undefined; const OUTLEN = BL ? (BL.frames ?? 126) : 84;
  const outA = M ? interpolate(frame, [total - OUTLEN, total - OUTLEN + 16], [0, 1], cl) : 0;
  const outPop = spring({ frame: frame - (total - OUTLEN + 4), fps, config: { damping: 10, stiffness: 140 } });
  const blUp = spring({ frame: frame - (total - OUTLEN + 14), fps, config: { damping: 13, stiffness: 120 } });
  // 예시 장면 (2026-11-18 운영자 지정): 관심만 끄는 영상으로 끝나면 사이트로 이어지지 않는다. 사이트 「예시 보기」의 실제 보고서 화면을 표 다음에 보여 준다.
  const EX = M ? card.example : undefined; const EXLEN = 135; const exStart = total - OUTLEN - EXLEN;  // EXLEN 135 = 2026-11-20 전체 20초로 줄임(운영자: 26초는 너무 길다)
  const exA = EX ? interpolate(frame, [exStart, exStart + 12], [0, 1], cl) : 0;
  const exUp = spring({ frame: frame - exStart - 4, fps, config: { damping: 16, stiffness: 110 } });
  const EXW = 940, EXVH = 1130; const exH = EX?.h ?? EXVH;
  const exPan = exH > EXVH ? interpolate(frame, [exStart + 40, total - 96], [0, -(exH - EXVH)], cl) : 0;
  const tailA = M ? interpolate(frame, [ROW0 + rows.length * RSTEP, ROW0 + rows.length * RSTEP + 10], [0, 1], cl) : 1;
  const sweepFrom = M ? ROW0 + rows.length * RSTEP + 10 : sweepStart;
  const hiM = frame > sweepFrom ? Math.floor((frame - sweepFrom) / 26) % rows.length : -1;  // 줄 강조는 천천히(한 줄 0.87초)
  return (
    <AbsoluteFill style={{ fontFamily: EFONT, color: T.text, background: T.bg }}>
      {M && <div style={{ position: "absolute", left: 540 + 380 * Math.cos(frame / 38) - 450, top: 760 + 520 * Math.sin(frame / 47) - 450, width: 900, height: 900, borderRadius: 999, background: `radial-gradient(circle, rgba(${T.glow},0.30) 0%, rgba(${T.glow},0) 65%)` }} />}
      {Array.from({ length: M ? 26 : 16 }).map((_, i) => {
        const x = M ? ((i * 197) % 1080) + 26 * Math.sin((frame + i * 13) / 21) : (i * 197) % 1080;
        const y = M ? ((((i * 331) - frame * (2 + (i % 4))) % 1920) + 1920) % 1920 : (i * 331) % 1920;
        const tw = 0.35 + 0.65 * Math.abs(Math.sin((frame + i * 9) / 11));
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: 10 + (i % 3) * 6, height: 10 + (i % 3) * 6, borderRadius: 99, background: GOLD, opacity: tw * 0.55, boxShadow: `0 0 18px ${GOLD}` }} />;
      })}
      <div style={{ position: "absolute", left: 56, right: 56, top: 92, display: "flex", alignItems: "center", gap: 12, fontSize: 28, fontWeight: 800, color: T.sub }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: RED }}>{data.footerBrand.charAt(0).toUpperCase()}</div>{data.footerBrand}
        <span style={{ fontSize: 31, fontWeight: 900, color: T.text, borderLeft: `3px solid ${T.sub}`, paddingLeft: 14, marginLeft: 4 }}>{card.kicker ?? "자미두수로 보는 내 사주"}</span>
        <span style={{ marginLeft: "auto", fontSize: 26, fontWeight: 900, color: RED, background: GOLD, borderRadius: 99, padding: "4px 20px" }}>{card.tag}</span>
      </div>
      {M && card.hero && frame < IN0 + 12 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 176, display: "flex", justifyContent: "center", opacity: interpolate(frame, [IN0 - 2, IN0 + 10], [1, 0], cl), transform: `scale(${0.6 + 0.4 * spring({ frame, fps, config: { damping: 11, stiffness: 150 } })}) translateY(${interpolate(frame, [IN0, IN0 + 12], [0, -120], cl)}px)` }}>
          <Img src={card.hero} style={{ width: 400, height: 400, borderRadius: 48, objectFit: "cover", border: `8px solid ${GOLD}`, boxShadow: `0 14px 0 rgba(${T.sh},0.45), 0 0 60px rgba(255,216,74,0.45)` }} />
        </div>
      )}
      <div style={{ position: "absolute", left: 56, right: 56, top: 150, transform: `translateY(${introY}px) scale(${zoom})`, transformOrigin: "50% 30%" }}>
        <div style={{ transform: `scale(${(0.7 + 0.3 * pop) * introS})`, fontSize: 92, lineHeight: 1.14, fontWeight: 900, letterSpacing: -2.5, textAlign: "center", textShadow: `0 6px 0 rgba(${T.sh},0.55), 0 0 28px rgba(255,200,80,0.35)` }}>
          {lines.map((toks, li) => (
            <div key={li}>{toks.map((tk, ti) => (
              <span key={ti} style={{ whiteSpace: "pre", color: tk.b ? T.hl : T.text }}>{tk.t}</span>
            ))}</div>
          ))}
        </div>
        {card.pill && (
          <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
            <span style={{ fontSize: 38, fontWeight: 900, color: INK, background: GOLD, borderRadius: 16, padding: "8px 30px", boxShadow: `0 5px 0 rgba(${T.sh},0.45)` }}>{card.pill}</span>
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
                boxShadow: on ? `0 0 26px ${GOLD}` : `0 4px 0 rgba(${T.sh},0.35)`, color: INK,
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
            <span style={{ transform: `scale(${pulse})`, fontSize: 44, fontWeight: 900, color: INK, background: GOLD, borderRadius: 99, padding: "12px 40px", boxShadow: `0 6px 0 rgba(${T.sh},0.5)` }}>{card.ask}</span>
          </div>
        )}
        {card.ask2 && <div style={{ marginTop: 14, fontSize: 36, fontWeight: 900, color: T.text, textAlign: "center" }}>{card.ask2}</div>}
        <div style={{ marginTop: 8, fontSize: 30, fontWeight: 800, color: T.sub, textAlign: "center" }}>
          {card.note ? `${card.note} · ` : ""}{data.cta.site ?? ""}
        </div>
        {data.cta.naver && (
          <div style={{ marginTop: 6, fontSize: 29, fontWeight: 800, color: T.text, textAlign: "center" }}>{BL ? "📖 더 자세한 내용" : "📖 더 깊은 풀이"} · {data.cta.naver}</div>
        )}
        </div>
      </div>
      {EX && exA > 0 && (
        <AbsoluteFill style={{ opacity: exA, background: T.out, alignItems: "center" }}>
          <div style={{ marginTop: 150, fontSize: 58, lineHeight: 1.2, fontWeight: 900, color: T.text, textAlign: "center", textShadow: `0 5px 0 rgba(${T.sh},0.55)` }}>
            <span style={{ color: T.hl }}>mindlumi.ai</span> 에서는<br />이렇게 나옵니다
          </div>
          <div style={{ marginTop: 22, fontSize: 34, fontWeight: 900, color: INK, background: GOLD, borderRadius: 99, padding: "8px 30px" }}>📄 실제 감명 보고서 화면{EX.label ? ` · ${EX.label}` : ""}</div>
          <div style={{ marginTop: 30, width: EXW, height: Math.min(EXVH, exH), overflow: "hidden", borderRadius: 30, background: "#ffffff", border: `6px solid ${GOLD}`, boxShadow: `0 16px 40px rgba(${T.sh},0.6)`, transform: `translateY(${(1 - exUp) * 260}px)` }}>
            <Img src={EX.src} style={{ width: EXW, display: "block", transform: `translateY(${exPan}px)` }} />
          </div>
          <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, textAlign: "center", fontSize: 40, fontWeight: 900, color: T.text }}>👉 내 명반으로 받아 보기</div>
        </AbsoluteFill>
      )}
      {BL && outA > 0 && (
        <AbsoluteFill style={{ opacity: outA, background: T.out, alignItems: "center", justifyContent: "center", padding: "0 64px", textAlign: "center" }}>
          <div style={{ fontSize: 40, fontWeight: 900, color: T.sub, marginBottom: 30 }}>{card.kicker ?? ""}</div>
          <div style={{ transform: `scale(${0.6 + 0.4 * outPop})`, fontSize: 84, lineHeight: 1.2, fontWeight: 900, letterSpacing: -2, color: T.text, wordBreak: "keep-all", textShadow: `0 6px 0 rgba(${T.sh},0.55)` }}>
            {parseTitle(BL.title ?? "더 자세한 내용은<br><b>블로그</b>에서").map((toks, li) => (
              <div key={li}>{toks.map((tk, ti) => <span key={ti} style={{ whiteSpace: "pre", color: tk.b ? T.hl : T.text }}>{tk.t}</span>)}</div>
            ))}
          </div>
          {BL.sub && <div style={{ marginTop: 28, fontSize: 40, lineHeight: 1.35, fontWeight: 800, color: T.sub, wordBreak: "keep-all" }}>{BL.sub}</div>}
          <div style={{ marginTop: 56, width: 900, borderRadius: 36, background: "#fffdf6", border: `6px solid ${GOLD}`, boxShadow: `0 14px 0 rgba(${T.sh},0.45)`, padding: "40px 30px 44px", opacity: blUp, transform: `translateY(${(1 - blUp) * 200}px) scale(${1 + 0.012 * Math.sin(frame / 7)})` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
              <span style={{ width: 76, height: 76, borderRadius: 18, background: "#03c75a", color: "#ffffff", fontSize: 50, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>N</span>
              <span style={{ fontSize: 50, fontWeight: 900, color: INK, letterSpacing: -1 }}>{BL.name ?? "네이버 블로그"}</span>
            </div>
            <div style={{ marginTop: 24, fontSize: 52, fontWeight: 900, color: RED, letterSpacing: -1 }}>{BL.url ?? data.cta.naver ?? ""}</div>
          </div>
          <div style={{ marginTop: 44, fontSize: 46, fontWeight: 900, color: INK, background: GOLD, borderRadius: 99, padding: "16px 44px", boxShadow: `0 6px 0 rgba(${T.sh},0.5)`, transform: `scale(${pulse})` }}>👉 전체 글 보러 가기</div>
        </AbsoluteFill>
      )}
      {M && !BL && outA > 0 && (
        <AbsoluteFill style={{ opacity: outA, background: T.out, alignItems: "center", justifyContent: "center", padding: "0 70px", textAlign: "center" }}>
          <div style={{ fontSize: 40, fontWeight: 900, color: T.sub, marginBottom: 26 }}>{card.kicker ?? "자미두수로 보는 내 사주"}</div>
          {card.ask2 && <div style={{ transform: `scale(${0.6 + 0.4 * outPop})`, fontSize: 66, lineHeight: 1.25, fontWeight: 900, color: T.text, wordBreak: "keep-all", textShadow: `0 6px 0 rgba(${T.sh},0.55)` }}>{card.ask2}</div>}
          {card.ask && <div style={{ marginTop: 44, transform: `scale(${pulse})`, fontSize: 46, fontWeight: 900, color: INK, background: GOLD, borderRadius: 99, padding: "16px 44px", boxShadow: `0 6px 0 rgba(${T.sh},0.5)` }}>{card.ask}</div>}
          <div style={{ marginTop: 40, fontSize: 60, fontWeight: 900, color: T.hl, transform: `translateY(${6 * Math.sin(frame / 6)}px)` }}>{data.cta.site ?? ""}</div>
          {data.cta.naver && <div style={{ marginTop: 16, fontSize: 32, fontWeight: 800, color: T.text }}>📖 더 깊은 풀이 · {data.cta.naver}</div>}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};


// ---------- cinematic (전설 · 이야기형) ----------
// 위쪽 절반에 장면 그림(느린 줌/이동) + 그 아래 금색 자막. 카드(슬라이드) 틀을 쓰지 않는다.
// spec 맨 위에 "layout": "cine". 카드마다 image(세로 그림)가 있어야 한다. 예전 전설 숏츠(금색 글씨 · 반투명 검은 띠)의 결을 따른다.
const CINE_GOLD = "#E8C87A";
const SFONT = "'Noto Serif CJK KR','Noto Serif KR','Noto Sans CJK KR',serif";
const CineView: React.FC<{ card: Card; data: Data; total: number }> = ({ card, data, total }) => {
  // 2026-11-25 운영자: 그림은 화면 위쪽 절반(위를 조금 띄우고), 설명 · 자막은 그 아래. 그림과 글이 겹치지 않는다.
  // 그림 칸 y 190~1150(960px). 글 칸 y 1190~1500. 그 아래 420px 는 쇼츠 화면 단추 자리라 비운다.
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const t = frame / fps; const D = card.durFrames;
  const p = frame / Math.max(1, D);
  const dir = card.idx % 4;
  const sc = dir % 2 === 0 ? 1.04 + 0.1 * p : 1.14 - 0.1 * p;
  const tx = (dir === 1 ? -1 : dir === 2 ? 1 : 0) * (20 - 40 * p);
  const ty = (dir === 0 ? 1 : dir === 3 ? -1 : 0) * (14 - 28 * p);
  const fin = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const src = card.image && /^https?:/.test(card.image) ? card.image : staticFile(card.image ?? "");
  // 자막: 낱말을 14자 안팎으로 묶어 지금 말하는 묶음만 띄운다.
  const groups: Word[][] = []; let cur: Word[] = []; let n = 0;
  for (const w of card.words ?? []) {
    if (cur.length && n + w.w.length > 14) { groups.push(cur); cur = []; n = 0; }
    cur.push(w); n += w.w.length + 1;
    if (/[.?!]$/.test(w.w)) { groups.push(cur); cur = []; n = 0; }  // 문장이 끝나면 묶음도 끊는다
  }
  if (cur.length) groups.push(cur);
  // 한 낱말만 남은 묶음은 앞 묶음에 붙인다(같은 문장이고 합쳐서 22자 이하일 때). 「나왔죠.」 혼자 뜨는 것을 막는다.
  for (let i = groups.length - 1; i > 0; i--) {
    const prev = groups[i - 1]; const one = groups[i];
    const len = (ws: Word[]) => ws.reduce((a, w) => a + w.w.length + 1, 0);
    if (one.length === 1 && !/[.?!]$/.test(prev[prev.length - 1].w) && len(prev) + len(one) <= 22) { groups[i - 1] = prev.concat(one); groups.splice(i, 1); }
  }
  let gi = -1;
  for (let i = 0; i < groups.length; i++) if (t >= groups[i][0].s - 0.05) gi = i;
  const g = gi >= 0 ? groups[gi] : null;
  const gA = g ? interpolate(t, [g[0].s - 0.05, g[0].s + 0.12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const lines = parseTitle(card.title ?? "");
  const hook = card.idx === 0; const end = !!card.cta;
  const tA = spring({ frame: frame - 6, fps, config: { damping: 20 } });
  const IMG_TOP = 190, IMG_H = 960;
  return (
    <AbsoluteFill style={{ background: "#07060c", fontFamily: FONT }}>
      {/* 바탕: 같은 그림을 흐리고 어둡게 깔아 위아래가 이어져 보이게 한다 */}
      <AbsoluteFill style={{ opacity: 0.55 * fin }}>
        <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(60px) brightness(0.45) saturate(1.2)", transform: "scale(1.3)" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(7,6,12,0.75) 0%, rgba(7,6,12,0.15) 12%, rgba(7,6,12,0.15) 55%, rgba(7,6,12,0.92) 72%, #07060c 100%)" }} />
      {/* 위: 연재 이름 */}
      <div style={{ position: "absolute", top: 96, left: 0, right: 0, textAlign: "center", fontFamily: SFONT, color: CINE_GOLD, fontSize: 34, fontWeight: 700, letterSpacing: 6 }}>
        {data.series === "MindLumi" ? "자미두수 전설" : data.series}{card.ep ? ` · ${card.ep}` : ""}
      </div>
      <div style={{ position: "absolute", top: 154, left: "50%", width: 90, height: 2, marginLeft: -45, background: CINE_GOLD, opacity: 0.7 }} />
      {/* 그림 칸 */}
      <div style={{ position: "absolute", left: 0, right: 0, top: IMG_TOP, height: IMG_H, overflow: "hidden", opacity: fin }}>
        <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${sc}) translate(${tx}px,${ty}px)` }} />
        <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 120px rgba(0,0,0,0.55)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 150, background: "linear-gradient(180deg, rgba(7,6,12,0) 0%, #07060c 100%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 70, background: "linear-gradient(0deg, rgba(7,6,12,0) 0%, rgba(7,6,12,0.85) 100%)" }} />
      </div>
      {/* 글 칸: 훅 · 마무리는 큰 제목, 가운데 카드는 금색 자막 */}
      {(hook || end) ? (
        <div style={{ position: "absolute", left: 60, right: 60, top: IMG_TOP + IMG_H + 6, textAlign: "center", opacity: tA, transform: `translateY(${(1 - tA) * 24}px)` }}>
          {lines.map((toks, li) => (
            <div key={li} style={{ fontFamily: SFONT, fontSize: end ? 70 : 78, lineHeight: 1.26, fontWeight: 900, color: "#fff", wordBreak: "keep-all" }}>
              {toks.map((tk, ti) => <span key={ti} style={{ whiteSpace: "pre", color: tk.b || tk.em ? CINE_GOLD : "#fff" }}>{tk.t}</span>)}
            </div>
          ))}
          {card.sub && !end && <div style={{ marginTop: 18, fontSize: 38, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>{card.sub}</div>}
          {end && (
            <div style={{ marginTop: 22 }}>
              <div style={{ display: "inline-block", fontSize: 54, fontWeight: 900, color: "#1a1206", background: CINE_GOLD, borderRadius: 99, padding: "12px 48px", transform: `scale(${1 + 0.03 * Math.sin(frame / 7)})` }}>{data.cta.site ?? ""}</div>
              {data.cta.siteLabel && <div style={{ marginTop: 12, fontSize: 32, fontWeight: 800, color: "rgba(255,255,255,0.9)" }}>{data.cta.siteLabel}</div>}
            </div>
          )}
        </div>
      ) : g && (
        <div style={{ position: "absolute", left: 60, right: 60, top: IMG_TOP + IMG_H + 30, height: 260, display: "flex", alignItems: "center", justifyContent: "center", opacity: gA }}>
          <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.34, color: CINE_GOLD, textAlign: "center", wordBreak: "keep-all" }}>
            {g.map((w) => w.w).join(" ")}
          </div>
        </div>
      )}
      {/* 진행 선 */}
      <div style={{ position: "absolute", left: 0, top: 0, height: 6, width: `${((card.idx + p) / total) * 100}%`, background: CINE_GOLD, opacity: 0.85 }} />
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
  if (card.cine) return <CineView card={card} data={data} total={total} />;
  if (card.rows && card.bright) return <BrightLookupView card={card} data={data} />;
  if (card.rows && card.pop) return <PopLookupView card={card} data={data} />;
  if (card.rows) return card.light ? <LightLookupView card={card} data={data} /> : <LookupView card={card} data={data} />;
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: "#eef4f8" }}>
      <Dots total={total} idx={card.idx} accent={data.accent} />
      {/* watermark */}
      <div style={{ position: "absolute", right: 70, top: 150, fontSize: 300, fontWeight: 900, color: "rgba(255,255,255,0.035)", lineHeight: 1 }}>{String(card.idx + 1).padStart(2, "0")}</div>
      {card.roomy && <div style={{ position: "absolute", left: -200, right: -200, bottom: -260, height: 900, background: `radial-gradient(ellipse at 50% 100%, ${mix(data.accent, 60)}55 0%, transparent 62%)` }} />}
      <div style={{ position: "absolute", inset: 0, padding: card.roomy ? "218px 150px 0px 90px" : "232px 150px 860px 90px", display: "flex", flexDirection: "column" }}>
        {/* chip */}
        <div style={{ opacity: appear, transform: `translateY(${(1 - appear) * 20}px)`, display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: 14, padding: "16px 28px", border: `1px solid ${mix(data.accent, 55)}`, borderRadius: 99, fontSize: 30, fontWeight: 700, color: mix(data.accent, 80) }}>
          <span style={{ color: "#0b1220", background: data.accent, borderRadius: 8, padding: "2px 12px", fontSize: 28 }}>{String(card.idx + 1).padStart(2, "0")}</span>{card.tag}
        </div>
        {/* title with word stagger */}
        <div style={{ marginTop: card.roomy ? 40 : 54, fontSize: card.roomy ? 84 : 88, lineHeight: card.roomy ? 1.22 : 1.26, fontWeight: 800, letterSpacing: -1, color: "#f4f9fb" }}>
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
        {card.sub && <div style={{ marginTop: card.roomy ? 26 : 40, fontSize: 40, lineHeight: 1.5, fontWeight: 500, color: "#9fb4c6", opacity: appear }}>{card.sub}</div>}
        {/* paddingBottom - 자막 띠(bottom:600, 최대 3줄 ≈ 180px)를 침범하지 않게 띄운다.
            자막 bottom:600 + 3줄(약 180px) 이면 자막 윗끝이 y≈1140 이므로 1920-1140=780. */}
        <div style={card.roomy ? { marginTop: 40, display: "flex", flexDirection: "column" } : { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingBottom: 780 }}>
          <Stage card={card} accent={data.accent} accent2={data.accent2} cta={data.cta} appear={appear} />
        </div>
      </div>
      <Caption words={card.words} tCard={tCard} accent2={data.accent2} roomy={card.roomy} />
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

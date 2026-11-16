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
  rows?: string[][]; rowsHead?: string[]; note?: string;
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
            <span style={{ width: 110 }}>{card.rowsHead[0]}</span><span style={{ width: 250 }}>{card.rowsHead[1]}</span><span>{card.rowsHead[2]}</span>
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
                <span style={{ width: 110 }}>
                  <span style={{ display: "inline-block", minWidth: 62, textAlign: "center", padding: "4px 12px", borderRadius: 12, fontSize: 42, fontWeight: 900, color: "#0b1220", background: data.accent }}>{r[0]}</span>
                </span>
                <span style={{ width: 250, fontSize: 44, fontWeight: 900, color: on ? data.accent2 : "#ffffff", whiteSpace: "nowrap" }}>{r[1]}</span>
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

// ---------- one card ----------
const CardView: React.FC<{ card: Card; data: Data; total: number }> = ({ card, data, total }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const tCard = frame / fps;
  const appear = spring({ frame: frame - 2, fps, config: { damping: 18, stiffness: 120 } });
  const lines = parseTitle(card.title);
  let wi = 0;
  if (card.rows) return <LookupView card={card} data={data} />;
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

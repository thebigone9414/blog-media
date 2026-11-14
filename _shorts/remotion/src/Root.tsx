import React from "react";
import { Composition } from "remotion";
import { SureViewShort, Data } from "./SureViewShort";

const empty: Data = {
  fps: 30, series: "SureView", accent: "#2dd4bf", accent2: "#fbbf24", footerBrand: "SureView",
  cta: { naver: "blog.naver.com/sureview26", tistory: "sureview.tistory.com" },
  audio: null, bgm: null, totalFrames: 60, cards: [],
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Short"
    component={SureViewShort}
    durationInFrames={60}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{ data: empty }}
    calculateMetadata={({ props }) => {
      const d = (props as { data: Data }).data;
      return { durationInFrames: Math.max(30, d.totalFrames || 60), fps: d.fps || 30, width: 1080, height: 1920 };
    }}
  />
);

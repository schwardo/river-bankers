import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import { S1Hook } from "./S1Hook";
import { S2Setup } from "./S2Setup";
import { S3Turn } from "./S3Turn";
import { S4Auction } from "./S4Auction";
import { S6Build } from "./S6Build";
import { S7Close } from "./S7Close";

// Total duration must match the master audio: full_gemini_kore.mp3 ≈ 131.11s.
// (S5 lap demo was removed for the 2-minute cut — preserved in
// scenes/full/legacy/S5RecallLap.tsx for the longer cut.)
export const FULL_VIDEO_DURATION_SECONDS = 131.11;

// Scene boundaries from the new (no-lap) Kore transcript:
//
//   S1 Hook    :   0.00 "Meet the River Bankers..."   → 10.60
//   S2 Setup   :  12.20 "Cards drift..."              → 23.00
//   S3 Turn    :  23.60 "On your turn..."             → 31.10
//   S4 Auction :  32.60 "The main action..."          → 108.80
//   S6 Build   : 110.10 "Workers don't score..."      → 123.40
//   S7 Close   : 123.40 "River Bankers — merging..."  → 131.11
const SCENES_S = [
  { Component: S1Hook,    start: 0.0,   end: 12.2 },
  { Component: S2Setup,   start: 12.2,  end: 23.6 },
  { Component: S3Turn,    start: 23.6,  end: 32.6 },
  { Component: S4Auction, start: 32.6,  end: 110.1 },
  { Component: S6Build,   start: 110.1, end: 123.4 },
  { Component: S7Close,   start: 123.4, end: 131.11 },
];

export const FullVideo: React.FC = () => {
  const fps = useVideoConfig().fps;
  return (
    <AbsoluteFill style={{ background: "#0a1a25" }}>
      {/* Master audio — Kore via Vertex AI Gemini TTS */}
      <Audio src={staticFile("voiceover/full_gemini_kore.mp3")} />

      {SCENES_S.map(({ Component, start, end }, i) => (
        <Sequence
          key={i}
          from={Math.round(start * fps)}
          durationInFrames={Math.round((end - start) * fps)}
        >
          <Component />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

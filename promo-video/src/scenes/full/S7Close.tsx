import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FRAME_H, PAPER } from "../../shared/geometry";

// S7 — Close (~4.6s). Logo + tagline.
export const S7Close: React.FC = () => {
  const frame = useCurrentFrame();
  const fps = useVideoConfig().fps;
  const t = frame / fps;

  const logoAlpha = interpolate(t, [0.0, 0.9], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const taglineAlpha = interpolate(t, [0.8, 1.7], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, #0b2940 0%, #1d4e6b 60%, #2f5d3a 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <Img
          src={staticFile("artwork/logo.png")}
          style={{
            maxWidth: 820,
            width: "60%",
            height: "auto",
            opacity: logoAlpha,
            transform: `translateY(${-8 * (1 - logoAlpha)}px) scale(${
              0.96 + 0.04 * logoAlpha
            })`,
            filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.65))",
          }}
        />
        <div
          style={{
            marginTop: 56,
            color: PAPER,
            fontFamily: "Iowan Old Style, Palatino, Georgia, serif",
            fontSize: 34,
            letterSpacing: 1,
            textShadow: "0 4px 12px rgba(0,0,0,0.65)",
            opacity: taglineAlpha,
            transform: `translateY(${-6 * (1 - taglineAlpha)}px)`,
            maxWidth: FRAME_H * 1.6,
            lineHeight: 1.35,
            padding: "0 80px",
          }}
        >
          merging the <em>light fun of a worker placement game</em> with the{" "}
          <em>strategic depth of a smart economic game</em>
        </div>
      </div>
    </>
  );
};

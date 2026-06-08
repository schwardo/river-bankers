import {
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BoardStage } from "../../shared/components";
import {
  FRAME_H,
  FRAME_W,
  PAPER,
  SPECIES_CHIT,
} from "../../shared/geometry";

// S5 — Lap only (6.6s). The pre-auction recall beat is no longer in the
// script. New Kore timing (scene starts at master 104.7s):
//   master 104.70  local 0.00  "Don't sprint too far down the fish track..."
//   master 105.70  local 1.00  "Sprint" — lap animation peak
//   master 110.20  local 5.50  "sleep"
//   master 111.30  local 6.60  scene end
export const S5RecallLap: React.FC = () => {
  const frame = useCurrentFrame();
  const fps = useVideoConfig().fps;
  const t = frame / fps;

  // Track close-up rect
  const trackRectY = FRAME_H * 0.45;
  const trackRectH = 200;
  const trackRectLeft = 120;
  const trackRectRight = FRAME_W - 120;
  const numTicks = 30;
  const tickW = (trackRectRight - trackRectLeft) / numTicks;
  // Beaver sprint kicks off as "Sprint" is uttered (local 1.0s).
  const beaverProgress = interpolate(
    t,
    [1.0, 4.5],
    [0.05, 1.0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const beaverX = trackRectLeft + beaverProgress * (trackRectRight - trackRectLeft);
  const otterX = trackRectLeft + 0.42 * (trackRectRight - trackRectLeft);
  // The lapper (beaver) flips upside-down just after passing the otter
  // (progress ~0.55 → t≈2.9s).
  const beaverFlip = interpolate(t, [2.9, 3.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const zPuffAlpha = interpolate(t, [3.5, 3.9, 6.2, 6.6], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <>
      <BoardStage opacity={0.18} />

      {/* Headline */}
      <div
        style={{
          position: "absolute",
          top: FRAME_H * 0.12,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "Iowan Old Style, Palatino, Georgia, serif",
          fontSize: 48,
          letterSpacing: 2,
          color: PAPER,
          textShadow: "0 4px 14px rgba(0,0,0,0.8)",
        }}
      >
        Sprint too far → <span style={{ color: "#ffd766" }}>LAP</span> → sleep
      </div>

      {/* Track strip backdrop */}
      <div
        style={{
          position: "absolute",
          left: trackRectLeft,
          top: trackRectY - trackRectH / 2,
          width: trackRectRight - trackRectLeft,
          height: trackRectH,
          background: "linear-gradient(180deg, #d4b97a 0%, #a08762 100%)",
          border: "4px solid #4a3922",
          borderRadius: 14,
          boxShadow: "0 10px 22px rgba(0,0,0,0.7)",
        }}
      />
      {Array.from({ length: numTicks + 1 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: trackRectLeft + i * tickW,
            top: trackRectY - trackRectH / 2,
            width: 2,
            height: trackRectH,
            background: "rgba(74,57,34,0.5)",
          }}
        />
      ))}

      {/* Otter pawn (stays upright; getting lapped, not exhausted) */}
      <div
        style={{
          position: "absolute",
          left: otterX - 60,
          top: trackRectY - 60,
          width: 120,
          height: 120,
          borderRadius: "50%",
          overflow: "hidden",
          border: "4px solid rgba(20,12,6,0.85)",
          boxShadow: "0 6px 12px rgba(0,0,0,0.7)",
          background: "#3a2515",
        }}
      >
        <Img
          src={staticFile(SPECIES_CHIT.otter)}
          style={{
            width: "120%",
            height: "120%",
            marginLeft: "-10%",
            marginTop: "-10%",
            objectFit: "cover",
          }}
        />
      </div>

      {/* 💤 puff above the LAPPER (beaver) — the lapper gets exhausted */}
      {zPuffAlpha > 0.01 && (
        <div
          style={{
            position: "absolute",
            left: beaverX + 50,
            top: trackRectY - 130,
            fontFamily: "Iowan Old Style, Palatino, Georgia, serif",
            fontSize: 80,
            color: "#ffd766",
            textShadow: "0 3px 12px rgba(0,0,0,0.85)",
            opacity: zPuffAlpha,
            transform: `translateY(${-12 * zPuffAlpha}px) rotate(15deg)`,
          }}
        >
          💤
        </div>
      )}

      {/* Beaver pawn (sprints past then flips upside-down — exhausted) */}
      <div
        style={{
          position: "absolute",
          left: beaverX - 60,
          top: trackRectY - 60,
          width: 120,
          height: 120,
          borderRadius: "50%",
          overflow: "hidden",
          border: "4px solid rgba(20,12,6,0.85)",
          boxShadow: "0 6px 12px rgba(0,0,0,0.7)",
          background: "#3a2515",
          transform: `rotate(${180 * beaverFlip}deg)`,
          filter: beaverFlip > 0.5 ? "grayscale(0.6)" : "none",
        }}
      >
        <Img
          src={staticFile(SPECIES_CHIT.beaver)}
          style={{
            width: "120%",
            height: "120%",
            marginLeft: "-10%",
            marginTop: "-10%",
            objectFit: "cover",
          }}
        />
      </div>
      {/* Motion blur lines while beaver is sprinting */}
      {beaverProgress > 0.1 && beaverProgress < 0.95 && (
        <>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: beaverX - 60 - i * 18,
                top: trackRectY - 4,
                width: i * 28,
                height: 8,
                background: `rgba(255,255,255,${0.25 - 0.05 * i})`,
                borderRadius: 4,
              }}
            />
          ))}
        </>
      )}
    </>
  );
};

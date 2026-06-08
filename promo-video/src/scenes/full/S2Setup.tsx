import {
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BoardStage, Card } from "../../shared/components";
import {
  CARD_H,
  CARD_W,
  FRAME_H,
  PAPER,
  SLOT,
  bx,
  by,
} from "../../shared/geometry";

// S2 — Setup (11.4s). Word timing from the new no-lap Kore transcript:
//   master 12.20  local  0.00  "Cards drift from the headwaters..."   ← quick toss to HW
//   master 14.40  local  2.20  "...through four river spaces."        ← deal R1..R4 in turn
//   master 15.50  local  3.30  "spaces." (end of sentence)
//   master 15.90  local  3.70  "Each shows a row of icons -"           ← material name pulses
//   master 18.40  local  6.20  "logs,"
//   master 19.20  local  7.00  "stones,"
//   master 20.00  local  7.80  "reeds,"
//   master 21.00  local  8.80  "mud,"
//   master 21.40  local  9.20  "vines,"
//   master 22.50  local 10.30  "clay."
//   master 23.60  local 11.40  scene end
const MATERIALS = [
  { key: "logs", at: 6.2, card: "Logjam.png" },
  { key: "stones", at: 7.0, card: "BoulderField.png" },
  { key: "reeds", at: 7.8, card: "ReedStand.png" },
  { key: "mud", at: 8.8, card: "MudFlat.png" },
  { key: "vines", at: 9.2, card: "TrailingVine.png" },
  { key: "clay", at: 10.3, card: "ClayBank.png" },
];

// Phase 1: three cards are thrown from the Material Deck into Headwaters 3/2/1
// during "cards drift from the headwaters" (0..2.2s).
const HW_THROWS = [
  { card: "Logjam.png",      to: { x: SLOT.hw3X, y: SLOT.topY }, at: 0.20 },
  { card: "ReedStand.png",   to: { x: SLOT.hw2X, y: SLOT.topY }, at: 0.55 },
  { card: "ClayBank.png",    to: { x: SLOT.hw1X, y: SLOT.topY }, at: 0.90 },
];

// Phase 2: one card dealt into each river space during "through four river spaces"
// (2.2..3.3s). 4 spaces in ~1.1s → ~0.27s per deal.
const RIVER_DEALS = [
  { card: "BoulderField.png", to: { x: SLOT.r1X, y: SLOT.botY }, at: 2.20 },
  { card: "MudFlat.png",      to: { x: SLOT.r2X, y: SLOT.botY }, at: 2.50 },
  { card: "TrailingVine.png", to: { x: SLOT.r3X, y: SLOT.botY }, at: 2.80 },
  { card: "CattailCluster.png", to: { x: SLOT.r4X, y: SLOT.botY }, at: 3.10 },
];

// Material-name pulses — use the slot positions decided above so each named
// material lights up the same card it was just dealt into.
const CARD_SLOTS: Record<string, { x: number; y: number }> = {
  "Logjam.png":         { x: SLOT.hw3X, y: SLOT.topY },
  "ReedStand.png":      { x: SLOT.hw2X, y: SLOT.topY },
  "ClayBank.png":       { x: SLOT.hw1X, y: SLOT.topY },
  "BoulderField.png":   { x: SLOT.r1X,  y: SLOT.botY },
  "MudFlat.png":        { x: SLOT.r2X,  y: SLOT.botY },
  "TrailingVine.png":   { x: SLOT.r3X,  y: SLOT.botY },
  "CattailCluster.png": { x: SLOT.r4X,  y: SLOT.botY },
};

// Cards in their final positions after both phases conclude.
const ALL_CARDS = [...HW_THROWS, ...RIVER_DEALS];

export const S2Setup: React.FC = () => {
  const frame = useCurrentFrame();
  const fps = useVideoConfig().fps;
  const t = frame / fps;

  const establishAlpha = interpolate(t, [0.0, 0.6, 3.5, 3.9], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <>
      <BoardStage />

      {/* HEADWATERS · RIVER · SHORELINE establish text */}
      <div
        style={{
          position: "absolute",
          top: FRAME_H * 0.07,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "Iowan Old Style, Palatino, Georgia, serif",
          fontSize: 30,
          letterSpacing: 4,
          color: PAPER,
          textShadow: "0 3px 12px rgba(0,0,0,0.8)",
          opacity: establishAlpha,
        }}
      >
        HEADWATERS · RIVER · SHORELINE
      </div>

      {/* All cards travel from the Material Deck (top-left of the board) to
          their target slot. HW throws are fast and overlap; river deals are
          sequenced one at a time. */}
      {ALL_CARDS.map(({ card, to, at }) => {
        const driftSpring = spring({
          frame: frame - Math.round(at * fps),
          fps,
          config: { damping: 16, mass: 0.7 },
          durationInFrames: 14, // crisp arrival so the deal feels punchy
        });
        const fromX = SLOT.matDeckX;
        const fromY = SLOT.topY;
        const cx = bx(interpolate(driftSpring, [0, 1], [fromX, to.x]));
        const cy = by(interpolate(driftSpring, [0, 1], [fromY, to.y]));
        const opacity = interpolate(
          t,
          [at, at + 0.12],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        return (
          <Card
            key={`deal-${card}`}
            src={staticFile(`material-deck/${card}`)}
            x={cx}
            y={cy}
            opacity={opacity}
          />
        );
      })}

      {/* Material-name pulses. Once the matching card has settled into its
          final slot, naming the material highlights it. */}
      {MATERIALS.map(({ key, at, card }) => {
        const slot = CARD_SLOTS[card] ?? { x: SLOT.hw2X, y: SLOT.topY };
        const highlight = interpolate(
          t,
          [at - 0.1, at + 0.25, at + 0.9],
          [0, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        return (
          <div key={key}>
            {highlight > 0.01 && (
              <div
                style={{
                  position: "absolute",
                  left: bx(slot.x) - CARD_W * 0.57,
                  top: by(slot.y) - CARD_H * 0.6,
                  width: CARD_W * 1.14,
                  height: CARD_H * 1.2,
                  borderRadius: 14,
                  boxShadow: `0 0 0 ${4 * highlight}px rgba(255,210,80,${
                    0.95 * highlight
                  }), 0 0 ${30 * highlight}px ${
                    8 * highlight
                  }px rgba(255,210,80,${0.6 * highlight})`,
                  pointerEvents: "none",
                }}
              />
            )}
            {(() => {
              const alpha = interpolate(
                t,
                [at - 0.1, at + 0.15, at + 0.85, at + 1.0],
                [0, 1, 1, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              );
              if (alpha < 0.01) return null;
              return (
                <div
                  style={{
                    position: "absolute",
                    top: FRAME_H * 0.07,
                    left: 0,
                    right: 0,
                    textAlign: "center",
                    fontFamily: "Iowan Old Style, Palatino, Georgia, serif",
                    fontSize: 72,
                    letterSpacing: 8,
                    fontWeight: 700,
                    color: "#ffd766",
                    textShadow:
                      "0 4px 18px rgba(0,0,0,0.9), 0 0 12px rgba(255,210,100,0.7)",
                    opacity: alpha,
                    transform: `scale(${0.94 + 0.06 * alpha})`,
                    pointerEvents: "none",
                  }}
                >
                  {key.toUpperCase()}
                </div>
              );
            })()}
          </div>
        );
      })}
    </>
  );
};

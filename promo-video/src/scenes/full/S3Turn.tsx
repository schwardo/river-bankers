import {
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BoardStage } from "../../shared/components";
import {
  FISH_TRACK_HEIGHT,
  FISH_TRACK_LEFT,
  FISH_TRACK_RIGHT,
  FISH_TRACK_TOP,
  FRAME_H,
  FRAME_W,
  PAPER,
  SPECIES_CHIT,
  WATER_DEEP,
  fishX,
} from "../../shared/geometry";

// S3 — Turn / fish economy (9.0s). New Kore timing (scene starts at 23.6s).
//   master 23.60  local 0.00  "On your turn, you take one action and pay its cost in fish."
//   master 27.40  local 3.80  "fish." — switch to action boxes
//   master 27.80  local 4.20  "Whoever sits furthest back on the fish track acts next."
//   master 32.60  local 9.00  scene end
const PAWNS = [
  { species: "beaver" as const, cell: 7 },
  { species: "otter" as const, cell: 4 },   // furthest back (highlighted)
  { species: "muskrat" as const, cell: 9 },
  { species: "mink" as const, cell: 6 },
];

// Action / cost boxes mirroring the rulebook's "Your turn" section.
// `.tag` = dark water-deep background, white uppercase NAME on top,
// gold-ish cost below.
const ACTIONS = [
  { name: "PULL",    cost: "2 – 4🐟",   sub: "auction a Headwaters card" },
  { name: "AUCTION", cost: "1🐟 flat",   sub: "auction a river card" },
  { name: "FLUSH",   cost: "5🐟",        sub: "refresh the Headwaters" },
  { name: "INVENT",  cost: "1 – 5🐟",   sub: "draw / discard structures" },
  { name: "BUILD",   cost: "printed",    sub: "build a structure" },
];

export const S3Turn: React.FC = () => {
  const frame = useCurrentFrame();
  const fps = useVideoConfig().fps;
  const t = frame / fps;

  // Board dim
  const boardAlpha = interpolate(t, [0, 0.6], [0.4, 0.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Headline: "Every action costs fish 🐟"
  const headlineAlpha = interpolate(
    t,
    [0.0, 0.7, 3.5, 3.9],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Action boxes — appear as the first sentence opens, stagger in
  const actionsBaseAlpha = interpolate(t, [0.6, 1.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const actionsFade = interpolate(t, [3.7, 4.2], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const actionsAlpha = Math.min(actionsBaseAlpha, actionsFade);

  // Second sentence — fish-track turn-order headline
  const secondHeadlineAlpha = interpolate(t, [4.2, 4.9, 8.4, 9.0], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fish track zoom-in
  const zoomProgress = spring({
    frame: frame - Math.round(3.9 * fps),
    fps,
    config: { damping: 18, mass: 1 },
    durationInFrames: 22,
  });
  const trackScale = 1 + 0.25 * zoomProgress;
  const trackYOffset = -120 * zoomProgress;

  const otterGlow = interpolate(t, [4.2, 4.8, 8.4, 9.0], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <>
      <BoardStage opacity={boardAlpha} />

      {/* Headline 1 — "Every action costs fish 🐟" */}
      <div
        style={{
          position: "absolute",
          top: FRAME_H * 0.08,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "Iowan Old Style, Palatino, Georgia, serif",
          color: PAPER,
          fontSize: 56,
          letterSpacing: 2,
          textShadow: "0 4px 16px rgba(0,0,0,0.85)",
          opacity: headlineAlpha,
        }}
      >
        Every action costs <span style={{ color: "#ffd766" }}>fish 🐟</span>
      </div>

      {/* Action boxes (rulebook-style) */}
      {actionsAlpha > 0.01 && (
        <div
          style={{
            position: "absolute",
            left: FRAME_W * 0.08,
            top: FRAME_H * 0.27,
            right: FRAME_W * 0.08,
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 32,
            opacity: actionsAlpha,
          }}
        >
          {ACTIONS.map((a, i) => {
            const staggerAlpha = interpolate(
              t,
              [0.7 + i * 0.15, 1.1 + i * 0.15],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );
            return (
              <div
                key={a.name}
                style={{
                  opacity: staggerAlpha,
                  transform: `translateY(${20 * (1 - staggerAlpha)}px)`,
                  background: "#faf3e3",
                  borderRadius: 12,
                  padding: 16,
                  textAlign: "center",
                  boxShadow: "0 8px 18px rgba(0,0,0,0.55)",
                  border: "2px solid rgba(0,0,0,0.15)",
                }}
              >
                {/* Tag block (dark water-deep, white text) */}
                <div
                  style={{
                    background: WATER_DEEP,
                    color: "#fff",
                    borderRadius: 8,
                    padding: "12px 8px 10px",
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 28,
                      letterSpacing: 2,
                      lineHeight: 1.05,
                      textTransform: "uppercase",
                      fontFamily: "Iowan Old Style, Palatino, Georgia, serif",
                    }}
                  >
                    {a.name}
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      marginTop: 8,
                      color: "#ffd766",
                      fontWeight: 600,
                    }}
                  >
                    {a.cost}
                  </div>
                </div>
                {/* Sub-text */}
                <div
                  style={{
                    fontSize: 18,
                    color: "#2c1f15",
                    lineHeight: 1.25,
                    fontFamily: "Iowan Old Style, Palatino, Georgia, serif",
                    fontStyle: "italic",
                  }}
                >
                  {a.sub}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Headline 2 — "Furthest back on the fish track acts next" */}
      <div
        style={{
          position: "absolute",
          top: FRAME_H * 0.15,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "Iowan Old Style, Palatino, Georgia, serif",
          color: PAPER,
          fontSize: 52,
          letterSpacing: 2,
          textShadow: "0 4px 16px rgba(0,0,0,0.85)",
          opacity: secondHeadlineAlpha,
        }}
      >
        Furthest back on the <span style={{ color: "#ffd766" }}>fish track</span> acts next
      </div>

      {/* Enlarged fish-track strip (only shown in second half) */}
      <div
        style={{
          position: "absolute",
          left: FISH_TRACK_LEFT,
          top: FISH_TRACK_TOP + trackYOffset,
          width: FISH_TRACK_RIGHT - FISH_TRACK_LEFT,
          height: FISH_TRACK_HEIGHT,
          overflow: "hidden",
          borderRadius: 10,
          border: "3px solid #3a2410",
          boxShadow:
            "0 12px 24px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(0,0,0,0.15)",
          transform: `scaleY(${trackScale})`,
          transformOrigin: "center bottom",
          opacity: secondHeadlineAlpha,
        }}
      >
        <Img
          src={staticFile("board/fish-board.png")}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "auto",
          }}
        />
      </div>

      {/* Pawns on the track (only in second half) */}
      {PAWNS.map(({ species, cell }) => {
        const pawnSize = 72 * trackScale;
        const x = fishX(cell);
        const y = FISH_TRACK_TOP + trackYOffset + FISH_TRACK_HEIGHT / 2;
        const isLowest = species === "otter";
        const glow = isLowest ? otterGlow : 0;
        return (
          <div
            key={species}
            style={{
              position: "absolute",
              left: x - pawnSize / 2,
              top: y - pawnSize / 2,
              width: pawnSize,
              height: pawnSize,
              borderRadius: "50%",
              overflow: "hidden",
              border: "3px solid rgba(20,12,6,0.85)",
              boxShadow: `0 4px 10px rgba(0,0,0,0.7),
                          0 0 0 ${5 * glow}px rgba(255,210,80,${0.95 * glow}),
                          0 0 ${40 * glow}px ${10 * glow}px rgba(255,210,80,${
                0.6 * glow
              })`,
              background: "#3a2515",
              opacity: secondHeadlineAlpha,
            }}
          >
            <Img
              src={staticFile(SPECIES_CHIT[species])}
              style={{
                width: "120%",
                height: "120%",
                marginLeft: "-10%",
                marginTop: "-10%",
                objectFit: "cover",
              }}
            />
          </div>
        );
      })}

      {otterGlow > 0.05 && (
        <div
          style={{
            position: "absolute",
            left: fishX(PAWNS[1].cell) - 100,
            top: FISH_TRACK_TOP + trackYOffset - 75,
            width: 200,
            textAlign: "center",
            fontFamily: "Iowan Old Style, Palatino, Georgia, serif",
            fontSize: 24,
            letterSpacing: 3,
            color: "#ffd766",
            textShadow:
              "0 2px 8px rgba(0,0,0,0.9), 0 0 6px rgba(255,210,100,0.7)",
            opacity: otterGlow,
          }}
        >
          ACTS NEXT ↓
        </div>
      )}
    </>
  );
};

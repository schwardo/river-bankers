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
  FRAME_H,
  FRAME_W,
  PAPER,
  SPECIES_CHIT,
  SpeciesKey,
} from "../../shared/geometry";

// S1 — Hook (12.2s). New no-lap Kore transcript timing:
//   0.00  "Meet the River Bankers:"   [game logo fades in]
//   1.80  "Beavers,"                   [beaver chit drops]
//   2.80  "otters,"                    [otter chit drops]
//   3.50  "muskrats,"                  [muskrat chit drops]
//   4.50  "minks."                     [mink chit drops]
//   4.90  "Four rival groups..."       [subtitle fades in, structures rise]
//  12.20  scene end
const TITLES: Array<{ species: SpeciesKey; t: number }> = [
  { species: "beaver", t: 1.8 },
  { species: "otter", t: 2.8 },
  { species: "muskrat", t: 3.5 },
  { species: "mink", t: 4.5 },
];

// Structure cards arranged along the bottom of the screen during the
// "build structures along the riverbank" subtitle.
const SAMPLE_STRUCTURES = [
  "BeaverDam.png",
  "CattailMarsh.png",
  "ClayVault.png",
  "BurrowNetwork.png",
];

export const S1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const fps = useVideoConfig().fps;
  const t = frame / fps;

  // Logo fade in (just before "Meet" at 0.00s)
  const logoAlpha = interpolate(t, [0.0, 0.9], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Subtitle ("Four rival groups..." starts at 5.20s)
  const subAlpha = interpolate(t, [5.1, 5.9], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Board fade-in at the end (preview of S2; S2 starts at master 12.30s)
  const boardAlpha = interpolate(t, [10.3, 12.3], [0, 0.45], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const chitSize = 200;
  const chitGap = 280;
  const rowY = FRAME_H * 0.62;
  const totalW = chitGap * (TITLES.length - 1);
  const rowLeft = (FRAME_W - totalW) / 2;

  return (
    <>
      {/* Watery backdrop with optional preview of the board near the end */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, #1d4e6b 0%, #0a1a25 80%)",
        }}
      />
      <div style={{ position: "absolute", inset: 0, opacity: boardAlpha }}>
        <BoardStage />
      </div>

      {/* Game logo as the title */}
      <Img
        src={staticFile("artwork/logo.png")}
        style={{
          position: "absolute",
          left: "50%",
          top: FRAME_H * 0.18,
          width: 820,
          height: "auto",
          transform: `translateX(-50%) translateY(${-12 * (1 - logoAlpha)}px) scale(${
            0.96 + 0.04 * logoAlpha
          })`,
          opacity: logoAlpha,
          filter: "drop-shadow(0 8px 28px rgba(0,0,0,0.75))",
        }}
      />

      {/* Four species chits, drop in sequentially */}
      {TITLES.map(({ species, t: appearAt }, i) => {
        const appear = interpolate(
          t,
          [appearAt - 0.15, appearAt + 0.4],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        const cx = rowLeft + chitGap * i;
        const cy = rowY;
        const drop = 0.6 + 0.4 * appear;
        const visualSize = chitSize * drop;
        // Highlight pulse when first named
        const glow = interpolate(
          t,
          [appearAt - 0.1, appearAt + 0.25, appearAt + 1.0],
          [0, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        return (
          <div
            key={species}
            style={{
              position: "absolute",
              left: cx - visualSize / 2,
              top: cy - visualSize / 2 - 40 * (1 - appear),
              width: visualSize,
              height: visualSize,
              borderRadius: "50%",
              overflow: "hidden",
              opacity: appear,
              border: "4px solid rgba(20,12,6,0.9)",
              boxShadow: `0 ${6 * drop}px ${12 * drop}px rgba(0,0,0,0.7),
                          0 0 0 ${4 * glow}px rgba(255,210,80,${0.95 * glow}),
                          0 0 ${40 * glow}px ${10 * glow}px rgba(255,210,80,${
                0.6 * glow
              })`,
              background: "#3a2515",
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

      {/* Subtitle ("Four rival groups...") */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: FRAME_H * 0.78,
          textAlign: "center",
          color: PAPER,
          fontFamily: "Iowan Old Style, Palatino, Georgia, serif",
          fontSize: 36,
          letterSpacing: 2,
          fontStyle: "italic",
          textShadow: "0 4px 14px rgba(0,0,0,0.75)",
          opacity: subAlpha,
        }}
      >
        Four rival groups along the riverbank
      </div>

      {/* Structure cards across the bottom — preview of "build structures
          along the riverbank". Cards use a drop-shadow on the Img itself
          (no white container background) so transparent corners render
          cleanly. */}
      {SAMPLE_STRUCTURES.map((card, i) => {
        const cardAppear = interpolate(
          t,
          [7.0 + i * 0.25, 8.0 + i * 0.25],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        const liftSpring = spring({
          frame: frame - Math.round((7.0 + i * 0.25) * fps),
          fps,
          config: { damping: 14, mass: 1 },
        });
        // Structure cards are portrait (750×1050 native, aspect 0.714)
        const cardW = 175;
        const cardH = cardW / 0.714;
        const gap = 28;
        const totalCardsW = SAMPLE_STRUCTURES.length * cardW + (SAMPLE_STRUCTURES.length - 1) * gap;
        const rowLeftS = (FRAME_W - totalCardsW) / 2;
        const cx = rowLeftS + i * (cardW + gap);
        const bottomY = FRAME_H - 40 - cardH;
        const y = bottomY - 30 * (1 - liftSpring);
        return (
          <Img
            key={card}
            src={staticFile(`structure-deck/${card}`)}
            style={{
              position: "absolute",
              left: cx,
              top: y,
              width: cardW,
              height: cardH,
              opacity: cardAppear,
              filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.75))",
            }}
          />
        );
      })}
    </>
  );
};

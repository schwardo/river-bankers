import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const SCENE1_DURATION_SECONDS = 27;

// Timing markers in seconds, from scene1_andrew.vtt:
//   0.05  Cards drift down the river.
//   1.88  On your turn, you reach upstream — pay two fish to pull a card down.
//   6.78  Now every player bids workers, and the highest bidder claims the most icons.
//  12.18  But workers eat fish to swim — bid too hard, and you lap yourself to sleep.
//  17.92  Cards left behind drift downstream, getting more expensive every turn.
//  23.21  River Bankers.
//  24.51  Build the bank before your rivals do.
const T = {
  intro: 0,
  highlightHeadwaters: 1.9,
  cardSlidesToRiver: 6.8,
  workersBid: 12.2,
  cardDrifts: 17.9,
  logo: 23.2,
};

type Voice = "andrew" | "ava";

// ============================================================================
// Board geometry
//
// The reference asset is `public/board/river-board-landscape.png` (4875×3075
// landscape, baked from river-board.png with a CCW transpose). At 1080p the
// board fits by height: scale = 1080/3075 ≈ 0.3512, board width = 1712,
// horizontally centered with 104px gutters on either side.
//
// All board-relative coordinates below are expressed as percentages of the
// landscape board so they survive any future board-art tweaks.
// ============================================================================

const FRAME_W = 1920;
const FRAME_H = 1080;
const BOARD_NATIVE_W = 4875;
const BOARD_NATIVE_H = 3075;
const BOARD_FIT_H = FRAME_H;
const BOARD_FIT_W = (BOARD_FIT_H * BOARD_NATIVE_W) / BOARD_NATIVE_H; // 1711.9
const BOARD_LEFT = (FRAME_W - BOARD_FIT_W) / 2;
const BOARD_TOP = 0;

// Convert board-relative (0..1) coordinates to frame pixels.
const bx = (frac: number) => BOARD_LEFT + frac * BOARD_FIT_W;
const by = (frac: number) => BOARD_TOP + frac * BOARD_FIT_H;
const bs = (frac: number) => frac * BOARD_FIT_W; // size scaled to board

// Slot center positions (board-relative). Measured from the printed dashed
// card-outline rectangles inside each slot on river-board-landscape.png.
//
// Board pixel coords (4875×3075):
//   Slot column edges (X): 173/1099 | 1211/2309 | 2423/3434 | 3548/4559
//   Top-row card outline:  Y ≈ 107..978 → center 542
//   Bottom-row card outline: Y ≈ 1412..2196 → center 1804
//
// Converted to board fractions:
const SLOT = {
  topY: 0.176, // 542 / 3075
  botY: 0.587, // 1804 / 3075
  // Top row left→right: Material Deck, HW3, HW2, HW1
  matDeckX: 0.13, // 636 / 4875
  hw3X: 0.361, // 1760
  hw2X: 0.601, // 2929
  hw1X: 0.832, // 4054
  // Bottom row left→right: R1, R2, R3, R4 (same X centers as top row)
  r1X: 0.13,
  r2X: 0.361,
  r3X: 0.601,
  r4X: 0.832,
  shoreX: 0.96,
};
// Card display size, board-relative. The printed card-outline rectangle is
// ~1028 board-px wide × 871 tall (1.18 aspect). Real material cards are
// 1050×750 (1.40 aspect, landscape), so we fit by width to avoid horizontal
// overflow — leaves a small vertical gap inside the slot.
const CARD_W_FRAC = 0.21; // ≈ 1028 / 4875
const CARD_ASPECT = 1050 / 750; // ≈ 1.4
const CARD_W = bs(CARD_W_FRAC); // ~360px
const CARD_H = CARD_W / CARD_ASPECT; // ~257px

// ---- Reed Stand icon positions ----
// Reed Stand has 5 reed icons arranged 3-over-2. Measured from the 1050×750
// PNG, expressed as offsets from card center as fractions of card width/height.
const REED_STAND_ICONS: Array<{ dx: number; dy: number }> = [
  // Top row, 3 icons
  { dx: -0.224, dy: -0.08 }, // top-left   (x≈290, y≈315 on a 1050×750)
  { dx: 0.0, dy: -0.08 }, // top-center
  { dx: +0.224, dy: -0.08 }, // top-right
  // Bottom row, 2 icons
  { dx: -0.114, dy: +0.21 }, // bottom-left  (x≈405, y≈530)
  { dx: +0.11, dy: +0.21 }, // bottom-right
];

// Worker chit size — matches the printed icon circle (~150px on a 1050px card,
// so ~14% of card width).
const WORKER_FRAC_OF_CARD = 0.13;
const WORKER_PX = CARD_W * WORKER_FRAC_OF_CARD; // ~47px

// ---- Fish track geometry ----
// We overlay a linear fish-track strip at the bottom of the frame, cropped
// from the top edge of fish-board.png (which shows spaces 0..15).
const FISH_TRACK_HEIGHT = 130;
const FISH_TRACK_TOP = FRAME_H - FISH_TRACK_HEIGHT - 8;
const FISH_TRACK_LEFT = 24;
const FISH_TRACK_RIGHT = FRAME_W - 24;
const FISH_BOARD_W = 2475; // native pixel width of fish-board.png
// fish-board.png top edge: cell centers at X ≈ 88, 242, 396, ..., (88 + 15*154)
// in source pixels. Spacing ≈ 154.
const fishX = (cellIdx: number) => {
  const sourceX = 88 + cellIdx * 154;
  const containerW = FISH_TRACK_RIGHT - FISH_TRACK_LEFT;
  return FISH_TRACK_LEFT + (sourceX * containerW) / FISH_BOARD_W;
};

// ============================================================================
// Style tokens
// ============================================================================

const PAPER = "#faf3e3";

// ============================================================================
// Components
// ============================================================================

const useSeconds = () => useCurrentFrame() / useVideoConfig().fps;

const Card: React.FC<{
  src: string;
  x: number;
  y: number;
  rotate?: number;
  highlight?: number; // 0..1, ring intensity
  scale?: number;
  width?: number; // override default card width
}> = ({ src, x, y, rotate = 0, highlight = 0, scale = 1, width }) => {
  const w = (width ?? CARD_W) * scale;
  const h = w / CARD_ASPECT;
  return (
    <div
      style={{
        position: "absolute",
        left: x - w / 2,
        top: y - h / 2,
        width: w,
        height: h,
        transform: `rotate(${rotate}deg)`,
        borderRadius: 10,
        boxShadow: `0 ${4 + highlight * 16}px ${
          14 + highlight * 26
        }px rgba(0,0,0,${0.35 + highlight * 0.3}), 0 0 0 ${
          highlight * 5
        }px rgba(255,210,80,${highlight * 0.95})`,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <Img
        src={src}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
};

type SpeciesKey = "beaver" | "otter" | "muskrat" | "mink";
const SPECIES_CHIT: Record<SpeciesKey, string> = {
  beaver: "worker-beaver.png",
  otter: "worker-otter.png",
  muskrat: "worker-muskrat.png",
  mink: "worker-mink.png",
};

// Worker chit clipped to a circle. The source PNGs have a soft rectangular
// halo around the silhouette; masking to a circle gives us a clean chit that
// sits cleanly on top of a material icon.
const Worker: React.FC<{
  species: SpeciesKey;
  x: number;
  y: number;
  appear: number; // 0..1, drop-in animation
  size?: number;
}> = ({ species, x, y, appear, size = WORKER_PX }) => {
  // Springy drop: scale 1.6 → 1 (clamped via appear), fade in opacity.
  const drop = 0.4 + 0.6 * appear;
  const visualSize = size * drop;
  return (
    <div
      style={{
        position: "absolute",
        left: x - visualSize / 2,
        top: y - visualSize / 2,
        width: visualSize,
        height: visualSize,
        borderRadius: "50%",
        overflow: "hidden",
        opacity: appear,
        border: "2px solid rgba(20,12,6,0.85)",
        boxShadow: `0 ${3 * drop}px ${5 * drop}px rgba(0,0,0,0.55)`,
        // The chit PNGs include a faded rectangular halo; the circular mask
        // crops that away. We slightly zoom in so the species silhouette
        // dominates the circle.
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
};

// Linear fish-track overlay at the bottom of the frame. Uses the top edge of
// fish-board.png (spaces 0..15) clipped to a horizontal band, and renders two
// circular species pawns moving across the cells.
const FishTrack: React.FC<{
  beaverCell: number;
  otterCell: number;
}> = ({ beaverCell, otterCell }) => {
  // The fish-board top edge runs 0..2475 horizontally with 16 visible cells.
  // Cell centers are roughly: x0 ≈ 104, x15 ≈ 2410, so spacing ≈ 154.
  // To map cell index to our strip pixel coords, treat the strip as covering
  // those 16 cells exactly.
  const pawnSize = 56;
  return (
    <>
      {/* Fish-board top-row strip, clipped to band height */}
      <div
        style={{
          position: "absolute",
          left: FISH_TRACK_LEFT,
          top: FISH_TRACK_TOP,
          width: FISH_TRACK_RIGHT - FISH_TRACK_LEFT,
          height: FISH_TRACK_HEIGHT,
          overflow: "hidden",
          borderRadius: 10,
          border: "3px solid #3a2410",
          boxShadow:
            "0 8px 16px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(0,0,0,0.15)",
        }}
      >
        <Img
          src={staticFile("board/fish-board.png")}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            // The fish-board top strip occupies roughly Y=0..170 of a
            // 2475-tall image, so the strip is ~7% of the image height.
            // Scaling the source so its WIDTH matches our container makes
            // the cells render proportionally; we then offset upward by 0
            // since the top row is at Y=0.
            height: "auto",
          }}
        />
      </div>
      {/* Fish-track label above the strip */}
      <div
        style={{
          position: "absolute",
          left: FISH_TRACK_LEFT,
          top: FISH_TRACK_TOP - 32,
          color: "#faf3e3",
          fontFamily: "Iowan Old Style, Palatino, Georgia, serif",
          fontSize: 18,
          letterSpacing: 3,
          textShadow: "0 2px 6px rgba(0,0,0,0.85)",
          opacity: 0.85,
        }}
      >
        FISH TRACK 🐟 — workers eat fish to swim
      </div>
      {/* Beaver pawn */}
      <PawnOnTrack
        species="beaver"
        cell={beaverCell}
        pawnSize={pawnSize}
        offsetY={-4}
      />
      {/* Otter pawn (offset slightly so it doesn't overlap on the same cell) */}
      <PawnOnTrack
        species="otter"
        cell={otterCell}
        pawnSize={pawnSize}
        offsetY={+4}
      />
    </>
  );
};

const PawnOnTrack: React.FC<{
  species: SpeciesKey;
  cell: number;
  pawnSize: number;
  offsetY: number;
}> = ({ species, cell, pawnSize, offsetY }) => {
  const x = fishX(cell);
  const y = FISH_TRACK_TOP + FISH_TRACK_HEIGHT / 2 + offsetY;
  return (
    <div
      style={{
        position: "absolute",
        left: x - pawnSize / 2,
        top: y - pawnSize / 2,
        width: pawnSize,
        height: pawnSize,
        borderRadius: "50%",
        overflow: "hidden",
        border: "2px solid rgba(20,12,6,0.85)",
        boxShadow: "0 3px 6px rgba(0,0,0,0.7)",
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
};

// A subtle highlight ring drawn over a slot to draw attention. The board's
// printed slot box is rectangular; we trace it with a glowing border.
const SlotHighlight: React.FC<{
  cx: number;
  cy: number;
  w: number;
  h: number;
  intensity: number;
}> = ({ cx, cy, w, h, intensity }) => (
  <div
    style={{
      position: "absolute",
      left: cx - w / 2,
      top: cy - h / 2,
      width: w,
      height: h,
      borderRadius: 14,
      boxShadow: `0 0 0 ${4 * intensity}px rgba(255,210,80,${0.95 * intensity}),
                  0 0 ${30 * intensity}px ${8 * intensity}px rgba(255,210,80,${
        0.6 * intensity
      })`,
      pointerEvents: "none",
    }}
  />
);

// Floating cost cue (the "2🐟" pulse near a highlighted slot).
const CostPulse: React.FC<{
  x: number;
  y: number;
  text: string;
  intensity: number;
}> = ({ x, y, text, intensity }) => {
  if (intensity <= 0.01) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x - 80,
        top: y,
        width: 160,
        textAlign: "center",
        fontFamily: "Iowan Old Style, Palatino, Georgia, serif",
        fontSize: 36 + intensity * 18,
        fontWeight: 700,
        color: `rgb(255, ${230 - intensity * 40}, ${110 + intensity * 30})`,
        textShadow: "0 3px 12px rgba(0,0,0,0.85), 0 0 8px rgba(255,200,80,0.9)",
        opacity: intensity,
        transform: `translateY(${-12 * intensity}px) scale(${
          1 + intensity * 0.15
        })`,
        pointerEvents: "none",
      }}
    >
      {text}
    </div>
  );
};

// ============================================================================
// Scene
// ============================================================================

export const Scene1: React.FC<{ voice: Voice }> = ({ voice }) => {
  const t = useSeconds();
  const fps = useVideoConfig().fps;
  const frame = useCurrentFrame();

  // ---- Animation timeline ----

  // Phase A: highlight Headwaters slot 1 + show its "2🐟" cost cue
  const hwHighlight = interpolate(
    t,
    [
      T.highlightHeadwaters,
      T.highlightHeadwaters + 0.6,
      T.cardSlidesToRiver - 0.3,
      T.cardSlidesToRiver,
    ],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Phase B: card slides from HW slot 1 down-left to River 1
  const slideProgress = spring({
    frame: frame - T.cardSlidesToRiver * fps,
    fps,
    config: { damping: 14, mass: 0.9 },
  });
  const featuredX = interpolate(
    slideProgress,
    [0, 1],
    [bx(SLOT.hw1X), bx(SLOT.r1X)]
  );
  const featuredY = interpolate(
    slideProgress,
    [0, 1],
    [by(SLOT.topY), by(SLOT.botY)]
  );
  const featuredRotate = interpolate(slideProgress, [0, 0.5, 1], [0, -6, 0]);

  // Phase C: workers appear on the card after it lands
  const workerAppear = (offset: number) =>
    interpolate(
      t,
      [T.workersBid + offset, T.workersBid + offset + 0.35],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

  // Phase D: card drifts from River 1 to River 2 (plus a cost-cue pulse on R2)
  const driftProgress = spring({
    frame: frame - T.cardDrifts * fps,
    fps,
    config: { damping: 18, mass: 1.2 },
  });
  const driftedX = interpolate(
    driftProgress,
    [0, 1],
    [bx(SLOT.r1X), bx(SLOT.r2X)]
  );
  const r2CostPulse = interpolate(
    t,
    [T.cardDrifts + 0.6, T.cardDrifts + 1.1, T.cardDrifts + 2.0],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Phase E: logo fade in (cross-fade from the board to a clean closing card)
  const logoOpacity = interpolate(t, [T.logo, T.logo + 0.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const stageOpacity = interpolate(
    t,
    [T.logo - 0.3, T.logo + 0.5],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Which phase the featured card is in
  const cardInHeadwaters = t < T.cardSlidesToRiver;
  const cardSliding = t >= T.cardSlidesToRiver && t < T.cardDrifts;
  const cardDrifting = t >= T.cardDrifts;

  // Worker placements — each bidder claims a specific icon on Reed Stand.
  // Three beavers take the top row (icons 0, 1, 2); one otter takes the
  // bottom-left icon (icon 3).
  const cardCenter = cardDrifting
    ? { x: driftedX, y: by(SLOT.botY) }
    : cardSliding
    ? { x: featuredX, y: featuredY }
    : { x: bx(SLOT.hw1X), y: by(SLOT.topY) };
  const workerSlots: Array<{
    species: SpeciesKey;
    iconIdx: number;
    t: number;
  }> = [
    { species: "beaver", iconIdx: 0, t: 0.0 },
    { species: "beaver", iconIdx: 1, t: 0.3 },
    { species: "beaver", iconIdx: 2, t: 0.6 },
    { species: "otter", iconIdx: 3, t: 0.9 },
  ];

  // ---- Fish track pawn positions ----
  // Beaver pays 2🐟 to trigger the HW1 auction at T.cardSlidesToRiver, then
  // 3 workers × 2🐟/item during the bid spread across T.workersBid + {0, 0.3, 0.6}.
  // Otter pays 2🐟 for its single worker at T.workersBid + 0.9.
  const beaverPos = (() => {
    const s1 = interpolate(t, [T.cardSlidesToRiver, T.cardSlidesToRiver + 0.6], [0, 2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const s2 = interpolate(t, [T.workersBid + 0.0, T.workersBid + 0.5], [0, 2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const s3 = interpolate(t, [T.workersBid + 0.3, T.workersBid + 0.8], [0, 2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const s4 = interpolate(t, [T.workersBid + 0.6, T.workersBid + 1.1], [0, 2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return s1 + s2 + s3 + s4;
  })();
  const otterPos = interpolate(
    t,
    [T.workersBid + 0.9, T.workersBid + 1.4],
    [0, 2],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ---- Render ----

  const audioSrc = staticFile(`voiceover/scene1_${voice}.mp3`);

  return (
    <AbsoluteFill style={{ background: "#0a1a25", overflow: "hidden" }}>
      <Audio src={audioSrc} />

      {/* Side gutters: subtle water gradient matching the board's edge tones */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, #14334a 0%, #0e2440 60%, #0a1a25 100%)",
          opacity: stageOpacity,
        }}
      />

      {/* The river-board itself as the stage. Fitted to frame height, centered
          horizontally with subtle gutter shadows on either side. */}
      <Img
        src={staticFile("board/river-board-landscape.png")}
        style={{
          position: "absolute",
          left: BOARD_LEFT,
          top: BOARD_TOP,
          width: BOARD_FIT_W,
          height: BOARD_FIT_H,
          boxShadow:
            "0 0 80px 20px rgba(0,0,0,0.6), 0 0 40px 0 rgba(0,0,0,0.5)",
          opacity: stageOpacity,
        }}
      />

      {/* Static Headwaters cards (face-up in slots 3 and 2). The featured card
          lives in slot 1 (initially) and animates through the scene. */}
      <div style={{ opacity: stageOpacity }}>
        <Card
          src={staticFile("material-deck/MudFlat.png")}
          x={bx(SLOT.hw3X)}
          y={by(SLOT.topY)}
          rotate={-1.5}
        />
        <Card
          src={staticFile("material-deck/ClayBank.png")}
          x={bx(SLOT.hw2X)}
          y={by(SLOT.topY)}
          rotate={1}
        />

        {/* River cards already in play in spaces 3 and 4 */}
        <Card
          src={staticFile("material-deck/Logjam.png")}
          x={bx(SLOT.r3X)}
          y={by(SLOT.botY)}
          rotate={-2}
        />
        <Card
          src={staticFile("material-deck/CattailCluster.png")}
          x={bx(SLOT.r4X)}
          y={by(SLOT.botY)}
          rotate={1.5}
        />

        {/* Highlight ring on Headwaters 1 during the "pay two fish" phase.
            Cost pulse sits BELOW the card (between the two rows) so it never
            clips the frame edge and doesn't overlap the FLUSH HEADWATERS
            panel which is centered horizontally. */}
        <SlotHighlight
          cx={bx(SLOT.hw1X)}
          cy={by(SLOT.topY)}
          w={CARD_W * 1.12}
          h={CARD_H * 1.18}
          intensity={hwHighlight}
        />
        <CostPulse
          x={bx(SLOT.hw1X)}
          y={by(SLOT.topY) + CARD_H * 0.65}
          text="pay 2🐟"
          intensity={hwHighlight}
        />

        {/* Cost pulse on River 2 after the card drifts. Placed below the
            featured card on the bottom row, but above the board's shoreline
            arrows. */}
        <CostPulse
          x={bx(SLOT.r2X)}
          y={by(SLOT.botY) + CARD_H * 0.65}
          text="now 3🐟/item"
          intensity={r2CostPulse}
        />

        {/* The featured card (Reed Stand) — animates through Headwaters → River 1 → River 2 */}
        {cardInHeadwaters && (
          <Card
            src={staticFile("material-deck/ReedStand.png")}
            x={bx(SLOT.hw1X)}
            y={by(SLOT.topY)}
          />
        )}
        {cardSliding && (
          <Card
            src={staticFile("material-deck/ReedStand.png")}
            x={featuredX}
            y={featuredY}
            rotate={featuredRotate}
          />
        )}
        {cardDrifting && (
          <Card
            src={staticFile("material-deck/ReedStand.png")}
            x={driftedX}
            y={by(SLOT.botY)}
          />
        )}

        {/* Workers placed on Reed Stand's actual icon positions during the
            bid phase. Each chit is circular-clipped so it sits cleanly on top
            of the printed reed icon. */}
        {workerSlots.map((w, i) => {
          const icon = REED_STAND_ICONS[w.iconIdx];
          return (
            <Worker
              key={i}
              species={w.species}
              x={cardCenter.x + icon.dx * CARD_W}
              y={cardCenter.y + icon.dy * CARD_H}
              appear={workerAppear(w.t)}
            />
          );
        })}
      </div>

      {/* Fish track overlay at the bottom of the frame */}
      <div style={{ opacity: stageOpacity }}>
        <FishTrack beaverCell={beaverPos} otterCell={otterPos} />
      </div>

      {/* Closing card: solid water gradient + logo + tagline */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, #0b2940 0%, #1d4e6b 60%, #2f5d3a 100%)",
          opacity: logoOpacity,
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
          opacity: logoOpacity,
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <Img
          src={staticFile("artwork/logo.png")}
          style={{
            maxWidth: 720,
            width: "60%",
            height: "auto",
            filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.65))",
          }}
        />
        <div
          style={{
            marginTop: 40,
            color: PAPER,
            fontFamily: "Iowan Old Style, Palatino, Georgia, serif",
            fontSize: 44,
            letterSpacing: 2,
            textShadow: "0 4px 12px rgba(0,0,0,0.65)",
          }}
        >
          Build the bank before your rivals do.
        </div>
      </div>
    </AbsoluteFill>
  );
};

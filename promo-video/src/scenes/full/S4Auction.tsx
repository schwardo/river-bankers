import {
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BoardStage, Card, SlotHighlight, Worker } from "../../shared/components";
import {
  CARD_H,
  CARD_W,
  FISH_TRACK_HEIGHT,
  FISH_TRACK_LEFT,
  FISH_TRACK_RIGHT,
  FISH_TRACK_TOP,
  FRAME_H,
  FRAME_W,
  PAPER,
  REED_STAND_ICONS,
  SLOT,
  SPECIES_CHIT,
  SpeciesKey,
  bx,
  by,
  fishX,
} from "../../shared/geometry";

// S4 — Auction walkthrough. New no-lap Kore timing (scene starts at 32.6s).
const T = {
  intro: 0,                // "The main action is..."
  watch: 7.8,              // "Watch."                                   (master 40.4)
  highlightHW: 8.3,        // "I pay 2 fish to auction this Reed Stand." (40.9)
  secretBid: 14.4,         // "Everyone picks secretly..."               (47.0)
  showBids: 21.0,          // "Bids are revealed at the same time."      (53.6)
  bidBeaver: 23.0,         // "I bid three."                             (55.6)
  bidOtter: 24.2,          // "The otter bids one."                      (56.8)
  payFish: 26.8,           // "First we both pay our fish..."            (59.4)
  placePlenty: 36.6,       // "Then place workers."                      (69.2)
  rewindStart: 45.3,       // "But suppose I bid four..."                (77.9)
  jamPlace: 50.1,          // "Seven workers, but only five icons..."    (82.7)
  jamOverbid: 54.4,        // "Subtract that from each bid..."           (87.0)
  jamPlaceOnCard: 59.1,    // "The extras..." — workers settle on card   (91.7)
  cardDrifts: 64.7,        // "Uncovered icons left?"                    (97.3)
};
const SCENE_END = 77.5;

export const SCENE4_DURATION_SECONDS = SCENE_END;

// ============================================================
// Helpers
// ============================================================

const TextChip: React.FC<{
  text: string;
  x: number;
  y: number;
  intensity: number;
  color?: string;
  bg?: string;
  fontSize?: number;
  letterSpacing?: number;
  width?: number;
}> = ({
  text,
  x,
  y,
  intensity,
  color = "#ffd766",
  bg = "rgba(10, 26, 37, 0.92)",
  fontSize = 38,
  letterSpacing = 4,
  width,
}) => {
  if (intensity <= 0.01) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x - (width ?? FRAME_W * 0.6) / 2,
        top: y,
        width: width ?? FRAME_W * 0.6,
        textAlign: "center",
        fontFamily: "Iowan Old Style, Palatino, Georgia, serif",
        fontSize,
        letterSpacing,
        color,
        fontWeight: 700,
        opacity: intensity,
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          background: bg,
          padding: "10px 28px",
          borderRadius: 14,
          border: "2px solid rgba(255, 210, 100, 0.55)",
          boxShadow: "0 6px 18px rgba(0,0,0,0.7)",
          display: "inline-block",
          textShadow: "0 2px 8px rgba(0,0,0,0.9)",
        }}
      >
        {text}
      </span>
    </div>
  );
};

// Chit thumbnail (used in bid displays and math rows)
const ChitIcon: React.FC<{
  species: SpeciesKey;
  size?: number;
}> = ({ species, size = 56 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      overflow: "hidden",
      border: "2px solid rgba(20,12,6,0.85)",
      boxShadow: "0 3px 6px rgba(0,0,0,0.55)",
      background: "#3a2515",
      flex: "none",
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

// Stack of N chits of a species, animated in as a "bid"
const BidStack: React.FC<{
  species: SpeciesKey;
  count: number;
  cx: number;
  cy: number;
  perChitAppear: (i: number) => number;
}> = ({ species, count, cx, cy, perChitAppear }) => {
  const chitSize = 64;
  const gap = 10;
  const rowW = count * chitSize + (count - 1) * gap;
  const leftX = cx - rowW / 2;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const appear = perChitAppear(i);
        const visual = chitSize * (0.6 + 0.4 * appear);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: leftX + i * (chitSize + gap) + (chitSize - visual) / 2,
              top: cy - visual / 2 - 16 * (1 - appear),
              width: visual,
              height: visual,
              borderRadius: "50%",
              overflow: "hidden",
              opacity: appear,
              border: "3px solid rgba(20,12,6,0.85)",
              boxShadow: `0 ${4 * appear}px ${8 * appear}px rgba(0,0,0,0.6)`,
              background: "#3a2515",
              transform: `scale(${0.85 + 0.15 * appear})`,
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
    </>
  );
};

// Math row "× × × | - × × | = × " using chit icons.
// kept = solid chits, struck = chits with red X overlay.
const MathRow: React.FC<{
  species: SpeciesKey;
  bid: number;
  overbid: number;
  y: number;
  intensity: number;
}> = ({ species, bid, overbid, y, intensity }) => {
  if (intensity <= 0.01) return null;
  const taken = Math.max(0, bid - overbid);
  const removed = bid - taken;
  const chitSize = 50;
  const gap = 8;
  const groupGap = 26;
  // Components: [bid chits with first `taken` solid, last `removed` struck]
  //             " − overbid chits "
  //             " = taken chits "
  const totalCount = bid + 1 + overbid + 1 + taken; // bid + minus + overbid + equals + taken
  const itemW = chitSize;
  const labelW = 50; // for the "−" / "=" symbols
  const totalW =
    bid * itemW + (bid - 1) * gap +
    groupGap + labelW + groupGap +
    overbid * itemW + (overbid - 1) * gap +
    groupGap + labelW + groupGap +
    taken * itemW + Math.max(0, taken - 1) * gap;
  const startX = (FRAME_W - totalW) / 2;
  let cursor = startX;
  const labelBase = "Iowan Old Style, Palatino, Georgia, serif";

  const items: Array<{ type: "chit" | "sym"; struck?: boolean; sym?: string }> = [];
  for (let i = 0; i < bid; i++) {
    items.push({ type: "chit", struck: i >= taken });
  }
  items.push({ type: "sym", sym: "−" });
  for (let i = 0; i < overbid; i++) {
    items.push({ type: "chit" });
  }
  items.push({ type: "sym", sym: "=" });
  for (let i = 0; i < taken; i++) {
    items.push({ type: "chit" });
  }

  // Now compute X positions in a single pass with appropriate gaps
  const positions: number[] = [];
  let x = 0;
  for (let i = 0; i < items.length; i++) {
    positions.push(x);
    const it = items[i];
    const w = it.type === "chit" ? chitSize : labelW;
    let g = gap;
    if (items[i].type === "sym") {
      g = groupGap;
    } else if (i + 1 < items.length && items[i + 1].type === "sym") {
      g = groupGap;
    }
    x += w + g;
  }
  const rowW = x - gap;
  const rowLeft = (FRAME_W - rowW) / 2;

  return (
    <div
      style={{
        position: "absolute",
        left: rowLeft,
        top: y,
        height: chitSize + 16,
        display: "flex",
        alignItems: "center",
        opacity: intensity,
        pointerEvents: "none",
      }}
    >
      {/* Backdrop pill */}
      <div
        style={{
          position: "absolute",
          left: -22,
          top: -10,
          width: rowW + 44,
          height: chitSize + 24,
          background: "rgba(10, 26, 37, 0.92)",
          borderRadius: 14,
          border: "2px solid rgba(255, 210, 100, 0.45)",
          boxShadow: "0 6px 18px rgba(0,0,0,0.65)",
        }}
      />
      {items.map((it, i) => {
        const left = positions[i];
        if (it.type === "sym") {
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left,
                top: 0,
                width: labelW,
                height: chitSize,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: labelBase,
                fontSize: 38,
                fontWeight: 700,
                color: "#ffd766",
                textShadow: "0 2px 6px rgba(0,0,0,0.85)",
              }}
            >
              {it.sym}
            </div>
          );
        }
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left,
              top: 0,
              width: chitSize,
              height: chitSize,
              borderRadius: "50%",
              overflow: "hidden",
              border: "2px solid rgba(20,12,6,0.85)",
              background: "#3a2515",
              filter: it.struck ? "grayscale(0.7) opacity(0.45)" : "none",
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
            {it.struck && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 36,
                  fontWeight: 800,
                  color: "rgba(220, 60, 60, 0.95)",
                  textShadow: "0 2px 4px rgba(0,0,0,0.9)",
                }}
              >
                ✕
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ============================================================
// Scene
// ============================================================

export const S4Auction: React.FC = () => {
  const frame = useCurrentFrame();
  const fps = useVideoConfig().fps;
  const t = frame / fps;

  // ----- Phase masks -----

  const introCaptionAlpha = interpolate(
    t,
    [T.intro + 0.2, T.intro + 0.8, T.highlightHW + 0.2, T.highlightHW + 0.7],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const hwHighlight = interpolate(
    t,
    [T.highlightHW, T.highlightHW + 0.6, T.cardDrifts - 0.5, T.cardDrifts],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const pay2FishPulse = interpolate(
    t,
    [T.highlightHW + 0.5, T.highlightHW + 1.5, T.highlightHW + 3.0, T.highlightHW + 3.7],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const secretBidAlpha = interpolate(
    t,
    [T.secretBid, T.secretBid + 0.5, T.showBids - 0.2, T.showBids + 0.2],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // The BID PANELS are visible from the secret-bid phase through the
  // payment phase. While the panels are visible we either show hidden ("?")
  // placeholders (before showBids) or the real chits (after the per-bid
  // reveal). Below, `bidBoxesAlpha` controls the panels; `chitRevealAlpha`
  // controls the cover lift.
  const bidBoxesAlpha = interpolate(
    t,
    [T.secretBid, T.secretBid + 0.4, T.payFish - 0.3, T.payFish],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  // Cover lifts at showBids — chits become visible
  const chitRevealAlpha = interpolate(
    t,
    [T.showBids - 0.2, T.showBids + 0.4],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const payCaptionAlpha = interpolate(
    t,
    [T.payFish, T.payFish + 0.5, T.placePlenty - 0.3, T.placePlenty],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const plentyCaptionAlpha = interpolate(
    t,
    [T.placePlenty, T.placePlenty + 0.5, T.rewindStart - 0.3, T.rewindStart],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const jamHeadlineAlpha = interpolate(
    t,
    [T.rewindStart, T.rewindStart + 0.6, T.cardDrifts - 0.3, T.cardDrifts],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Math rows appear when narration says "Subtract that from each bid..."
  const jamMathAlpha = interpolate(
    t,
    [T.jamOverbid, T.jamOverbid + 0.6, T.cardDrifts - 0.3, T.cardDrifts],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const driftCaptionAlpha = interpolate(
    t,
    [T.cardDrifts + 0.5, T.cardDrifts + 1.2, SCENE_END - 0.5, SCENE_END],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ----- Featured card position -----
  // The auction runs in place at HW1. After it settles, the card drifts
  // exactly one slot — HW1 → River 1 — and stays there. Per-icon cost
  // changes from 1🐟 (Headwaters rate) to 2🐟 (River 1 rate).

  const slideHW1toR1 = spring({
    frame: frame - Math.round(T.cardDrifts * fps),
    fps,
    config: { damping: 14, mass: 1 },
  });

  let cardX: number;
  let cardY: number;
  let cardRotate = 0;
  if (t < T.cardDrifts) {
    cardX = bx(SLOT.hw1X);
    cardY = by(SLOT.topY);
  } else {
    cardX = interpolate(slideHW1toR1, [0, 1], [bx(SLOT.hw1X), bx(SLOT.r1X)]);
    cardY = interpolate(slideHW1toR1, [0, 1], [by(SLOT.topY), by(SLOT.botY)]);
    cardRotate = interpolate(slideHW1toR1, [0, 0.5, 1], [0, -6, 0]);
  }

  // ----- Worker state machine -----
  // Two distinct worker sets land on Reed Stand:
  //   * placePlenty (33.9..rewindStart): plenty case, 3 beavers + 1 otter
  //   * jamPlaceOnCard onwards         : JAM case, 2 beavers + 1 otter, the
  //                                      outcome that rides the drift
  // The transition from plenty → jam fades out the plenty workers during
  // the JAM bid-stack / math beats, then the jam workers settle on the
  // card and stay there through the drift.
  const plentyWorkers: Array<{ species: SpeciesKey; iconIdx: number }> = [
    { species: "beaver", iconIdx: 0 },
    { species: "beaver", iconIdx: 1 },
    { species: "beaver", iconIdx: 2 },
    { species: "otter", iconIdx: 3 },
  ];
  // JAM outcome: beaver bid 4, otter bid 3, overbid 2 → beaver takes 2, otter 1
  const jamWorkers: Array<{ species: SpeciesKey; iconIdx: number }> = [
    { species: "beaver", iconIdx: 0 },
    { species: "beaver", iconIdx: 1 },
    { species: "otter", iconIdx: 3 },
  ];

  // Plenty group opacity
  const plentyOpacity = (() => {
    if (t < T.placePlenty) return 0;
    if (t < T.rewindStart) return 1;
    // Fade out during JAM rewind
    return interpolate(
      t,
      [T.rewindStart, T.rewindStart + 0.6],
      [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  })();

  // Jam group opacity — appears at jamPlaceOnCard, stays through drift
  const jamOpacity = (() => {
    if (t < T.jamPlaceOnCard) return 0;
    return 1;
  })();

  const perPlentyAppear = (i: number) => {
    if (t < T.placePlenty) return 0;
    const startAt = T.placePlenty + 0.3 + i * 0.35;
    return interpolate(t, [startAt, startAt + 0.35], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  };
  const perJamAppear = (i: number) => {
    if (t < T.jamPlaceOnCard) return 0;
    const startAt = T.jamPlaceOnCard + i * 0.3;
    return interpolate(t, [startAt, startAt + 0.4], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  };

  // ----- Bid chit reveals (real plenty outcome: 3 beavers + 1 otter) -----

  const bidBeaverAppear = (i: number) =>
    interpolate(
      t,
      [T.bidBeaver + i * 0.15, T.bidBeaver + i * 0.15 + 0.3],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  const bidOtterAppear = (i: number) =>
    interpolate(
      t,
      [T.bidOtter + i * 0.15, T.bidOtter + i * 0.15 + 0.3],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

  // ----- JAM hypothetical bid reveals (4 beavers + 3 otters) -----
  // Beaver "I bid four" lands ~rewindStart + 0.5s; otter "and the otter three"
  // lands ~rewindStart + 1.5s. Both stacks stay visible until the math row
  // takes over at jamOverbid.
  const jamBidsAlpha = interpolate(
    t,
    [T.rewindStart + 0.2, T.rewindStart + 0.7, T.jamOverbid - 0.2, T.jamOverbid + 0.4],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const jamBidBeaverAppear = (i: number) =>
    interpolate(
      t,
      [T.rewindStart + 0.5 + i * 0.12, T.rewindStart + 0.5 + i * 0.12 + 0.3],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  const jamBidOtterAppear = (i: number) =>
    interpolate(
      t,
      [T.rewindStart + 1.5 + i * 0.12, T.rewindStart + 1.5 + i * 0.12 + 0.3],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

  // ----- Fish-track pawn positions -----

  const beaverFish = (() => {
    const pullPay = interpolate(
      t,
      [T.highlightHW, T.highlightHW + 0.6],
      [0, 2],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    const bidPay = interpolate(
      t,
      [T.payFish, T.payFish + 2.5],
      [0, 3],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    return pullPay + bidPay;
  })();
  const otterFish = interpolate(
    t,
    [T.payFish + 1.0, T.payFish + 2.5],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <>
      <BoardStage />

      {/* Other Headwaters cards (no rotation — tidy alignment to slot outlines) */}
      <Card src={staticFile("material-deck/MudFlat.png")} x={bx(SLOT.hw3X)} y={by(SLOT.topY)} />
      <Card src={staticFile("material-deck/ClayBank.png")} x={bx(SLOT.hw2X)} y={by(SLOT.topY)} />
      <Card src={staticFile("material-deck/Logjam.png")} x={bx(SLOT.r3X)} y={by(SLOT.botY)} />
      <Card src={staticFile("material-deck/CattailCluster.png")} x={bx(SLOT.r4X)} y={by(SLOT.botY)} />

      {/* Featured Reed Stand card */}
      <Card
        src={staticFile("material-deck/ReedStand.png")}
        x={cardX}
        y={cardY}
        rotate={cardRotate}
      />

      {/* HW1 highlight ring during the auction-setup phase */}
      <SlotHighlight
        cx={bx(SLOT.hw1X)}
        cy={by(SLOT.topY)}
        w={CARD_W * 1.14}
        h={CARD_H * 1.2}
        intensity={hwHighlight}
      />

      {/* ---- Plenty workers on the card (faded during JAM rewind) ---- */}
      {plentyOpacity > 0.01 && (
        <div style={{ opacity: plentyOpacity }}>
          {plentyWorkers.map((w, i) => {
            const icon = REED_STAND_ICONS[w.iconIdx];
            return (
              <Worker
                key={`p${i}`}
                species={w.species}
                x={cardX + icon.dx * CARD_W}
                y={cardY + icon.dy * CARD_H}
                appear={perPlentyAppear(i)}
              />
            );
          })}
        </div>
      )}

      {/* ---- JAM workers (2 beavers + 1 otter) ride along on the drift ---- */}
      {jamOpacity > 0.01 && (
        <div style={{ opacity: jamOpacity }}>
          {jamWorkers.map((w, i) => {
            const icon = REED_STAND_ICONS[w.iconIdx];
            return (
              <Worker
                key={`j${i}`}
                species={w.species}
                x={cardX + icon.dx * CARD_W}
                y={cardY + icon.dy * CARD_H}
                appear={perJamAppear(i)}
              />
            );
          })}
        </div>
      )}

      {/* ---- Intro caption ---- */}
      <TextChip
        text="MULTI-UNIT AUCTION"
        x={FRAME_W / 2}
        y={FRAME_H * 0.06}
        intensity={introCaptionAlpha}
        fontSize={48}
        letterSpacing={8}
        width={780}
      />

      {/* ---- "pay 2🐟" pulse during highlight phase ---- */}
      {pay2FishPulse > 0.01 && (
        <TextChip
          text="pay 2🐟"
          x={bx(SLOT.hw1X)}
          y={by(SLOT.topY) + CARD_H * 0.7}
          intensity={pay2FishPulse}
          fontSize={36}
          letterSpacing={3}
          width={220}
        />
      )}

      {/* ---- "secretly bid 0 – 5 workers" caption ---- */}
      <TextChip
        text="Secretly bid 0 – 5 workers"
        x={FRAME_W / 2}
        y={FRAME_H * 0.06}
        intensity={secretBidAlpha}
        color={PAPER}
        fontSize={40}
        letterSpacing={4}
        width={720}
      />

      {/* ---- Bid panels: appear at the secret-bid prompt with hidden
          contents ("?"), then the cover lifts at showBids and the real
          chits drop in. Panels live in the middle band so the HW cards
          stay visible above. */}
      {bidBoxesAlpha > 0.01 && (() => {
        const stackY = FRAME_H * 0.40;
        const labelY = stackY - 60;
        return (
          <>
            {[
              { label: "BEAVER BIDS", cx: FRAME_W * 0.32, count: 3, species: "beaver" as const, appearFn: bidBeaverAppear },
              { label: "OTTER BIDS",  cx: FRAME_W * 0.68, count: 1, species: "otter"  as const, appearFn: bidOtterAppear  },
            ].map(({ label, cx, count, species, appearFn }) => {
              const stackW = Math.max(260, count * 72 + 40);
              return (
                <div key={label}>
                  {/* Backdrop pill */}
                  <div
                    style={{
                      position: "absolute",
                      left: cx - stackW / 2,
                      top: labelY - 12,
                      width: stackW,
                      height: 160,
                      background: "rgba(10, 26, 37, 0.92)",
                      borderRadius: 18,
                      border: "2px solid rgba(255, 210, 100, 0.55)",
                      boxShadow: "0 8px 22px rgba(0,0,0,0.7)",
                      opacity: bidBoxesAlpha,
                      pointerEvents: "none",
                    }}
                  />
                  {/* Label */}
                  <div
                    style={{
                      position: "absolute",
                      left: cx - stackW / 2,
                      top: labelY,
                      width: stackW,
                      textAlign: "center",
                      fontFamily: "Iowan Old Style, Palatino, Georgia, serif",
                      fontSize: 28,
                      letterSpacing: 4,
                      color: "#ffd766",
                      opacity: bidBoxesAlpha,
                      textShadow: "0 2px 6px rgba(0,0,0,0.9)",
                    }}
                  >
                    {label}
                  </div>
                  {/* Hidden state ("?" placeholder) — only visible before
                      the cover lifts at showBids. */}
                  {chitRevealAlpha < 0.95 && (
                    <div
                      style={{
                        position: "absolute",
                        left: cx - stackW / 2 + 20,
                        top: stackY,
                        width: stackW - 40,
                        height: 80,
                        background: "rgba(255, 210, 100, 0.12)",
                        border: "2px dashed rgba(255, 210, 100, 0.55)",
                        borderRadius: 14,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 44,
                        letterSpacing: 12,
                        color: "rgba(255, 210, 100, 0.9)",
                        fontFamily: "Iowan Old Style, Palatino, Georgia, serif",
                        fontWeight: 700,
                        opacity: bidBoxesAlpha * (1 - chitRevealAlpha),
                        textShadow: "0 2px 6px rgba(0,0,0,0.85)",
                      }}
                    >
                      ?&nbsp;?&nbsp;?
                    </div>
                  )}
                  {/* Revealed chits */}
                  {chitRevealAlpha > 0.05 && (
                    <BidStack
                      species={species}
                      count={count}
                      cx={cx}
                      cy={stackY + 30}
                      perChitAppear={(i) =>
                        Math.min(bidBoxesAlpha, chitRevealAlpha, appearFn(i))
                      }
                    />
                  )}
                </div>
              );
            })}
          </>
        );
      })()}

      {/* ---- Pay fish caption ---- */}
      <TextChip
        text="BOTH PAY · 1🐟 per icon"
        x={FRAME_W / 2}
        y={FRAME_H * 0.06}
        intensity={payCaptionAlpha}
        fontSize={40}
        letterSpacing={4}
        width={720}
      />

      {/* ---- Plenty caption ---- */}
      <TextChip
        text="PLENTY · bids ≤ icons · everyone gets what they bid"
        x={FRAME_W / 2}
        y={FRAME_H * 0.06}
        intensity={plentyCaptionAlpha}
        color="#9ee094"
        fontSize={36}
        letterSpacing={4}
        width={920}
      />

      {/* ---- Jam: hypothetical bids "4 and the otter three" caption ---- */}
      <TextChip
        text="…suppose beaver bid 4 and otter bid 3…"
        x={FRAME_W / 2}
        y={FRAME_H * 0.045}
        intensity={jamHeadlineAlpha}
        color={PAPER}
        fontSize={28}
        letterSpacing={2}
        width={780}
      />
      <TextChip
        text="JAM · overbid = 2"
        x={FRAME_W / 2}
        y={FRAME_H * 0.12}
        intensity={jamHeadlineAlpha}
        color="#ff8a66"
        fontSize={44}
        letterSpacing={6}
        width={560}
      />

      {/* ---- JAM bid stacks: 4 beaver + 3 otter, mirroring first auction ---- */}
      {jamBidsAlpha > 0.01 && (() => {
        const stackY = FRAME_H * 0.40;
        const labelY = stackY - 60;
        return (
          <>
            {[
              { label: "BEAVER BIDS 4", cx: FRAME_W * 0.32, count: 4, species: "beaver" as const, appearFn: jamBidBeaverAppear },
              { label: "OTTER BIDS 3",  cx: FRAME_W * 0.68, count: 3, species: "otter"  as const, appearFn: jamBidOtterAppear  },
            ].map(({ label, cx, count, species, appearFn }) => {
              const stackW = Math.max(280, count * 72 + 40);
              return (
                <div key={label}>
                  <div
                    style={{
                      position: "absolute",
                      left: cx - stackW / 2,
                      top: labelY - 12,
                      width: stackW,
                      height: 160,
                      background: "rgba(45, 18, 12, 0.92)",
                      borderRadius: 18,
                      border: "2px solid rgba(255, 138, 102, 0.55)",
                      boxShadow: "0 8px 22px rgba(0,0,0,0.7)",
                      opacity: jamBidsAlpha,
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: cx - stackW / 2,
                      top: labelY,
                      width: stackW,
                      textAlign: "center",
                      fontFamily: "Iowan Old Style, Palatino, Georgia, serif",
                      fontSize: 26,
                      letterSpacing: 4,
                      color: "#ffd1a8",
                      opacity: jamBidsAlpha,
                      textShadow: "0 2px 6px rgba(0,0,0,0.9)",
                    }}
                  >
                    {label}
                  </div>
                  <BidStack
                    species={species}
                    count={count}
                    cx={cx}
                    cy={stackY + 30}
                    perChitAppear={(i) => Math.min(jamBidsAlpha, appearFn(i))}
                  />
                </div>
              );
            })}
          </>
        );
      })()}

      {/* ---- Overbid math rows (chits + arithmetic) ---- */}
      {jamMathAlpha > 0.01 && (
        <>
          <MathRow
            species="beaver"
            bid={4}
            overbid={2}
            y={FRAME_H * 0.34}
            intensity={jamMathAlpha}
          />
          <MathRow
            species="otter"
            bid={3}
            overbid={2}
            y={FRAME_H * 0.46}
            intensity={jamMathAlpha}
          />
        </>
      )}

      {/* ---- Drift caption ---- */}
      <TextChip
        text="card drifts downstream · cost: 1🐟 → 2🐟 / icon"
        x={FRAME_W / 2}
        y={FRAME_H * 0.06}
        intensity={driftCaptionAlpha}
        fontSize={36}
        letterSpacing={3}
        width={900}
      />

      {/* ---- Fish track ---- */}
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
            height: "auto",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: FISH_TRACK_LEFT,
          top: FISH_TRACK_TOP - 28,
          color: PAPER,
          fontFamily: "Iowan Old Style, Palatino, Georgia, serif",
          fontSize: 16,
          letterSpacing: 3,
          textShadow: "0 2px 6px rgba(0,0,0,0.85)",
          opacity: 0.85,
        }}
      >
        FISH TRACK 🐟
      </div>

      <PawnOnTrack species="beaver" cell={beaverFish} offsetY={-4} />
      <PawnOnTrack species="otter" cell={otterFish} offsetY={+4} />
    </>
  );
};

const PawnOnTrack: React.FC<{
  species: SpeciesKey;
  cell: number;
  offsetY?: number;
}> = ({ species, cell, offsetY = 0 }) => {
  const x = fishX(cell);
  const y = FISH_TRACK_TOP + FISH_TRACK_HEIGHT / 2 + offsetY;
  const size = 56;
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
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

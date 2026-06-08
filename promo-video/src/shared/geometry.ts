// Board geometry shared across all full-video scenes.
// The reference asset is `public/board/river-board-landscape.png` (4875×3075
// landscape, baked from river-board.png with a CCW transpose). At 1080p the
// board fits by height: scale = 1080/3075 ≈ 0.3512, board width = 1712,
// horizontally centered with 104px gutters on either side.

export const FRAME_W = 1920;
export const FRAME_H = 1080;
export const BOARD_NATIVE_W = 4875;
export const BOARD_NATIVE_H = 3075;
export const BOARD_FIT_H = FRAME_H;
export const BOARD_FIT_W = (BOARD_FIT_H * BOARD_NATIVE_W) / BOARD_NATIVE_H;
export const BOARD_LEFT = (FRAME_W - BOARD_FIT_W) / 2;
export const BOARD_TOP = 0;

// Convert board-relative (0..1) coordinates to frame pixels.
export const bx = (frac: number) => BOARD_LEFT + frac * BOARD_FIT_W;
export const by = (frac: number) => BOARD_TOP + frac * BOARD_FIT_H;
export const bs = (frac: number) => frac * BOARD_FIT_W;

// Slot centers, as fractions of the landscape board.
export const SLOT = {
  topY: 0.176,
  botY: 0.587,
  matDeckX: 0.13,
  hw3X: 0.361,
  hw2X: 0.601,
  hw1X: 0.832,
  r1X: 0.13,
  r2X: 0.361,
  r3X: 0.601,
  r4X: 0.832,
  shoreX: 0.96,
};

// Card display size, board-relative. Printed card-outline rectangle is
// ~1028 board-px wide × 871 tall (1.18 aspect). Real material cards are
// 1050×750 (1.40 aspect, landscape), so we fit by width.
export const CARD_W_FRAC = 0.21;
export const CARD_ASPECT = 1050 / 750;
export const CARD_W = bs(CARD_W_FRAC);
export const CARD_H = CARD_W / CARD_ASPECT;

// Reed Stand icon positions (3-over-2), as fractions of card size relative
// to card center. Measured from the 1050×750 PNG.
export const REED_STAND_ICONS: Array<{ dx: number; dy: number }> = [
  { dx: -0.224, dy: -0.08 },
  { dx: 0.0, dy: -0.08 },
  { dx: +0.224, dy: -0.08 },
  { dx: -0.114, dy: +0.21 },
  { dx: +0.11, dy: +0.21 },
];

export const WORKER_FRAC_OF_CARD = 0.13;
export const WORKER_PX = CARD_W * WORKER_FRAC_OF_CARD;

// Fish-track strip overlay.
export const FISH_TRACK_HEIGHT = 130;
export const FISH_TRACK_TOP = FRAME_H - FISH_TRACK_HEIGHT - 8;
export const FISH_TRACK_LEFT = 24;
export const FISH_TRACK_RIGHT = FRAME_W - 24;
export const FISH_BOARD_W = 2475;

export const fishX = (cellIdx: number) => {
  const sourceX = 88 + cellIdx * 154;
  const containerW = FISH_TRACK_RIGHT - FISH_TRACK_LEFT;
  return FISH_TRACK_LEFT + (sourceX * containerW) / FISH_BOARD_W;
};

// Species
export type SpeciesKey = "beaver" | "otter" | "muskrat" | "mink";
export const SPECIES_CHIT: Record<SpeciesKey, string> = {
  beaver: "worker-beaver.png",
  otter: "worker-otter.png",
  muskrat: "worker-muskrat.png",
  mink: "worker-mink.png",
};
export const SPECIES_LABEL: Record<SpeciesKey, string> = {
  beaver: "BEAVER",
  otter: "OTTER",
  muskrat: "MUSKRAT",
  mink: "MINK",
};

// Style tokens
export const PAPER = "#faf3e3";
export const INK = "#2c1f15";
export const WATER_DEEP = "#1d4e6b";

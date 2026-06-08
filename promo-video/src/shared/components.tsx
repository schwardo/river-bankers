import { AbsoluteFill, Img, staticFile } from "remotion";
import {
  BOARD_FIT_H,
  BOARD_FIT_W,
  BOARD_LEFT,
  BOARD_TOP,
  CARD_ASPECT,
  CARD_W,
  SPECIES_CHIT,
  SpeciesKey,
  WORKER_PX,
} from "./geometry";

// ---------- River-board backdrop ----------

export const BoardStage: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => (
  <>
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(180deg, #14334a 0%, #0e2440 60%, #0a1a25 100%)",
        opacity,
      }}
    />
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
        opacity,
      }}
    />
  </>
);

// ---------- Card ----------

export const Card: React.FC<{
  src: string;
  x: number;
  y: number;
  rotate?: number;
  highlight?: number;
  scale?: number;
  width?: number;
  opacity?: number;
}> = ({ src, x, y, rotate = 0, highlight = 0, scale = 1, width, opacity = 1 }) => {
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
        opacity,
      }}
    >
      <Img
        src={src}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
};

// ---------- Worker chit (circular-clipped) ----------

export const Worker: React.FC<{
  species: SpeciesKey;
  x: number;
  y: number;
  appear?: number;
  size?: number;
}> = ({ species, x, y, appear = 1, size = WORKER_PX }) => {
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

// ---------- Highlight ring around a slot ----------

export const SlotHighlight: React.FC<{
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

// ---------- Cost / caption pulse ----------

export const Pulse: React.FC<{
  x: number;
  y: number;
  text: string;
  intensity: number;
  size?: number;
  width?: number;
}> = ({ x, y, text, intensity, size = 36, width = 240 }) => {
  if (intensity <= 0.01) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x - width / 2,
        top: y,
        width,
        textAlign: "center",
        fontFamily: "Iowan Old Style, Palatino, Georgia, serif",
        fontSize: size + intensity * 14,
        fontWeight: 700,
        color: `rgb(255, ${230 - intensity * 40}, ${110 + intensity * 30})`,
        textShadow:
          "0 3px 12px rgba(0,0,0,0.85), 0 0 8px rgba(255,200,80,0.9)",
        opacity: intensity,
        transform: `translateY(${-12 * intensity}px) scale(${
          1 + intensity * 0.12
        })`,
        pointerEvents: "none",
      }}
    >
      {text}
    </div>
  );
};

// ---------- Banner caption ----------

export const Banner: React.FC<{
  text: string;
  y?: number;
  intensity?: number;
  color?: string;
}> = ({ text, y = 60, intensity = 1, color = "#ffd766" }) => (
  <div
    style={{
      position: "absolute",
      top: y,
      left: 0,
      right: 0,
      textAlign: "center",
      fontFamily: "Iowan Old Style, Palatino, Georgia, serif",
      fontSize: 34,
      letterSpacing: 6,
      fontWeight: 700,
      color,
      textShadow: "0 4px 14px rgba(0,0,0,0.75)",
      opacity: intensity,
      transform: `translateY(${-8 * (1 - intensity)}px)`,
      pointerEvents: "none",
    }}
  >
    {text}
  </div>
);

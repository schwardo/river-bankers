import {
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BoardStage, Worker } from "../../shared/components";
import {
  FRAME_H,
  FRAME_W,
  PAPER,
  SPECIES_CHIT,
  SpeciesKey,
} from "../../shared/geometry";

// S6 — Build (13.3s). New no-lap Kore timing (scene starts at master 110.1s).
//   master 110.10  local  0.00  "Workers don't score on their own."
//   master 111.80  local  1.70  "To build a structure, pick your workers up..."
//   master 117.60  local  7.50  "each structure scores victory points..."
//   master 123.40  local 13.30  scene end
//
// Visual beats:
//   0.0..1.7   : title-card "Workers alone score 0 points"
//   1.7..5.5   : two material cards visible at scene start with worker chits
//                already sitting on them; structure card slides in alongside
//   5.5..7.5   : workers lift off and materials drain into structure card
//   7.5..13.3  : structure highlights with VP starburst and tagline
const STRUCTURE_CARD = "BeaverDam.png"; // requires 4 logs + 2 mud
// Two source material cards "paying for" the structure:
//   * Logjam (7 logs) — supplies the 4 logs
//   * MudFlat (5 mud) — supplies the 2 mud
const SOURCE_MATERIAL_CARDS = [
  { card: "Logjam.png",  workers: [{ species: "beaver" as const }, { species: "beaver" as const }, { species: "beaver" as const }, { species: "beaver" as const }] },
  { card: "MudFlat.png", workers: [{ species: "beaver" as const }, { species: "beaver" as const }] },
];

export const S6Build: React.FC = () => {
  const frame = useCurrentFrame();
  const fps = useVideoConfig().fps;
  const t = frame / fps;

  // Background dim
  const bgAlpha = interpolate(t, [0, 1.2], [0.55, 0.22], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Headline 2 (after structure card lands): "Spend workers + materials → BUILD"
  const headline2Alpha = interpolate(t, [3.0, 3.7, 7.0, 7.5], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Source material cards appear right at the start of the build sentence.
  // Workers are sitting on them from frame zero of this beat.
  const sourceAppear = (i: number) =>
    interpolate(
      t,
      [1.7 + i * 0.15, 2.2 + i * 0.15],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

  // Materials flow into structure at 5.5s onwards
  const materialFlow = interpolate(t, [5.5, 7.0], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Structure card slides in at ~3.0s and parks center-right
  const structSpring = spring({
    frame: frame - Math.round(3.0 * fps),
    fps,
    config: { damping: 14, mass: 1 },
  });

  // Structure card layout (portrait)
  const structW = 360;
  const structH = structW / 0.714; // ≈ 504
  const structX = FRAME_W * 0.66;
  const structFinalY = FRAME_H * 0.5;
  const structY = interpolate(
    structSpring,
    [0, 1],
    [FRAME_H + structH / 2, structFinalY]
  );
  const structRotate = interpolate(structSpring, [0, 0.5, 1], [10, -4, 0]);
  const structOpacity = structSpring;

  // VP pulse at 7.5s ("each structure scores victory points...")
  const vpPulse = interpolate(t, [7.5, 8.4, 13.3], [0, 1, 0.85], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const finalLineAlpha = interpolate(t, [7.5, 8.1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Source material card geometry (landscape)
  const matW = 280;
  const matH = matW / 1.4; // ≈ 200
  const matGap = 32;
  const matLeftX = FRAME_W * 0.22;
  const matTopY = FRAME_H * 0.42 - (matH + matGap) / 2;

  return (
    <>
      <BoardStage opacity={bgAlpha} />

      {/* Headline 2 */}
      <div
        style={{
          position: "absolute",
          top: FRAME_H * 0.08,
          left: 0,
          right: 0,
          textAlign: "center",
          color: PAPER,
          fontFamily: "Iowan Old Style, Palatino, Georgia, serif",
          fontSize: 44,
          letterSpacing: 2,
          textShadow: "0 4px 14px rgba(0,0,0,0.8)",
          opacity: headline2Alpha,
        }}
      >
        Pick up workers + spend materials → <span style={{ color: "#ffd766" }}>BUILD</span>
      </div>

      {/* Source material cards on the left. Workers are rendered as
          siblings (not children of the card div) so the chit coordinates
          are absolute and don't double-offset. */}
      {SOURCE_MATERIAL_CARDS.map((mc, i) => {
        const cardCx = matLeftX;
        const cardCy = matTopY + i * (matH + matGap);
        const appear = sourceAppear(i);
        const driftToStructure = materialFlow;
        const finalCx = interpolate(
          driftToStructure,
          [0, 1],
          [cardCx, structX - structW / 2 - 40]
        );
        const finalCy = interpolate(
          driftToStructure,
          [0, 1],
          [cardCy, structFinalY]
        );
        const cardOpacity = interpolate(
          driftToStructure,
          [0.7, 1.0],
          [appear, 0]
        );
        const cardScale = interpolate(driftToStructure, [0, 1], [1, 0.4]);
        return (
          <Img
            key={mc.card}
            src={staticFile(`material-deck/${mc.card}`)}
            style={{
              position: "absolute",
              left: finalCx - (matW * cardScale) / 2,
              top: finalCy - (matH * cardScale) / 2,
              width: matW * cardScale,
              height: matH * cardScale,
              opacity: cardOpacity,
              filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.65))",
            }}
          />
        );
      })}

      {/* Worker chits on top of material cards (rendered after the cards
          so they sit visibly on top; positioned in absolute frame coords). */}
      {SOURCE_MATERIAL_CARDS.map((mc, i) => {
        const cardCx = matLeftX;
        const cardCy = matTopY + i * (matH + matGap);
        const appear = sourceAppear(i);
        const driftToStructure = materialFlow;
        const finalCx = interpolate(
          driftToStructure,
          [0, 1],
          [cardCx, structX - structW / 2 - 40]
        );
        const finalCy = interpolate(
          driftToStructure,
          [0, 1],
          [cardCy, structFinalY]
        );
        const cardScale = interpolate(driftToStructure, [0, 1], [1, 0.4]);
        const liftOffset = -80 * Math.min(1, materialFlow * 1.5);
        const workerAlpha = interpolate(materialFlow, [0.6, 1.0], [1, 0]);
        return mc.workers.map((w, wi) => {
          const workerCount = mc.workers.length;
          // Worker positions: pinned to the bottom half of the card art,
          // matching where icon dots live on the material PNGs (roughly
          // y = card-center + 25% of card height).
          const colCount = workerCount === 4 ? 4 : 2;
          const spacing = (matW * cardScale * 0.78) / colCount;
          const startX = finalCx - (matW * cardScale * 0.78) / 2 + spacing / 2;
          const wx = startX + (wi % colCount) * spacing;
          const wy = finalCy + matH * cardScale * 0.22 + liftOffset;
          return (
            <Worker
              key={`${mc.card}-${wi}`}
              species={w.species}
              x={wx}
              y={wy}
              size={40 * cardScale}
              appear={appear * workerAlpha}
            />
          );
        });
      })}

      {/* Structure card */}
      <Img
        src={staticFile(`structure-deck/${STRUCTURE_CARD}`)}
        style={{
          position: "absolute",
          left: structX - structW / 2,
          top: structY - structH / 2,
          width: structW,
          height: structH,
          transform: `rotate(${structRotate}deg)`,
          opacity: structOpacity,
          filter: `drop-shadow(0 ${10 + vpPulse * 10}px ${
            24 + vpPulse * 16
          }px rgba(0,0,0,0.65))${
            vpPulse > 0.05
              ? ` drop-shadow(0 0 ${20 * vpPulse}px rgba(255,210,80,${
                  0.9 * vpPulse
                }))`
              : ""
          }`,
        }}
      />

      {/* "victory points" annotation pointing at the card's "6★" badge in
          the upper-right corner. Static once it fades in — no scale pulse,
          so it doesn't jump around. */}
      {vpPulse > 0.05 && (
        <div
          style={{
            position: "absolute",
            // 6★ on the Beaver Dam card sits at roughly the top-right corner.
            // Anchor the label just above and to the right of it.
            left: structX + structW / 2 - 40,
            top: structFinalY - structH / 2 - 70,
            fontFamily: "Iowan Old Style, Palatino, Georgia, serif",
            fontSize: 30,
            letterSpacing: 2,
            fontWeight: 700,
            color: "#ffd766",
            textShadow:
              "0 3px 10px rgba(0,0,0,0.85), 0 0 8px rgba(255,210,100,0.7)",
            opacity: Math.min(1, vpPulse / 0.6),
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          victory points ↘
        </div>
      )}

      {/* Final line under the structure */}
      <div
        style={{
          position: "absolute",
          left: structX - 360,
          right: 60,
          top: structFinalY + structH / 2 + 30,
          textAlign: "center",
          color: PAPER,
          fontFamily: "Iowan Old Style, Palatino, Georgia, serif",
          fontSize: 28,
          letterSpacing: 2,
          textShadow: "0 4px 12px rgba(0,0,0,0.8)",
          opacity: finalLineAlpha,
          width: 720,
        }}
      >
        scores points <span style={{ color: "#ffd766" }}>+ benefits all game</span>
      </div>
    </>
  );
};

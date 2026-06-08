import { Composition } from "remotion";
import { Scene1, SCENE1_DURATION_SECONDS } from "./scenes/Scene1";
import {
  FullVideo,
  FULL_VIDEO_DURATION_SECONDS,
} from "./scenes/full/FullVideo";

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

export const Root: React.FC = () => {
  return (
    <>
      {/* Full 2-minute promo, Kore audio (Vertex AI Gemini TTS) */}
      <Composition
        id="FullVideo"
        component={FullVideo}
        durationInFrames={Math.round(FULL_VIDEO_DURATION_SECONDS * FPS)}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* Legacy 27-second proof-of-concept auction scene */}
      <Composition
        id="Scene1"
        component={Scene1}
        durationInFrames={Math.round(SCENE1_DURATION_SECONDS * FPS)}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ voice: "andrew" as const }}
      />
      <Composition
        id="Scene1Ava"
        component={Scene1}
        durationInFrames={Math.round(SCENE1_DURATION_SECONDS * FPS)}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ voice: "ava" as const }}
      />
    </>
  );
};

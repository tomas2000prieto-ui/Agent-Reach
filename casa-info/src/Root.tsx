import { Composition } from "remotion";
import { Casa, FPS, DURACION } from "./Casa";

export const Root: React.FC = () => (
  <Composition id="casa" component={Casa} width={1080} height={1920} fps={FPS} durationInFrames={Math.ceil(DURACION * FPS)} />
);

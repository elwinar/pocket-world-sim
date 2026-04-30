import { pixiPipes } from "@assetpack/core/pixi";
export default {
	entry: "./assets",
	output: "./src/public",
	pipes: [...pixiPipes({})],
};

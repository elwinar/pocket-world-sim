import path from "node:path";
import type { UserConfig } from "vite";

export default {
	root: "./src",
	server: {
		port: 8766,
	},
	resolve: {
		alias: {
			"~": path.resolve(__dirname, "./src"),
		},
	},
} satisfies UserConfig;

import path from "node:path";
import type { UserConfig } from "vite";

export default {
	server: {
		port: 8766,
	},
	resolve: {
		alias: {
			"~": path.resolve(__dirname, "./"),
		},
	},
} satisfies UserConfig;

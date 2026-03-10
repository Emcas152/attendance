import { build as esbuild } from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(rootDir, "..");

await esbuild({
  entryPoints: [path.resolve(workspaceRoot, "server", "index.ts")],
  outfile: path.resolve(workspaceRoot, "dist-backend", "index.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  packages: "external",
  tsconfig: path.resolve(workspaceRoot, "tsconfig.json"),
  sourcemap: true,
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});
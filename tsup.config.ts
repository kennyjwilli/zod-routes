import { readFileSync, writeFileSync } from "node:fs";
import { defineConfig } from "tsup";

const CLIENT_FILES = ["dist/next.js", "dist/vanilla.js"];

export default defineConfig({
  entry: {
    index: "src/index.ts",
    next: "src/adapters/next.tsx",
    vanilla: "src/adapters/vanilla.tsx",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
  treeshake: true,
  external: ["react", "react-dom", "zod", "next"],
  // esbuild strips module-level "use client" during bundling. Re-prepend it post-build
  // so Next.js RSC tracking marks these files as client modules.
  async onSuccess() {
    for (const file of CLIENT_FILES) {
      const content = readFileSync(file, "utf8");
      if (!content.startsWith('"use client"')) {
        writeFileSync(file, `"use client";\n${content}`);
      }
    }
  },
});

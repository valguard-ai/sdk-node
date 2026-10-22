#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const tsc = spawnSync("npx", ["tsc", "-p", "tsconfig.readme.json"], {
  cwd: pkgDir,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
if (tsc.status !== 0) {
  console.error(tsc.stdout);
  console.error(tsc.stderr);
  process.exit(tsc.status ?? 1);
}

console.log("readme-fetch-strict.test.mjs: ok");

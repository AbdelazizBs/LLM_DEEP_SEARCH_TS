import { rm } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const targets = [
  "node_modules",
  "apps/server/node_modules",
  "apps/web/node_modules",
  "packages/shared/node_modules",
  "apps/server/dist",
  "apps/web/dist",
  "packages/shared/dist",
  "apps/server/pgdata",
  "apps/server/.pglite",
  ".turbo",
];

for (const target of targets) {
  await rm(join(root, target), { recursive: true, force: true });
}

console.log("Cleanup complete.");

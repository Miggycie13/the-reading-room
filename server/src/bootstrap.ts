import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { markShelvesReady } from "./ready.js";
import { seedReadingRoom } from "./data/seed.js";

const execFileAsync = promisify(execFile);
const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function openShelves(): Promise<void> {
  await execFileAsync("npx", ["prisma", "db", "push", "--skip-generate"], {
    cwd: serverRoot,
    shell: true,
    env: process.env,
  });
  await seedReadingRoom();
  markShelvesReady();
  console.log("Shelves are open.");
}

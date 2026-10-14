import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";

export async function removeNutritionFixtureDirectory(directory: string, prefix: string) {
  const target = resolve(directory), parent = resolve(tmpdir());
  if (dirname(target) !== parent || !basename(target).startsWith(prefix) || !prefix.startsWith("nutrition-")) {
    throw new Error("Refusing to remove a fixture path outside the intended temporary directory.");
  }
  await rm(target, { recursive: true, force: true });
}

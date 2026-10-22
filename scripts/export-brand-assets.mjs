// Run with the repository's installed Next/Sharp dependency: node scripts/export-brand-assets.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sharp = require("sharp");
for (const [source, width, target] of [
  ["app-icon.svg", 192, "public/icon-192.png"],
  ["app-icon.svg", 512, "public/icon-512.png"],
  ["app-icon.svg", 512, "src/app/icon.png"],
  ["app-icon-maskable.svg", 512, "public/icon-maskable-512.png"],
  ["mark.svg", 32, "public/brand/favicon-32.png"],
  ["mark.svg", 16, "public/brand/favicon-16.png"],
  ["social-card.svg", 1200, "public/dinh-duong-2598-og.png"],
]) await sharp(`public/brand/${source}`).resize({ width }).png().toFile(target);
console.log("Exported brand PNG assets from the committed SVG sources.");

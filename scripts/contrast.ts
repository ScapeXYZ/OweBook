import { pathToFileURL } from "node:url";
import { fills, ink, paper } from "../kit/theme.js";

function luminance(hex: string) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error("Expected six-digit hex color");
  const channels = [1, 3, 5].map(index => {
    const channel = parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
export function contrast(a: string, b: string) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function checkContrast() {
  for (const background of [paper, ...fills]) {
    const ratio = contrast(ink, background);
    console.log(ink + " on " + background + " " + ratio.toFixed(2) + ":1");
    if (ratio < 4.5) throw new Error("Text contrast below 4.5:1");
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) checkContrast();

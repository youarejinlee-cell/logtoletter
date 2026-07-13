const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const {
  assetDir,
  planetWidth,
  planetHeight,
  slots,
  readPng,
  clonePng,
  scaleFor,
  compositeScaled,
  copyInto
} = require("./render-work-placement");
const { categories, renderSlot } = require("./render-category-placements");

const root = path.resolve(__dirname, "..");
const decoDir = path.join(root, "assets/assets_v4/deco");
const outDir = path.join(root, "tmp/deco-category-full");
const landMoodOverlayPath = path.join(root, "tmp/deco-placement/marked-deco-land-overlay.png");
const etcMoodOverlayPath = path.join(root, "tmp/deco-placement/marked-deco-etc-overlay.png");

const globalDeco = [
  { file: "deco_mars.png", layer: "background", x: 145, y: 140, width: 115 },
  { file: "deco_saturn.png", layer: "background", x: 1000, y: 1370, width: 160 },
  { file: "deco_rocket.png", layer: "background", x: 235, y: 315, width: 500, rotation: 20 },
  { file: "deco_satellite.png", layer: "boundary", x: 870, y: 60, width: 364 },
  { file: "deco_astronaut_1.png", layer: "boundary", x: 1005, y: 335, width: 230 },
  { file: "deco_astronaut_2.png", layer: "boundary", x: 125, y: 1230, width: 230 },
  { file: "deco_airship.png", layer: "foreground", x: 335, y: 1335, width: 296 },
  { file: "deco_pirateship.png", layer: "foreground", x: 975, y: 1040, width: 350 },
  { file: "deco_seagull_1.png", layer: "foreground", x: 525, y: 790, width: 115 },
  { file: "deco_seagull_2.png", layer: "foreground", x: 610, y: 745, width: 125 }
];

function blendPixel(target, source, sourceOffset, targetX, targetY) {
  if (targetX < 0 || targetY < 0 || targetX >= target.width || targetY >= target.height) return;
  const alpha = source.data[sourceOffset + 3] / 255;
  if (!alpha) return;
  const targetOffset = (targetY * target.width + targetX) * 4;
  const inverse = 1 - alpha;
  target.data[targetOffset] = Math.round(source.data[sourceOffset] * alpha + target.data[targetOffset] * inverse);
  target.data[targetOffset + 1] = Math.round(source.data[sourceOffset + 1] * alpha + target.data[targetOffset + 1] * inverse);
  target.data[targetOffset + 2] = Math.round(source.data[sourceOffset + 2] * alpha + target.data[targetOffset + 2] * inverse);
  target.data[targetOffset + 3] = Math.round(255 * alpha + target.data[targetOffset + 3] * inverse);
}

function placeDeco(target, spec) {
  const source = readPng(path.join(decoDir, spec.file));
  const scale = spec.width / source.width;
  if (!spec.rotation) {
    compositeScaled(target, source, Math.round(spec.x - source.width * scale / 2), Math.round(spec.y - source.height * scale / 2), scale);
    return;
  }
  const radians = spec.rotation * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const scaledWidth = source.width * scale;
  const scaledHeight = source.height * scale;
  const radius = Math.ceil(Math.hypot(scaledWidth, scaledHeight) / 2);
  for (let y = Math.floor(spec.y - radius); y <= Math.ceil(spec.y + radius); y += 1) {
    for (let x = Math.floor(spec.x - radius); x <= Math.ceil(spec.x + radius); x += 1) {
      const dx = x - spec.x;
      const dy = y - spec.y;
      const sourceX = Math.floor((cosine * dx + sine * dy + scaledWidth / 2) / scale);
      const sourceY = Math.floor((-sine * dx + cosine * dy + scaledHeight / 2) / scale);
      if (sourceX < 0 || sourceY < 0 || sourceX >= source.width || sourceY >= source.height) continue;
      blendPixel(target, source, (sourceY * source.width + sourceX) * 4, x, y);
    }
  }
}

function baseWithGlobalDeco() {
  const output = new PNG({ width: planetWidth, height: planetHeight });
  globalDeco.filter((asset) => asset.layer === "background").forEach((asset) => placeDeco(output, asset));
  compositeScaled(output, readPng(path.join(assetDir, "bare_planet.png")), 0, 0, 1);
  globalDeco.filter((asset) => asset.layer === "boundary").forEach((asset) => placeDeco(output, asset));
  return output;
}

function finishLandDeco(output, landMoodOverlay, etcMoodOverlay) {
  globalDeco.filter((asset) => asset.layer === "foreground").forEach((asset) => placeDeco(output, asset));
  compositeScaled(output, landMoodOverlay, 0, 0, 1);
  compositeScaled(output, etcMoodOverlay, 0, 0, 1);
  return output;
}

const etcAssets = {
  1: { file: "etc_lv1.png", alphaBox: { width: 866, height: 1102 }, alphaCenter: { x: 614, y: 749 } },
  2: { file: "etc_lv2.png", alphaBox: { width: 1124, height: 666 }, alphaCenter: { x: 739, y: 541 } },
  3: { file: "etc_lv3.png", alphaBox: { width: 1346, height: 558 }, alphaCenter: { x: 767, y: 620 } },
  4: { file: "etc_lv4.png", alphaBox: { width: 1023, height: 731 }, alphaCenter: { x: 573, y: 659 } }
};
const etcSlot = {
  key: "etc_lake",
  box: { x: 352, y: 252, width: 632, height: 703 },
  centers: { 1: { x: 625, y: 640 }, 2: { x: 585, y: 730 }, 3: { x: 685, y: 815 }, 4: { x: 725, y: 880 } },
  ratios: { 1: .1083, 2: .0467856, 3: .03779136, 4: .0241864704 }
};

function renderEtc(base) {
  const output = clonePng(base);
  for (const level of [1, 2, 3, 4]) {
    const asset = etcAssets[level];
    const image = readPng(path.join(assetDir, asset.file));
    const scale = scaleFor(etcSlot, asset, image, level);
    const center = etcSlot.centers[level];
    compositeScaled(output, image, Math.round(center.x - asset.alphaCenter.x * scale), Math.round(center.y - asset.alphaCenter.y * scale), scale);
  }
  return output;
}

fs.mkdirSync(outDir, { recursive: true });
require("./render-marked-deco-full");
const landMoodOverlay = readPng(landMoodOverlayPath);
const etcMoodOverlay = readPng(etcMoodOverlayPath);
const base = baseWithGlobalDeco();

for (const slot of slots) {
  const montage = new PNG({ width: planetWidth * 3, height: planetHeight * 2 });
  categories.forEach((category, index) => {
    const result = finishLandDeco(renderSlot(base, category, slot), landMoodOverlay, etcMoodOverlay);
    copyInto(montage, result, (index % 3) * planetWidth, Math.floor(index / 3) * planetHeight);
  });
  const outputPath = path.join(outDir, `${slot.key}-six-categories-full-deco.png`);
  fs.writeFileSync(outputPath, PNG.sync.write(montage));
  console.log(outputPath);
}

const etcBase = clonePng(base);
globalDeco.filter((asset) => asset.layer === "foreground").forEach((asset) => placeDeco(etcBase, asset));
compositeScaled(etcBase, landMoodOverlay, 0, 0, 1);
const etcOutput = renderEtc(etcBase);
compositeScaled(etcOutput, etcMoodOverlay, 0, 0, 1);
const etcPath = path.join(outDir, "etc-lake-full-deco.png");
fs.writeFileSync(etcPath, PNG.sync.write(etcOutput));
console.log(etcPath);

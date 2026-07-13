const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const { readPng, clonePng, compositeScaled } = require("./render-work-placement");

const root = path.resolve(__dirname, "..");
const assetDir = path.join(root, "assets/assets_v4");
const outputPath = path.join(root, "tmp/deco-placement/marked-deco-full.png");
const overlayPath = path.join(root, "tmp/deco-placement/marked-deco-overlay.png");
const landOverlayPath = path.join(root, "tmp/deco-placement/marked-deco-land-overlay.png");
const etcOverlayPath = path.join(root, "tmp/deco-placement/marked-deco-etc-overlay.png");
const bare = readPng(path.join(assetDir, "continent/bare_planet.png"));
const output = new PNG({ width: bare.width, height: bare.height });
const landOutput = new PNG({ width: bare.width, height: bare.height });
const etcOutput = new PNG({ width: bare.width, height: bare.height });
const decoScale = 0.81225;
const streetlightScale = 0.7695;
const land6NeutralCenters = new Set(["853,649", "874,693", "920,726"]);
const moodPositions = {
  land_01: { neutral: [[555,961],[538,1040],[522,1118]], negative: [[431,835],[66,865],[480,1084]], positive: [[389,735],[120,949],[177,1022]] },
  land_02: { neutral: [[453,469],[411,529],[370,603]], negative: [[172,384],[106,454],[410,580]], positive: [[352,323],[407,421],[124,626]] },
  land_03: { neutral: [[649,455],[647,529],[713,570]], negative: [[945,430],[620,510],[848,572]], positive: [[890,351],[705,477],[871,522]] },
  land_04: { neutral: [[426,247],[460,290],[506,331]], negative: [[512,192],[779,235],[455,301]], positive: [[682,182],[571,269],[691,351]] },
  land_05: { neutral: [[710,976],[675,1026],[702,1090]], negative: [[966,868],[642,1069],[846,1085]], positive: [[1002,891],[714,1128],[937,1000]] },
  land_06: { neutral: [[853,649],[874,693],[920,726]], negative: [[799,672],[1035,710],[905,750]], positive: [[1000,608],[1028,637],[867,740]] },
  etc_lake: { neutral: [[474,529],[504,791],[620,889]], negative: [[546,691],[495,738],[825,814]], positive: [[745,706],[780,733],[579,825]] }
};

const treeAssets = [
  ["deco_tree_1.png",145], ["deco_tree_2.png",135], ["deco_tree_3.png",130],
  ["deco_tree_4.png",125], ["deco_tree_5.png",125]
];
const starAssets = [["positive_diamond_star_1.png",105], ["positive_diamond_star_2.png",115]];
const cloudAssets = [["negative_cloud_1.png",185], ["negative_cloud_2.png",180], ["negative_cloud3.png",190]];

function alphaCenter(image) {
  let minX = image.width, minY = image.height, maxX = -1, maxY = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (image.data[(y * image.width + x) * 4 + 3] <= 8) continue;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

function place(target, file, targetWidth, center) {
  const image = readPng(path.join(assetDir, "deco", file));
  let assetScale = file === "deco_streetlight.png"
    ? streetlightScale
    : decoScale * (file === "negative_cloud3.png" ? 0.8 : 1);
  if (file.startsWith("deco_tree_") && land6NeutralCenters.has(center.join(","))) assetScale *= 0.9;
  const scale = (targetWidth * assetScale) / image.width;
  const visibleCenter = alphaCenter(image);
  compositeScaled(
    target,
    image,
    Math.round(center[0] - visibleCenter.x * scale),
    Math.round(center[1] - 25 - visibleCenter.y * scale),
    scale
  );
}

function placeMood(file, targetWidth, center, isEtc) {
  place(output, file, targetWidth, center);
  place(isEtc ? etcOutput : landOutput, file, targetWidth, center);
}

Object.entries(moodPositions).forEach(([slot, groups]) => {
  const isEtc = slot === "etc_lake";
  groups.neutral.forEach((center, index) => {
    if (isEtc) placeMood("deco_streetlight.png", 150, center, true);
    else placeMood(...treeAssets[index % treeAssets.length], center, false);
  });
  groups.negative.forEach((center, index) => placeMood(...cloudAssets[index % cloudAssets.length], center, isEtc));
  groups.positive.forEach((center, index) => placeMood(...starAssets[index % starAssets.length], center, isEtc));
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(overlayPath, PNG.sync.write(output));
fs.writeFileSync(landOverlayPath, PNG.sync.write(landOutput));
fs.writeFileSync(etcOverlayPath, PNG.sync.write(etcOutput));
const full = clonePng(bare);
compositeScaled(full, output, 0, 0, 1);
fs.writeFileSync(outputPath, PNG.sync.write(full));
console.log(outputPath);

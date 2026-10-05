// Build-time encoding only: source artwork and placement geometry stay untouched.
// Generated copies live in the disposable .expo cache, never in the artwork folders.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const cache = path.join(root, '.expo', 'optimized-assets-v1');
const characterRoot = path.resolve(root, '../../../character');
const jpegSources = new Set([
  path.join(root, 'assets/assets_v4/launch/log_planet_launch.png'),
  path.join(root, 'assets/assets_v4/continent/background.png'),
]);
sharp.concurrency(1);
const digest = data => crypto.createHash('md5').update(data).digest('hex');
const jobs = new Map();
let running = 0;
const queue = [];
async function limited(work) {
  if (running >= 2) await new Promise(resolve => queue.push(resolve));
  running++;
  try { return await work(); }
  finally { running--; queue.shift()?.(); }
}
function owned(file) {
  return file.startsWith(path.join(root, 'assets') + path.sep) || file.startsWith(characterRoot + path.sep);
}
async function optimize(file) {
  const input = await fs.readFile(file);
  const kind = jpegSources.has(file) ? 'jpg' : 'png';
  const key = digest(Buffer.concat([input, Buffer.from(`v1:${kind}:q96:png9:${sharp.versions.sharp}`)]));
  const directory = path.join(cache, key);
  const destination = path.join(directory, path.basename(file, '.png') + '.' + kind);
  try { const existing = await fs.readFile(destination); return {file:destination, type:kind, hash:digest(existing)}; }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  const unchanged = path.join(directory, 'original.json');
  try {
    if (JSON.parse(await fs.readFile(unchanged, 'utf8')).hash === digest(input)) return {file,type:'png',hash:digest(input)};
  } catch (e) { if (e.code !== 'ENOENT' && !(e instanceof SyntaxError)) throw e; }
  const useOriginal = async () => {
    await fs.mkdir(directory,{recursive:true});
    await fs.writeFile(unchanged,JSON.stringify({hash:digest(input)}));
    return {file,type:'png',hash:digest(input)};
  };
  const metadata = await sharp(input).metadata();
  // Do not silently quantize 16-bit artwork or flatten animation.
  if (metadata.depth !== 'uchar' || (metadata.pages || 1) !== 1) return useOriginal();
  let encoder = sharp(input).keepMetadata();
  if (kind === 'jpg') {
    if (!(await sharp(input).stats()).isOpaque) throw Error(`Refusing to remove transparency: ${file}`);
    encoder = encoder.jpeg({quality:96,mozjpeg:true,chromaSubsampling:'4:4:4'});
  } else encoder = encoder.png({compressionLevel:9,adaptiveFiltering:true,palette:false});
  const output = await encoder.toBuffer();
  if (output.length >= input.length) return useOriginal();
  if (kind === 'png') {
    const before = await sharp(input).ensureAlpha().raw().toBuffer();
    const after = await sharp(output).ensureAlpha().raw().toBuffer();
    if (!before.equals(after)) throw Error(`Lossless pixel verification failed: ${file}`);
  }
  await fs.mkdir(directory,{recursive:true});
  const temp = destination + '.' + crypto.randomUUID() + '.tmp';
  await fs.writeFile(temp,output);
  await fs.rename(temp,destination);
  return {file:destination,type:kind,hash:digest(output)};
}
module.exports = async asset => {
  if (asset.type !== 'png' || !asset.files.every(owned)) return asset;
  const converted = await Promise.all(asset.files.map(file => {
    // Cache work within each Metro worker; files are content-addressed across workers.
    const key = file + ':' + asset.hash;
    if (!jobs.has(key)) jobs.set(key,limited(()=>optimize(file)));
    return jobs.get(key);
  }));
  if (new Set(converted.map(x=>x.type)).size !== 1) return asset;
  const fileHashes=converted.map(x=>x.hash);
  return {...asset,files:converted.map(x=>x.file),type:converted[0].type,
    fileSystemLocation:path.dirname(converted[0].file),fileHashes,
    hash:fileHashes.length===1?fileHashes[0]:digest(fileHashes.join(''))};
};

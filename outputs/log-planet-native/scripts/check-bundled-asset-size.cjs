const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),sharp=require('sharp');
const [beforeDir,afterDir]=process.argv.slice(2);
if(!beforeDir||!afterDir)throw Error('Usage: node scripts/check-bundled-asset-size.cjs BEFORE_EXPORT AFTER_EXPORT');
const read=(dir,file)=>JSON.parse(fs.readFileSync(path.join(dir,file)));
const key=a=>a.httpServerLocation+':'+a.name;
(async()=>{
 const before=Object.values(read(beforeDir,'assetmap.json')),after=Object.values(read(afterDir,'assetmap.json'));
 const originals=new Map(before.map(a=>[key(a),a])); let checked=0,lossless=0;const jpeg=[];
 for(const a of after){const b=originals.get(key(a));if(!b)continue;
  assert.equal(a.width,b.width,`${a.name} width`);assert.equal(a.height,b.height,`${a.name} height`);assert.deepEqual(a.scales,b.scales);checked++;
  for(let i=0;i<a.files.length;i++){
   if(a.files[i]===b.files[i])continue;
   const src=await sharp(b.files[i]).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   const dst=await sharp(a.files[i]).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   assert.deepEqual(dst.info,src.info);
   if(a.type==='png'){assert.ok(src.data.equals(dst.data),`${a.name}: pixels changed`);lossless++;}
   else {assert.equal(a.type,'jpg');assert.ok((await sharp(b.files[i]).stats()).isOpaque);let error=0;for(let j=0;j<src.data.length;j++)error+=(src.data[j]-dst.data[j])**2;
    const psnr=10*Math.log10(255**2/(error/src.data.length));assert.ok(psnr>40,`${a.name} JPEG PSNR too low: ${psnr}`);jpeg.push({name:a.name,psnrDb:Number(psnr.toFixed(2))});}
  }
 }
 function size(dir,platform){const m=read(dir,'metadata.json').fileMetadata[platform];if(!m)return null;const paths=[...new Set(m.assets.map(x=>x.path))];return {assets:paths.length,assetBytes:paths.reduce((n,p)=>n+fs.statSync(path.join(dir,p)).size,0),bundleBytes:fs.statSync(path.join(dir,m.bundle)).size};}
 const baseline=size(beforeDir,'ios'),optimized=size(afterDir,'ios');assert.ok(optimized.assetBytes<baseline.assetBytes);
 console.log(JSON.stringify({ios:{baseline,optimized,savedBytes:baseline.assetBytes-optimized.assetBytes,savedPercent:100*(1-optimized.assetBytes/baseline.assetBytes)},android:size(afterDir,'android'),geometryChecks:checked,losslessPixelChecks:lossless,jpeg},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});

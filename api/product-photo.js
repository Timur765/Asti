// Only fixed supplier catalogue images, never arbitrary user-provided URLs.
const photos = Object.freeze({
  'baker-1': ['https://down-tw.img.susercontent.com/file/sg-11134202-7rdx9-md8cdh1je8gk07'],
  'polo-1': ['https://www.maden365.com/cdn/shop/files/10a22c9b969b40acbfc2745bd4f9d6bb_tplv-o3syd03w52-origin-jpeg.jpg?v=1765851372'],
  'denim-1': ['https://www.maden365.com/cdn/shop/files/1_8cab5b09-d9c3-4b14-9c12-a96d744b3856_1000x.webp?v=1785688044'],
  'denim-2': ['https://www.maden365.com/cdn/shop/files/2_198839af-47c3-4130-bddd-b8fb7c6cecff_1000x.webp?v=1785688044'],
  'denim-3': ['https://www.maden365.com/cdn/shop/files/3_e55fce84-0327-4c3f-8243-85d9ed15ad79_1000x.webp?v=1785688044']
});
module.exports = async (req,res) => {
  if (!['GET','HEAD'].includes(req.method)) return res.status(405).end();
  const id = req.query.id;
  if(typeof id!=='string'||!Object.hasOwn(photos,id)) return res.status(404).end();
  for(const url of photos[id]) {
    try {
      const r = await fetch(url,{redirect:'error',signal:AbortSignal.timeout(6000),headers:{Accept:'image/jpeg,image/png,image/webp'}});
      const type = (r.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
      if(!r.ok || !['image/jpeg','image/png','image/webp'].includes(type) || Number(r.headers.get('content-length')||0)>3000000) continue;
      const reader = r.body.getReader();
      let total=0; const chunks=[];
      for(;;){const {done,value}=await reader.read(); if(done) break; total+=value.byteLength; if(total>3000000){await reader.cancel();throw Error('too large')}chunks.push(Buffer.from(value));}
      if(total<32) continue;
      const bytes=Buffer.concat(chunks);
      const valid=type==='image/jpeg'?bytes[0]===255&&bytes[1]===216:type==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
      if(!valid) continue;
      res.setHeader('Content-Type',type);
      res.setHeader('Content-Length',bytes.length);
      res.setHeader('Cache-Control','public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
      res.setHeader('X-Content-Type-Options','nosniff');
      return res.status(200).end(req.method==='HEAD'?undefined:bytes);
    } catch {}
  }
  res.setHeader('Cache-Control','no-store');
  return res.status(502).json({error:'supplier_image_unavailable'});
};

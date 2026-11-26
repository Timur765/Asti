// Only fixed supplier catalogue images, never arbitrary user-provided URLs.
const photos = Object.freeze({
  "catalog-2c3d68f8-fcd0-4bc0-9a7d-9cb117c06a45-1": ["https://cbu01.alicdn.com/img/ibank/O1CN01ollZzo1V2YiWYCA32_!!2215009382595-0-cib.jpg"],
  "catalog-2c3d68f8-fcd0-4bc0-9a7d-9cb117c06a45-2": ["https://cbu01.alicdn.com/img/ibank/O1CN013yLT4h1V2YiUl17tQ_!!2215009382595-0-cib.jpg"],
  "catalog-2c3d68f8-fcd0-4bc0-9a7d-9cb117c06a45-3": ["https://cbu01.alicdn.com/img/ibank/O1CN01ixifIP1V2YiX2DOiq_!!2215009382595-0-cib.jpg"],
  "catalog-4a6e04bf-8a3c-4494-a572-76c84cdfce83-1": ["https://cbu01.alicdn.com/img/ibank/O1CN01Z87Ghc28du6sF68IP_!!2208740707956-0-cib.jpg"],
  "catalog-4a6e04bf-8a3c-4494-a572-76c84cdfce83-2": ["https://cbu01.alicdn.com/img/ibank/O1CN01xgpR0w2C4sFbvmK8j_!!2207691068421-0-cib.jpg"],
  "catalog-4a6e04bf-8a3c-4494-a572-76c84cdfce83-3": ["https://cbu01.alicdn.com/img/ibank/O1CN01XItz8n2C4sFcVG7NW_!!2207691068421-0-cib.jpg"],
  "catalog-4ff9b978-18af-4b88-81ca-dcf46c02fed2-1": ["https://cbu01.alicdn.com/img/ibank/O1CN01zx37Bd1yLS025GjpL_!!2218809506562-0-cib.jpg"],
  "catalog-4ff9b978-18af-4b88-81ca-dcf46c02fed2-2": ["https://cbu01.alicdn.com/img/ibank/O1CN01IWVT5t1yLS025R0a2_!!2218809506562-0-cib.jpg"],
  "catalog-4ff9b978-18af-4b88-81ca-dcf46c02fed2-3": ["https://cbu01.alicdn.com/img/ibank/O1CN01SuHk0e1yLS025Prvv_!!2218809506562-0-cib.jpg"],
  "catalog-5a1283af-8521-49c3-93a8-e8c6cd183b61-1": ["https://cbu01.alicdn.com/img/ibank/O1CN01mTuUin1dwRsJiSUNn_!!2204110063800-0-cib.jpg"],
  "catalog-5a1283af-8521-49c3-93a8-e8c6cd183b61-2": ["https://cbu01.alicdn.com/img/ibank/O1CN01wcmy481dwRvPXo3AV_!!2204110063800-0-cib.jpg"],
  "catalog-5a1283af-8521-49c3-93a8-e8c6cd183b61-3": ["https://cbu01.alicdn.com/img/ibank/O1CN01dLbB771dwRvMLmhbD_!!2204110063800-0-cib.jpg"],
  "catalog-78407de4-edc4-4ae8-864a-37844f8ed5d9-1": ["https://cbu01.alicdn.com/img/ibank/O1CN01hJs4Ik1WXXHr4jNeM_!!2220023532798-0-cib.jpg"],
  "catalog-78407de4-edc4-4ae8-864a-37844f8ed5d9-2": ["https://cbu01.alicdn.com/img/ibank/O1CN01FuXD3p1WXXHqic0ht_!!2220023532798-0-cib.jpg"],
  "catalog-78407de4-edc4-4ae8-864a-37844f8ed5d9-3": ["https://cbu01.alicdn.com/img/ibank/O1CN01HzPwvR1WXXHrGhURz_!!2220023532798-0-cib.jpg"],
  "catalog-8555c157-1a16-4e59-8d10-59a811fcba4b-1": ["https://cbu01.alicdn.com/img/ibank/O1CN01buA0gz1URvCQxNVgR_!!2219552862515-0-cib.jpg"],
  "catalog-8555c157-1a16-4e59-8d10-59a811fcba4b-2": ["https://cbu01.alicdn.com/img/ibank/O1CN01oJCuff1URvCVj1Hkc_!!2219552862515-0-cib.jpg"],
  "catalog-8555c157-1a16-4e59-8d10-59a811fcba4b-3": ["https://cbu01.alicdn.com/img/ibank/O1CN01snrj2P1URvCX1W9rq_!!2219552862515-0-cib.jpg"],
  "catalog-905f8f19-5271-4b85-ba7f-47549620c784-1": ["https://cbu01.alicdn.com/img/ibank/O1CN01XeggUI1tohDqtST3v_!!2219016445949-0-cib.jpg"],
  "catalog-905f8f19-5271-4b85-ba7f-47549620c784-2": ["https://cbu01.alicdn.com/img/ibank/O1CN018FnD3k1tohDx5Roc1_!!2219016445949-0-cib.jpg"],
  "catalog-905f8f19-5271-4b85-ba7f-47549620c784-3": ["https://cbu01.alicdn.com/img/ibank/O1CN018iXQvE1tohDxRPB1g_!!2219016445949-0-cib.jpg"],
  "catalog-946257c1-ca55-4fd7-b62e-a1949aae52d5-1": ["https://cbu01.alicdn.com/img/ibank/O1CN01bGgdg0MBogH1pITk_!!2219480244103-0-cib.jpg"],
  "catalog-946257c1-ca55-4fd7-b62e-a1949aae52d5-2": ["https://cbu01.alicdn.com/img/ibank/O1CN01XtoJ1Jw5zkH1pITk_!!2219480244103-0-cib.jpg"],
  "catalog-946257c1-ca55-4fd7-b62e-a1949aae52d5-3": ["https://cbu01.alicdn.com/img/ibank/O1CN01GHHBCxreONL1pITk_!!2219480244103-0-cib.jpg"],
  "catalog-9927fd57-100c-4653-913f-8c6baf136d49-1": ["https://cbu01.alicdn.com/img/ibank/O1CN01CaCveA1gBE9nE9NEw_!!2219480244103-0-cib.jpg"],
  "catalog-9927fd57-100c-4653-913f-8c6baf136d49-2": ["https://cbu01.alicdn.com/img/ibank/O1CN01MGwZI01gBE9nvuh7M_!!2219480244103-0-cib.jpg"],
  "catalog-9927fd57-100c-4653-913f-8c6baf136d49-3": ["https://cbu01.alicdn.com/img/ibank/O1CN01ZBRlPc1gBE9nE9NF9_!!2219480244103-0-cib.jpg"],
  "catalog-adc1c43c-1d65-41d5-a2a7-f89b54104594-1": ["https://cbu01.alicdn.com/img/ibank/O1CN0142LOVA1gBE9lpo1Hi_!!2219480244103-0-cib.jpg"],
  "catalog-adc1c43c-1d65-41d5-a2a7-f89b54104594-2": ["https://cbu01.alicdn.com/img/ibank/O1CN01HpCVNI1gBE9lOj20B_!!2219480244103-0-cib.jpg"],
  "catalog-adc1c43c-1d65-41d5-a2a7-f89b54104594-3": ["https://cbu01.alicdn.com/img/ibank/O1CN01mZR97I1gBE9n5UUfZ_!!2219480244103-0-cib.jpg"],
  "catalog-db6463c0-e641-4c9c-86da-5c1b0bc620e8-1": ["https://cbu01.alicdn.com/img/ibank/O1CN01BwpL2R1t0m6yGNhUC_!!2220637565840-0-cib.jpg"],
  "catalog-db6463c0-e641-4c9c-86da-5c1b0bc620e8-2": ["https://cbu01.alicdn.com/img/ibank/O1CN01ZePBmv1t0m6z3SiKa_!!2220637565840-0-cib.jpg"],
  "catalog-db6463c0-e641-4c9c-86da-5c1b0bc620e8-3": ["https://cbu01.alicdn.com/img/ibank/O1CN01WYIHvw1t0m6zG5REX_!!2220637565840-0-cib.jpg"],
  "catalog-eb990a7f-0428-4f45-89db-7bf519ab6307-1": ["https://cbu01.alicdn.com/img/ibank/O1CN01BwML851gBE9bQZ5SR_!!2219480244103-0-cib.jpg"],
  "catalog-eb990a7f-0428-4f45-89db-7bf519ab6307-2": ["https://cbu01.alicdn.com/img/ibank/O1CN01BRIgEk1gBE9hPZqZh_!!2219480244103-0-cib.jpg"],
  "catalog-eb990a7f-0428-4f45-89db-7bf519ab6307-3": ["https://cbu01.alicdn.com/img/ibank/O1CN015DjqeB1gBE9g9sODQ_!!2219480244103-0-cib.jpg"],
  "catalog-f043af4c-9381-4385-a567-db4e32449ad1-1": ["https://cbu01.alicdn.com/img/ibank/O1CN01QOe8pj1fiNEAkAZPO_!!2220267294040-0-cib.jpg"],
  "catalog-f043af4c-9381-4385-a567-db4e32449ad1-2": ["https://cbu01.alicdn.com/img/ibank/O1CN01JFiC8R1fiNEAxyk80_!!2220267294040-0-cib.jpg"],
  "catalog-f043af4c-9381-4385-a567-db4e32449ad1-3": ["https://cbu01.alicdn.com/img/ibank/O1CN01o5TJLn1fiNEBe0oDd_!!2220267294040-0-cib.jpg"],
  "catalog-f8b5bbc6-50d9-4947-936d-186aefd56d80-1": ["https://cbu01.alicdn.com/img/ibank/O1CN01aqcpYu1gBE9Sp8x9S_!!2219480244103-0-cib.jpg"],
  "catalog-f8b5bbc6-50d9-4947-936d-186aefd56d80-2": ["https://cbu01.alicdn.com/img/ibank/O1CN01qtdvSl1gBE9Xc3bnn_!!2219480244103-0-cib.jpg"],
  "catalog-f8b5bbc6-50d9-4947-936d-186aefd56d80-3": ["https://cbu01.alicdn.com/img/ibank/O1CN01D6ZeIO1gBE9YoiMza_!!2219480244103-0-cib.jpg"],
  "catalog-fac2e16e-7274-4b1e-923a-ce519ce7ac13-1": ["https://cbu01.alicdn.com/img/ibank/O1CN01ZFRViN22dY5PoORxv_!!2217589147143-0-cib.jpg"],
  "catalog-fac2e16e-7274-4b1e-923a-ce519ce7ac13-2": ["https://cbu01.alicdn.com/img/ibank/O1CN014QkGSj22dY5NfCyqs_!!2217589147143-0-cib.jpg"],
  "catalog-fac2e16e-7274-4b1e-923a-ce519ce7ac13-3": ["https://cbu01.alicdn.com/img/ibank/O1CN018ar9hL22dY5NfC2dE_!!2217589147143-0-cib.jpg"],

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

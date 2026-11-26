// Temporary preview-only diagnostic of supplied public product URLs.
const urls=["https://mobile.yangkeduo.com/goods.html?ps=9lzvm4yiNZ","https://mobile.yangkeduo.com/goods1.html?ps=4m3798TPnQ","https://mobile.yangkeduo.com/goods.html?ps=aL6que9lyS","https://mobile.yangkeduo.com/goods1.html?ps=NkXxI9srum","https://mobile.yangkeduo.com/goods2.html?ps=h5LMtcc5NV","https://mobile.yangkeduo.com/goods2.html?ps=rbjwV3XWt2","https://mobile.yangkeduo.com/goods.html?ps=aFqokfbBd5","https://mobile.yangkeduo.com/goods1.html?ps=LAgbeKwpeF","https://mobile.yangkeduo.com/goods.html?ps=XT4ZlJlJeN","https://mobile.yangkeduo.com/goods2.html?ps=nimtRD8CuX","https://mobile.yangkeduo.com/goods.html?ps=bjdiTLypLp","https://mobile.yangkeduo.com/goods1.html?ps=QEq7QxeO9H","https://mobile.yangkeduo.com/goods1.html?ps=x0PGPRgzjN","https://mobile.yangkeduo.com/goods1.html?ps=mLTk6bZdaQ","https://mobile.yangkeduo.com/goods2.html?ps=nQyEi3MtMe"];
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 const i=Number(req.query.i);
 if(req.method!=='GET'||!Number.isInteger(i)||i<1||i>urls.length)return res.status(400).json({error:'bad_index'});
 try{
 const r=await fetch(urls[i-1],{redirect:'manual',signal:AbortSignal.timeout(8000),headers:{Accept:'text/html,application/xhtml+xml'}});
 const loc=r.headers.get('location');
 if(!r.ok)return res.status(200).json({index:i,sourceStatus:r.status,redirect:loc?new URL(loc,urls[i-1]).pathname:null});
 const reader=r.body.getReader();const chunks=[];let n=0;
 for(;;){const {done,value}=await reader.read();if(done)break;n+=value.length;if(n>2500000){await reader.cancel();return res.status(200).json({index:i,error:'too_large'});}chunks.push(Buffer.from(value));}
 const html=Buffer.concat(chunks).toString('utf8');
 const title=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.slice(0,300);
 const metadata=[...html.matchAll(/<meta\b[^>]*(?:og:|description|twitter:)[^>]*>/gi)].map(m=>m[0].slice(0,800)).slice(0,20);
 const snippets=[];for(const m of html.matchAll(/"(?:goodsName|goods_name|goodsId|goods_id|groupPrice|minGroupPrice|skuName|sku_name|skuList|sku_list|goodsDesc|goods_desc|gallery|goodsGallery|hdThumbUrl|thumbUrl|specs|price|priceInfo)"\s*:/g)){if(snippets.length>=35)break;snippets.push(html.slice(m.index,m.index+600));}
 return res.status(200).json({index:i,sourceStatus:r.status,bytes:n,title,metadata,snippets,loginOrChallenge:/验证码|安全验证|请登录|访问受限|captcha/i.test(html)});
 }catch(e){return res.status(200).json({index:i,error:e.name});}
};
// 离线缓存：有网时先取最新版（更新马上生效），没网时用缓存，离线也能打开
const CACHE='words-v2';
const FILES=['./','./index.html','./manifest.json','./icon-180.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin)return; // AI 接口等外部请求不缓存
  const page=e.request.mode==='navigate'||/\/(index\.html)?$/.test(u.pathname);
  e.respondWith(caches.open(CACHE).then(async c=>{
    const hit=await c.match(e.request,{ignoreSearch:true});
    if(page){ // 网页本身：先上网拿最新版（最多等 4 秒），拿不到再用缓存
      const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),4000);
      try{const r=await fetch(e.request,{cache:'no-store',signal:ctl.signal});clearTimeout(t);if(r&&r.ok){c.put(e.request,r.clone());return r}return hit||r}
      catch(err){clearTimeout(t);return hit||Response.error()}
    }
    const net=fetch(e.request).then(r=>{if(r&&r.ok)c.put(e.request,r.clone());return r}).catch(()=>hit);
    return hit||net;
  }));
});

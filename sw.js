const CACHE='nutritrace-v21-runtime-audited';
const CORE=[
  './','./index.html','./app.js','./style.css','./manifest.webmanifest','./icon-192.png','./icon-512.png',
  './data/master/manifest.json','./data/master/index.json'
];
const VENDOR=[
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js',
  'https://cdn.sheetjs.com/xlsx-0.18.5/package/dist/xlsx.full.min.js'
];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(CORE);
    await Promise.allSettled(VENDOR.map(async url=>{try{const response=await fetch(url,{mode:'no-cors'});await cache.put(url,response);}catch{}}));
  })());
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return; // API POSTs always go to Vercel functions.
  event.respondWith((async()=>{
    const url=new URL(event.request.url);
    const cached=await caches.match(event.request);
    if(cached) return cached;
    try{
      const response=await fetch(event.request);
      if(response.ok){
        const isSameOrigin=url.origin===self.location.origin;
        const isMasterChunk=isSameOrigin && url.pathname.includes('/data/master/chunks/');
        if(isSameOrigin||isMasterChunk){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});}
      }
      return response;
    }catch{
      if(url.origin===self.location.origin) return (await caches.match('./index.html'))||Response.error();
      return Response.error();
    }
  })());
});

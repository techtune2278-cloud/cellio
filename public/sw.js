// Remove Cellio legacy private caches (the previous app used a frosti-cache prefix).
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('cellio-')||key.startsWith('frosti-'))await caches.delete(key);await self.clients.claim()})()));
// Private pages and API responses are never cached.

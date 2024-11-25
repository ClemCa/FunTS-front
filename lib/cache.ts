import { Invalidate } from "./queue";
import { store } from "./internal";

const cache = store.new("cache", new Map<string, [number, object | null]>());

export function CacheRequest(request, response) {
    Invalidate(request.id); // just in case this was queued;
    const staleBy = Date.now() + request.stale;
    cache.update((map) => map.set(request.url + request.path + JSON.stringify(request.args), [staleBy, response]));
}

export function HasCachedRequest(url: string, path: string, args: any) { //! side effect is cache invalidation
    const current_cache = cache.get();
    if(!current_cache.has(url + path + JSON.stringify(args))) return false;
    const [staleBy, _] = current_cache.get(url + path + JSON.stringify(args));
    if(staleBy < Date.now()) {
        cache.update((map) => {
            map.delete(url + path + JSON.stringify(args));
            return map;
        });
        return false;
    }
    return true;
}

export function GetCachedRequest(url: string, path: string, args: any) {
    const current_cache = cache.get();
    const [_, response] = current_cache.get(url + path + JSON.stringify(args));
    return response;
}
import { Invalidate } from "./queue";
import { store } from "./internal";
import { RequestBase } from "./types";

const cache = store.new("cache", new Map<string, [number, object | null]>());

export function CacheRequest(request: RequestBase, response) {
    Invalidate(request.id); // just in case this was queued;
    const staleBy = Date.now() + request.stale;
    if(request.singleBatched) {
        for(let i = 0; i < (request.args as any[]).length; i++) {
            const [code, res] = StripStatusCode(response[i]);
            // TODO : handle status codes
            cache.update((map) => map.set(request.url + request.path + JSON.stringify(request.args[i]), [staleBy, res]));
        }
        return;
    } else if (request.multiBatched) {
        for(let i = 0; i < (request.args as any[]).length; i++) {
            const [code, res] = StripStatusCode(response[i]);
            // TODO : handle status codes
            cache.update((map) => map.set(request.url + request.args[i][0] + JSON.stringify(request.args[i][1]), [staleBy, response[i]]));
        }
        return;
    }
    cache.update((map) => map.set(request.url + request.path + JSON.stringify(request.args), [staleBy, response]));
}

function StripStatusCode(response) {
    if(!Array.isArray(response)) return [200, response];
    if(response.length != 2) return [200, response];
    if(typeof response[0] !== "number") return [200, response];
    return response;
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
    const [_, response] = current_cache.get(url + path + JSON.stringify(args)) ?? [0, null];
    return response;
}
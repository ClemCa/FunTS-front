import { Invalidate } from "./queue";
import { apps, CompareValues, store } from "./internal";
import { AppData, RequestBase } from "./types";

const cache = store.new("cache", new Map<string, [number, object | null]>());

export function CacheRequest(request: RequestBase, response) {
    Invalidate(request.id); // just in case this was queued;
    const staleBy = Date.now() + request.stale;
    if(request.singleBatched) {
        for(let i = 0; i < (request.args as any[]).length; i++) {
            const [code, res] = StripStatusCode(response[i]);
            if(code !== 200) continue; // TODO deal with status codes, retries, etc
            CacheRequest({ ...request, singleBatched: false, args: request.args[i] }, res);
        }
        return;
    } else if (request.multiBatched) {
        // we assume it's dealt with upstream
        return;
    }
    // don't want to re-cache the same response
    if(cache.is((cache) => cache.has(request.url + request.path + JSON.stringify(request.args)) && CompareValues(cache.get(request.url + request.path + JSON.stringify(request.args))[1], response)))
        return;
    apps.get()[request.app].log("Caching", request.url + request.path + JSON.stringify(request.args));
    cache.update((map) => map.set(request.url + request.path + JSON.stringify(request.args), [staleBy, response]));
}

function StripStatusCode(response) {
    if(!Array.isArray(response)) return [200, response];
    if(response.length != 2) return [200, response];
    if(typeof response[0] !== "number") return [200, response];
    return response;
}


export function HasCachedRequest(url: string, path: string, args: any, disableInvalidation: boolean = false) { //! side effect is cache invalidation
    const current_cache = cache.get();
    if(!current_cache.has(url + path + JSON.stringify(args))) return false;
    if(disableInvalidation) return true;
    const [staleBy, _] = current_cache.get(url + path + JSON.stringify(args));
    if(staleBy < Date.now()) {
        cache.update((map) => {
            apps.get()[0].log("Removing stale cache entry", url + path + JSON.stringify(args));
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

export function SubscribeToValue(url: string, path: string, args: any) {
    return new Promise((resolve) => {
        const listener = (value) => {
            resolve(value);
        };
        cache.callback(listener, (value) => value.has(url + path + JSON.stringify(args)), true);
    });
}

export function SubscribeToValues(...values: { url: string, path: string, args: any }[]) {
    return new Promise((resolve) => {
        const listener = (value) => {
            resolve(value);
        };
        cache.callback(listener, (value) => {
            for(const val of values) {
                if(!value.has(val.url + val.path + JSON.stringify(val.args))) return false;
            }
            return true;
        }, true);
    });
}
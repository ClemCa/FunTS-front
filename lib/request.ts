import { ActiveLoop } from "./active_loop";
import { GetCachedRequest, CacheRequest, HasCachedRequest } from "./cache";
import { store } from "./internal";
import { Enqueue } from "./queue";
import { AppData, RequestBase } from "./types";

const activeRequests = [] as string[];
const callbacks = new Map<string, ((response: object) => void)[]>();
const apps = store.fragment<AppData[]>("apps");

export function HitRequest(request: RequestBase, immediate: boolean) {
    if (HasCachedRequest(request.url, request.path, request.args)) {
        GetCachedRequest(request.url, request.path, request.args);
        return;
    }
    ActiveLoop();
    const app = apps.get()[request.app];
    activeRequests.push(request.id);
    setTimeout(() => { // to leave a chance for with to modify the request
        if (immediate && app.unlimited_direct) {
            Request(request);
            return;
        }
        Enqueue(request, immediate);
    }, 0);
}


export function RegisterCallback(id: string, callback: (response: object) => void) {
    const current = callbacks.get(id) ?? [];
    current.push(callback);
    callbacks.set(id, current);
    console.log("callback pushed")
}

export function IsRequestActive(id: string) {
    return activeRequests.includes(id);
}

export function Request(request: RequestBase) {
    console.log("making request", request);
    const requestPath = request.url + request.path;
    const body = JSON.stringify(request.args);
    const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    };
    const options = {
        method: "POST",
        headers,
        body
    };
    fetch(requestPath, options)
        .then(response => response.json())
        .then(response => {
            console.log("received request", request);
            const current = callbacks.get(request.id) ?? [];
            activeRequests.splice(activeRequests.indexOf(request.id), 1);
            CacheRequest(request, response)
            callbacks.delete(request.id);
            current.forEach(callback => callback(response));
        });
}
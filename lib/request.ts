import { ActiveLoop } from "./active_loop";
import { GetCachedRequest, CacheRequest, HasCachedRequest, SubscribeToValues } from "./cache";
import { store } from "./internal";
import { DequeuePassive, Enqueue, HasRequestQueued, PassiveQueue } from "./queue";
import { AppData, RequestBase, RequestOptimized } from "./types";

const activeRequests = [] as string[];
const callbacks = new Map<string, ((response: object) => void)[]>();
const apps = store.fragment<AppData[]>("apps");

export class Cancellation {
    cancelled = false;
    cancel() {
        this.cancelled = true;
    }
    isCancelled() {
        return this.cancelled;
    }
}

export function HitRequest(request: RequestBase, immediate: boolean, cancellation: Cancellation, id: string): string {
    if (request.singleBatched) {
        const freshArgs = (request.args as object[]).map((arg) => HasCachedRequest(request.url, request.path, arg) ? null : arg).filter((arg) => arg !== null);
        if (freshArgs.length === 0) {
            if (apps.is((apps) => apps[request.app].verbose)) {
                console.log("Batched request had all elements in cache", request.url + request.path + JSON.stringify(request.args));
            }
            EmptyRequest(request);
            return id;
        }
        if(freshArgs.length !== (request.args as object[]).length && apps.is((apps) => apps[request.app].verbose)) {
            console.log("Batched request had some elements in cache", request.url + request.path + JSON.stringify(request.args));
        }
        const [queued, newArgs] = HasRequestQueued(request) as [boolean, object[]];
        if (queued) {
            if (apps.is((apps) => apps[request.app].verbose)) {
                console.log("Batched request was already in queue", request.url + request.path + JSON.stringify(request.args));
            }
            PostQueueBatch(request);
            return id;
        }
        if (newArgs.length != (request.args as any[]).length && apps.is((apps) => apps[request.app].verbose)) {
            console.log("Batched request had some elements already in queue", request.url + request.path + JSON.stringify(request.args));
        }
        request.args = newArgs;
    } else if (request.multiBatched) {
        const freshArgs = (request.args as object[]).map((arg) => HasCachedRequest(request.url, arg[0], arg[1]) ? null : arg).filter((arg) => arg !== null);
        if (freshArgs.length === 0) {
            if (apps.is((apps) => apps[request.app].verbose)) {
                console.log("Multi-batched request had all elements in cache", request.url + request.path + JSON.stringify(request.args));
            }
            EmptyRequest(request);
            return id;
        }
        if(freshArgs.length !== (request.args as object[]).length && apps.is((apps) => apps[request.app].verbose)) {
            console.log("Multi-batched request had some elements in cache", request.url + request.path + JSON.stringify(request.args));
        }
        const [queued, newArgs] = HasRequestQueued(request) as [boolean, object[]];
        if (queued) {
            if (apps.is((apps) => apps[request.app].verbose)) {
                console.log("Multi-batched request was already in queue", request.url + request.path + JSON.stringify(request.args));
            }
            PostQueueBatch(request);
            return id;
        }
        if (newArgs.length != (request.args as any[]).length && apps.is((apps) => apps[request.app].verbose)) {
            console.log("Multi-batched request had some elements already in queue", request.url + request.path + JSON.stringify(request.args));
        }
        request.args = newArgs;
    } else {
        if (HasCachedRequest(request.url, request.path, request.args)) {
            if (apps.is((apps) => apps[request.app].verbose)) {
                console.log("From cache", request.url + request.path + JSON.stringify(request.args));
            }
            return id;
        }
        const [queued, existing] = HasRequestQueued(request);
        if (queued) {
            if (apps.is((apps) => apps[request.app].verbose)) {
                console.log("Request already queued", request.url + request.path + JSON.stringify(request.args));
            }
            return (existing as RequestBase).id;
        }
    }
    ActiveLoop();
    const app = apps.get()[request.app];
    activeRequests.push(id);
    if (apps.is((apps) => apps[request.app].verbose)) {
        console.log("Queueing", request.url + request.path + JSON.stringify(request.args));
    }
    PassiveQueue(request);
    setTimeout(() => { // to leave a chance to modify the request (with or cancel)
        if (cancellation.isCancelled()) {
            DequeuePassive(request);
            activeRequests.splice(activeRequests.indexOf(id), 1);
            return;
        }
        if (immediate && app.unlimited_direct) {
            if (apps.is((apps) => apps[request.app].verbose)) {
                console.log("[Unlimited direct requests active] Directly hitting", request.url + request.path + JSON.stringify(request.args));
            }
            DequeuePassive(request);
            Request(request);
            return;
        }
        Enqueue(request, immediate);
    }, 0);
    return id;
}


export function RegisterCallback(id: string, callback: (response: object) => void) {
    const current = callbacks.get(id) ?? [];
    current.push(callback);
    callbacks.set(id, current);
}

export function IsRequestActive(id: string) {
    return activeRequests.includes(id);
}

export function Request(request: RequestBase) {
    const requestPath = request.url + request.path;
    const body = JSON.stringify(request.args);
    const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "batched": request.singleBatched.toString()
    };
    const options = {
        method: "POST",
        headers,
        body
    };
    fetch(requestPath, options)
        .then(response => {
            try {
                return response.json();
            } catch (e) {
                console.error("Failed to parse response as JSON");
                return response.text();
            }
        }) // TODO : handle status codes
        .then(response => {
            if (apps.is((apps) => apps[request.app].verbose))
                console.log("Done", requestPath, body);
            DealWithResponse(request, response);
        });
}

export function BatchRequests(id: string, requests: RequestBase[]) {
    let [groups, averagePriority] = requests.reduce((acc, request) => {
        acc[0].push([request.path, request.args, request.singleBatched]);
        acc[1] += request.priority;
        return acc;
    }, [[], 0]);
    averagePriority /= requests.length;
    Request({
        id: id,
        app: requests[0].app,
        url: requests[0].url,
        path: "/batch/",
        args: groups,
        priority: 0,
        stale: 0,
        renewable: false,
        buildUp: 0, // doesn't matter
        singleBatched: false,
        multiBatched: true,
        callback: () => { }
    });
    RegisterCallback(id, (object) => {
        if (!Array.isArray(object)) {
            console.error("Batched request failed (invalid response)");
            return;
        }
        for (let i = 0; i < requests.length; i++) {
            if (object.length <= i) {
                console.error("Batched request failed (missing response, version mismatch?)");
            }
            const [statusCode, response] = object[i];
            if (statusCode !== 200) {
                console.error("Batched request failed (status code " + statusCode + ")", requests[i]);
                continue;
            }
            DealWithResponse(requests[i], response);
        }
    });
}

function DealWithResponse(request: RequestBase | RequestOptimized, response) {
    const current = callbacks.get(request.id) ?? [];
    activeRequests.splice(activeRequests.indexOf(request.id), 1);
    callbacks.delete(request.id);
    CacheRequest(request, response);
    if (typeof request['original'] !== "undefined") {
        request = request['original']; // "reset" to the original request without the reduced args
    }
    // we use the cache to make sure we have correspondances for elements we removed from the request
    if (request.singleBatched) {
        const enhancedResponse = (request.args as any[]).map((arg) => GetCachedRequest(request.url, request.path, arg));
        current.forEach(callback => callback(enhancedResponse));
    } else if (request.multiBatched) {
        current.forEach(callback => callback(response)); // we don't actually want to parse it from here, as that is dealt with from the callback
    } else {
        const fromCache = GetCachedRequest(request.url, request.path, request.args);
        current.forEach(callback => callback(fromCache));
    }
}

function EmptyRequest(request: RequestBase) {
    activeRequests.push(request.id);
    setTimeout(() => { // for modifiers
        const current = callbacks.get(request.id) ?? [];
        activeRequests.splice(activeRequests.indexOf(request.id), 1);
        callbacks.delete(request.id);
        if (request.singleBatched) {
            const enhancedResponse = (request.args as any[]).map((arg) => GetCachedRequest(request.url, request.path, arg));
            current.forEach(callback => callback(enhancedResponse));
        }
        if (request.multiBatched) {
            const enhancedResponse = (request.args as any[]).map((arg) => GetCachedRequest(request.url, arg[0], arg[1]));
            current.forEach(callback => callback(enhancedResponse));
        }
        else {
            current.forEach(callback => callback(null));
        }
    }, 0);
}

function PostQueueBatch(request: RequestBase) {
    activeRequests.push(request.id);
    setTimeout(async () => {
        const allPairs = AllPairs(request);
        await SubscribeToValues(...allPairs.map(([path, args]) => ({ url: request.url, path, args })));
        const response = (request.args as object[]).map((arg) => GetCachedRequest(request.url, request.singleBatched ? request.path : arg[0], request.singleBatched ? arg : arg[1]));
        const current = callbacks.get(request.id) ?? [];
        activeRequests.splice(activeRequests.indexOf(request.id), 1);
        callbacks.delete(request.id);
        current.forEach(callback => callback(response));
    }, 0);
}

function AllPairs(request: RequestBase): [string, any][] {
    if(request.multiBatched) {
        return (request.args as object[]).map((arg) => AllPairs({ ...request, path: arg[0], args: arg[1], singleBatched: arg[2], multiBatched: arg[3], id: arg[4] })).flat();
    }
    if(request.singleBatched) {
        return (request.args as object[]).map((arg) => AllPairs({ ...request, singleBatched: false, args: arg })).flat();
    }
    return [[request.path, request.args]];
}
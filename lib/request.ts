import { ActiveLoop } from "./active_loop";
import { GetCachedRequest, CacheRequest, HasCachedRequest } from "./cache";
import { store } from "./internal";
import { Enqueue } from "./queue";
import { AppData, RequestBase } from "./types";

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

export function HitRequest(request: RequestBase, immediate: boolean, cancellation: Cancellation) {
    if(request.singleBatched) {
        const newArgs = (request.args as any[]).reduce((acc, arg) => {
            if(HasCachedRequest(request.url, request.path, arg)) return acc;
            acc.push(arg);
            return acc;
        }, []);
        if(newArgs.length === 0) {
            EmptyRequest(request);
            return;
        }
        request.args = newArgs;
    } else if (request.multiBatched) {
        const newArgs = (request.args as any[]).reduce((acc, arg) => {
            if(HasCachedRequest(request.url, arg[0], arg[1])) return acc;
            acc.push(arg);
            return acc;
        }, []);
        if(newArgs.length === 0) {
            EmptyRequest(request);
            return;
        }
        request.args = newArgs;
    } else {
        if (HasCachedRequest(request.url, request.path, request.args)) {
            return;
        }    
    }
    ActiveLoop();
    const app = apps.get()[request.app];
    activeRequests.push(request.id);
    setTimeout(() => { // to leave a chance to modify the request (with or cancel)
        if(cancellation.isCancelled()) {
            activeRequests.splice(activeRequests.indexOf(request.id), 1);
            return;
        }
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
            } catch {
                console.error("Failed to parse response as JSON");
                return response.text();
            }
        }) // TODO : handle status codes
        .then(response => {
            const current = callbacks.get(request.id) ?? [];
            activeRequests.splice(activeRequests.indexOf(request.id), 1);
            callbacks.delete(request.id);
            CacheRequest(request, response);
            if(request.singleBatched) {
                const enhancedResponse = (request.args as any[]).map((arg) => GetCachedRequest(request.url, request.path, arg));
                current.forEach(callback => callback(enhancedResponse));
            } else if (request.multiBatched) {
                const enhancedResponse = (request.args as any[]).map((arg) => GetCachedRequest(request.url, arg[0], arg[1]));
                current.forEach(callback => callback(enhancedResponse));
            } else {
                current.forEach(callback => callback(response));
            }
        });
}

function EmptyRequest(request: RequestBase) {
    activeRequests.push(request.id);
    setTimeout(() => { // for modifiers
        const current = callbacks.get(request.id) ?? [];
        activeRequests.splice(activeRequests.indexOf(request.id), 1);
        callbacks.delete(request.id);
        if(request.singleBatched) {
            const enhancedResponse = (request.args as any[]).map((arg) => GetCachedRequest(request.url, request.path, arg));
            current.forEach(callback => callback(enhancedResponse));
        }
        if(request.multiBatched) {
            const enhancedResponse = (request.args as any[]).map((arg) => GetCachedRequest(request.url, arg[0], arg[1]));
            current.forEach(callback => callback(enhancedResponse));
        }
        else {
            current.forEach(callback => callback(null));
        }            
    }, 0);
}
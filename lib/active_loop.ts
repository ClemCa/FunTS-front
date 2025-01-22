import { GetAllReady, GetNext, NextIsBatchable } from "./queue";
import { BatchRequests, RegisterCallback, Request } from "./request";
import { GenerateUID, store } from "./internal";
import { AppData, RequestBase } from "./types";

const appsFragment = store.fragment<AppData[]>("apps");
let running = false;
let concurrent = new Map<number, number>();
let ongoing = new Map<number, boolean>();

let next;
export async function ActiveLoop() {
    if(running) return;
    const apps = appsFragment.get();
    running = true;
    let any = false;
    do {
        await new Promise((res) => setTimeout(res, 10)); // it does slow down the first iteration by 10ms, but at the scale of web requests, it's fine
        any = false;
        for(let i = 0; i < apps.length; i++) {
            if(ongoing.get(i)) {
                any = true;
                continue;
            }
            if(apps[i].auto_batch && NextIsBatchable(i)) {
                next = GetAllReady(i);
                if(next.length > 0) {
                    ongoing.set(i, true);
                    ForAppBatch(next);
                    any = true;
                }
            } else {
                if(next = GetNext(i)) {
                    ongoing.set(i, true);
                    ForApp(next);
                    any = true;
                }
            }
        }
    }
    while(any);
    running = false;
}

async function ForApp(request: RequestBase) {
    const settings = appsFragment.get()[request.app];
    if(settings === undefined) {
        throw new Error("App does not exist");
    }
    if(settings.concurrency_limit === 0) {
        throw new Error("Concurrency limit is 0, no requests can be made");
    }
    if(!concurrent.has(request.app)) {
        concurrent.set(request.app, 0);
    }
    while(concurrent.get(request.app) >= settings.concurrency_limit) {
        await new Promise((res) => setTimeout(res, 10));
        continue;
    }
    RegisterCallback(request.id, () => {
        concurrent.set(request.app, concurrent.get(request.app) - 1);
    });
    Request(request);
    ongoing.set(request.app, false);
}

async function ForAppBatch(requests: RequestBase[]) {
    const settings = appsFragment.get()[requests[0].app];
    if(settings === undefined) {
        throw new Error("App does not exist");
    }
    if(settings.concurrency_limit === 0) {
        throw new Error("Concurrency limit is 0, no requests can be made");
    }
    if(!concurrent.has(requests[0].app)) {
        concurrent.set(requests[0].app, 0);
    }
    while(concurrent.get(requests[0].app) >= settings.concurrency_limit) {
        await new Promise((res) => setTimeout(res, 10));
        continue;
    }
    const id = GenerateUID();
    RegisterCallback(id, () => {
        concurrent.set(requests[0].app, concurrent.get(requests[0].app) - 1);
    });
    BatchRequests(id, requests);
    ongoing.set(requests[0].app, false);
}
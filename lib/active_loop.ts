import { GetNext } from "./queue";
import { RegisterCallback, Request } from "./request";
import { store } from "./internal";
import { AppData, RequestBase } from "./types";

const appsFragment = store.fragment<AppData[]>("apps");
let running = false;
let concurrent = new Map<number, number>();
let ongoing = new Map<number, boolean>();

export async function ActiveLoop() {
    if(running) return;
    const apps = appsFragment.get().length;
    running = true;
    let any = true;
    while (any) {
        for(let i = 0; i < apps; i++) {
            if(ongoing.get(i)) {
                any = true;
                continue;
            }
            let next;
            if(next = GetNext(i)) {
                ongoing.set(i, true);
                ForApp(next);
                any = true;
            }
        }
        await new Promise((res) => setTimeout(res, 10));
    }
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
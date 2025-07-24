import { GetCachedRequest } from "./cache";
import { GenerateUID, store } from "./internal";
import { Cancellation, HitRequest, IsRequestActive, RegisterCallback } from "./request";
import { InternalAppData, Plug, RequestBase, Spark } from "./types";

const apps = store.fragment<InternalAppData[]>("apps");

export function GeneratePlug(app: number, url: string, path: string, format: [any, any]): () => Plug<any, any> {
    return () => {
        const func = (args: any) => GenerateSpark(app, url, path, format, args, true, false, false);
        func.queue = (args: any) => GenerateSpark(app, url, path, format, args, false, false, false);
        func.getPath = () => path;
        func.batch = (...args: any[]) => GenerateSpark(app, url, path, format, args, true, true, false);
        func.batch['queue'] = (...args: any[]) => GenerateSpark(app, url, path, format, args, false, true, false);
        return func as unknown as Plug<any, any>;
        // aaaah I can't do good type inference without adding way too much unnecessary logic and going through hoops :(
    };
}

export function GenerateSpark(app: number, url: string, path: string, format: [any, any], args: any, immediate: boolean, singleBatch: boolean, multiBatch: boolean): Spark<any> {
    let id = GenerateUID();
    const appData = apps.get()[app];
    const request = {
        id,
        app: app,
        url,
        path,
        args,
        priority: 1,
        stale: appData.default_stale,
        renewable: false,
        expectation: 1,
        buildUp: 1,
        singleBatched: singleBatch,
        multiBatched: multiBatch,
        callback: () => {}
    };
    const cancel = new Cancellation();
    id = HitRequest(request, immediate, cancel, id);
    if(id !== request.id) {
        apps.get()[app].log("Request bound to the existing version in queue", request.url + request.path + JSON.stringify(request.args));
    }
    request.id = id;
    const obj = {
        cancel: () => {
            cancel.cancel();
        },
        generationData: () => [path, format, args, singleBatch, multiBatch, id],
        with: (opt: {
            priority?: number,
            expectation?: number,
            stale?: number,
            renewable?: boolean,
        }) => {
            request.priority = opt.priority ?? request.priority;
            request.stale = opt.stale ?? request.stale;
            request.renewable = opt.renewable ?? request.renewable;
            request.expectation = opt.expectation ?? request.expectation;
            return obj as Spark<any>;
        },
        promise: async () => {
            return await AwaitRequest(request);
        },
        bottle: (forceVolatile?: boolean) => {
            if(!forceVolatile && typeof format[1] === "object") {
                if(Array.isArray(format[1])) {
                    const arr = [];
                    AwaitRequest(request).then((response: any) => {
                        arr.push(...response);
                    });
                    return arr as any;
                }
                const obj = {...format[1]};
                AwaitRequest(request).then((response: any) => {
                    for (const key in response) {
                        obj[key] = response[key];
                    }
                });
                return obj as any;
            }
            const obj = {
                value: null,
                caught: false,
                uncork: () => {
                    if(!obj.caught) throw new Error("Uncork error: Spark not caught");
                    return obj.value;
                }
            }
            AwaitRequest(request).then((response) => {
                obj.value = response;
                obj.caught = true;
            });
            return obj as any;
        },
        catch: () => WaitForRequest(id),
    };
    return obj as Spark<any>;
}

async function WaitForRequest(uid: string) {
    if(!IsRequestActive(uid)) return;
    return new Promise<void>((resolve) => {
        const callback = () => {
            resolve();
        };
        RegisterCallback(uid, callback);
    });
}

async function AwaitRequest(request: RequestBase) {
    if(!IsRequestActive(request.id)) {
        if(request.singleBatched) {
            return (request.args as object[]).map((arg) => {
                return GetCachedRequest(request.url, request.path, arg);
            });
        }
        if(request.multiBatched) {
            return (request.args as object[]).map((arg) => {
                return GetCachedRequest(request.url, arg[0], arg[1]);
            });
        }
        return GetCachedRequest(request.url, request.path, request.args);
    }
    return new Promise<object>((resolve) => {
        const callback = (val) => {
            resolve(val);
        };
        RegisterCallback(request.id, callback);
    });
}
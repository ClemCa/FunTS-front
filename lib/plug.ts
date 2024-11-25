import { GetCachedRequest } from "./cache";
import { GenerateUID, store } from "./internal";
import { HitRequest, IsRequestActive, RegisterCallback } from "./request";
import { AppData, Plug, Spark } from "./types";

const apps = store.fragment<AppData[]>("apps");

export function GeneratePlug(app: number, url: string, path: string, format: object): () => Plug<any, any> {
    return () => {
        const func = (args: any) => GenerateSpark(app, url, path, format, args, true);
        func.queue = (args: any) => GenerateSpark(app, url, path, format, args, false);
        return func as unknown as Plug<any, any>;
        // aaaah I can't do good type inference without adding way too much unnecessary logic and going through hoops :(
    };
}

export function GenerateSpark(app: number, url: string, path: string, format: object, args: any, immediate: boolean): Spark<any> {
    const id = GenerateUID();
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
        callback: () => {}
    };
    HitRequest(request, immediate);
    const obj = {
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
            return this as Spark<any>;
        },
        promise: () => new Promise<any>(async () => {
            await WaitForRequest(id);
            return GetCachedRequest(url, path, args);
        }),
        bottle: () => {
            const obj = {
                value: null,
                caught: false,
                uncork: () => {
                    if(!this.caught) throw new Error("Uncork error: Spark not caught");
                    return this.value;
                }
            }
            WaitForRequest(id).then(() => {
                const response = GetCachedRequest(url, path, args);
                obj.value = response;
                obj.caught = true;
            });
            return obj as any;
        },
        catch: () => new Promise<void>(() => WaitForRequest(id))
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


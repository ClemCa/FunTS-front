import { store } from "lib/internal";
type Raw<T> = object & {"::": {}}
type AppData = {
}

type Volatile = string | number | boolean;

type VolatileBottle<T extends Volatile> = {
    value: T;
    caught: boolean;
    uncork: () => T;
}

type Bottle<T> = T extends Volatile ? VolatileBottle<T> : T;

type Spark<T> = {
    with: (opt: {
        priority?: number,
        expectation?: number,
        stale?: number,
        renewable?: boolean,
    }) => Spark<T>;
    promise: () => Promise<T>;
    bottle: () => Bottle<T>;
    catch: () => Promise<void>;
}

type Plug<T, U> = () => {
    (args: T): Spark<U>;
    queue: (args: T) => Spark<U>;
}

type ArgsType<T> = T extends (...args: infer U) => any ? U[0] : never;
type ReturnType<T> = T extends (...args: any) => infer U ? U : never;

type Plugify<T> = T extends Function ? Plug<ArgsType<T>, ReturnType<T>> : {
    [K in keyof T]: Plugify<T[K]>;
};

export function LoadApp<T>(rawSchema: Raw<T>, url: string): Plugify<T> {
    store.has("apps") || store.new("apps", []); // dunno how I hadn't thought of that awesome pattern before
    store.update<AppData[]>("apps", (apps) => [...apps, {}]);

    delete rawSchema["::"];
    const plugs = RawSchemaToPlugs<T>(url, rawSchema as object);
    return plugs;
}


function RawSchemaToPlugs<T>(url: string, schema: object, path?: string) {
    path ??= "/";
    return Object.fromEntries(Object.entries(schema).map(([key, value]) => {
        if(key === "$"){
            return [key, value.map((f: Function) => Plug(url, path, f))];
        }
        if(key.startsWith("$")){
            return [key, Plug(url, path, value)];
        }
        return [key, RawSchemaToPlugs(url, value, `${path}${key}/`)];
    }));
}

function Plug(url: string, path: string, format: object) {
    return () => ({url, path, args: format});
}
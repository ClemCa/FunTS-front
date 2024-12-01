import { store } from "lib/internal";
import { GeneratePlug } from "lib/plug";
import { AppData, AppSettings, Plugify, Raw } from "lib/types";

export function LoadApp<T>(rawSchema: T, url: string): Plugify<T> & AppSettings {
    store.has("apps") || store.new("apps", []); // dunno how I hadn't thought of that awesome pattern before
    store.update<AppData[]>("apps", (apps) => [...apps, {
        concurrency_limit: 10,
        default_stale: 3600,
        unlimited_direct: false,
    }]);
    const id = store.get<AppData[]>("apps").length - 1;
    delete rawSchema["::"];
    const plugs = RawSchemaToPlugs(id, url, rawSchema as object);
    const settingsFunc = () => store.get<AppData[]>("apps")[id];
    settingsFunc.set = (value: Partial<AppData> | ((value: AppData) => AppData)) => {
        store.update<AppData[]>("apps", (apps) => {
            const newApps = [...apps];
            newApps[id] = {
                ...apps[id],
                ...value instanceof Function ? value(apps[id]) : {
                    ...apps[id],
                    ...value
                }
            };
            return newApps;
        });
    };
    return {
        ...plugs,
        $settings: settingsFunc
    };
}


function RawSchemaToPlugs(app: number, url: string, schema: object, path?: string) {
    path ??= "/";
    return Object.fromEntries(Object.entries(schema).map(([key, value]) => {
        if(key === "$" && Array.isArray(value[0])){
            return [key, value.map((f: [any, any]) => GeneratePlug(app, url, path, f))];
        }
        if(key.startsWith("$")){
            return [key, GeneratePlug(app, url, path, value)];
        }
        return [key, RawSchemaToPlugs(app, url, value, `${path}${key}/`)];
    }));
}
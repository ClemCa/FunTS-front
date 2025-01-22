import { Store } from "./store";
import { AppData } from "./types";

export const store = new Store();
export const apps = store.fragment<AppData[]>("apps");

export function GenerateUID() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
export function CompareValues(a: any, b: any): boolean {
    if (typeof a !== typeof b) return false;
    switch (typeof a) {
        case "string":
        case "number":
        case "bigint":
        case "boolean":
        case "symbol":
        case "undefined":
            return a === b;
        case "object":
            if (Array.isArray(a)) {
                if (!Array.isArray(b) || a.length != b.length) return false;
                for (let i = 0; i < a.length; i++) {
                    if (!CompareValues(a[i], b[i])) return false;
                }
                return true;
            }
            if (a === null) return a === b;
            const aKeys = Object.keys(a);
            const bKeys = Object.keys(b);
            if (aKeys.length != bKeys.length) return false;
            for (const key of aKeys) {
                if (!CompareValues(a[key], b[key])) return false;
            }
            return true;
        default:
            throw new Error("Unsupported type");
    }
}
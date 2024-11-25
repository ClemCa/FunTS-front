import { Store } from "./store";

export const store = new Store();

export function GenerateUID() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
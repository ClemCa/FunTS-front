type Element<T> = {
    value: T;
} & Partial<Extension<T>>;

type Extension<T> = {
    cleanUp: () => void;
    update: (value: T, ...args: any) => T;
    validate: (value: T) => boolean;
}

export class Fragment<T> {
    private __internal: string;
    private __store: Store;
    constructor(fragment: string, store: Store) {
        this.__internal = fragment;
        this.__store = store;
    }
    get() {
        return this.__store.get<T>(this.__internal);
    }
    forceGet() {
        return this.__store.forceGet<T>(this.__internal);
    }
    set(value: T | ((value: T | undefined) => T)) {
        this.__store.set(this.__internal, value);
    }
    update(fn: (value: T) => T) {
        return this.__store.update(this.__internal, fn);
    }
    is(action: (value: T) => boolean) {
        const value = this.get();
        if(value === undefined) {
            return false;
        }
        return action(value);
    }
    do(action: (value: T) => void) {
        const value = this.get();
        if(value === undefined) {
            throw new Error("Value does not exist");
        }
        action(value);
    }
    try(action: (value: T) => void) {
        const value = this.get();
        if(value === undefined) {
            return;
        }
        action(value);
    }
    callback(action: (value: T) => void, check: (value: T) => boolean = undefined, once: boolean = true) {
        const value = this.get();
        if(!check || check(value)) {
            action(value);
            return;
        }
        this.__store.onUpdate(this.__internal, action, check, once);
    }
}

export class Store {
    private __internal = new Map<string, Element<any>>();
    private __listeners = new Map<string, [((value: any) => void), ((value: any) => boolean) | undefined, boolean][]>();
    new<T>(key: string, value: T): Fragment<T | undefined> {
        if(!this.has(key)) this.set(key, value);
        return new Fragment<T | undefined>(key, this);
    }
    has(key: string): boolean {
        return this.__internal.has(key);
    }
    fragment<T>(key: string): Fragment<T | undefined> {
        return new Fragment<T | undefined>(key, this);
    }
    get<T>(key: string): T | undefined {
        const element = this.__internal.get(key);
        return element?.value;
    }
    forceGet<T>(key: string): T {
        const element = this.__internal.get(key);
        if(!element) {
            throw new Error(`Key "${key}" does not exist in the store.`);
        }
        return element.value;
    }
    set<T>(key: string, value: T): void {
        if(this.__internal.has(key)) {
            const element = this.__internal.get(key);
            element?.cleanUp();
        }
        this.__internal.set(key, {
            value,
            cleanUp: () => {},
            update: (value: T) => {
                this.set(key, value);
            }
        });
        this.triggerUpdate(key);
    }
    update<T>(key: string, fn: (value: T) => T) {
        if(this.__internal.has(key)) {
            const element = this.__internal.get(key);
            element?.cleanUp();
        }
        const element = this.__internal.get(key);
        element.value = fn(element.value);
        this.__internal.set(key, element);
        this.triggerUpdate(key);
        return element.value;
    }
    delete(key: string): boolean {
        if(!this.__internal.has(key)) {
            return false;
        }
        const element = this.__internal.get(key);
        element?.cleanUp();
        this.__internal.delete(key);
        this.triggerUpdate(key);
        return true;
    }
    onUpdate<T>(key: string, fn: (value: T) => void, check: (value: T) => boolean, removeValid: boolean = false) {
        if(!this.__listeners.has(key)) {
            this.__listeners.set(key, []);
        }
        const listeners = this.__listeners.get(key);
        listeners.push([fn, check, removeValid]);
        this.__listeners.set(key, listeners);
    }
    private triggerUpdate(key: string) {
        if(!this.__listeners.has(key)) {
            return;
        }
        const listeners = this.__listeners.get(key);
        const element = this.__internal.get(key);
        for(let i = listeners.length - 1; i >= 0; i--) {
            const [fn, check, removeValid] = listeners[i];
            if(!check || check(element.value)) {
                fn(element.value);
                if(removeValid) {
                    listeners.splice(i, 1);
                    this.__listeners.set(key, listeners);
                }
            }
        }
    }
}
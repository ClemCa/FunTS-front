export type Raw<T> = object & {"::": {}}
export type AppData = {
    concurrency_limit: number;
    default_stale: number;
    unlimited_direct: boolean;
}

export type AppSettings = {
    $settings: {
        (): AppData;
        set: (value: Partial<AppData> | ((value: AppData) => AppData)) => void;
    }
}

type VolatileBottle<T> = {
    value: T;
    caught: boolean;
    uncork: () => T;
}

type SubBottle<T> = T extends object ? T : VolatileBottle<T>;

export type Bottle<T, U> = U extends true ? U extends undefined ? SubBottle<T> : VolatileBottle<T> : SubBottle<T>;

export type Spark<T> = {
    with: (opt: {
        priority?: number,
        expectation?: number,
        stale?: number,
        renewable?: boolean,
    }) => Spark<T>;
    promise: () => Promise<T>;
    bottle<U extends boolean | undefined>(forceVolatile?: U): Bottle<T, U>;
    catch: () => Promise<void>;
}

export type Plug<T, U> = () => {
    (args: T): Spark<U>;
    queue: (args: T) => Spark<U>;
    getPath: () => string;
}

export type ArgsType<T> = T extends (...args: infer U) => any ? U[0] : never;
export type ReturnType<T> = T extends (...args: any) => infer U ? U : never;

export type Plugify<T> = T extends Function ? Plug<ArgsType<T>, ReturnType<T>> : {
    [K in keyof T]: Plugify<T[K]>;
};
export type RequestBase = {
    id: string;
    app: number;
    url: string;
    path: string;
    args: object;
    priority: number;
    stale: number;
    renewable: boolean;
    buildUp: number;
    callback: (response: object) => void;
}
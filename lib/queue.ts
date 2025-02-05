import { HasCachedRequest } from "./cache";
import { apps, CompareValues, store } from "./internal";
import { RequestBase } from "./types";

const queue = [];
const passiveQueue = [];
store.new("queues", { queue: queue, passiveQueue: passiveQueue }); // to keep a ref and prevent GC

function RefreshQueue() {
    const maxExpectation = Math.max(...queue.map((request) => request.expectation));
    for (let i = 0; i < queue.length; i++) {
        const request = queue[i];
        request.buildUp += request.priority * maxExpectation / request.expectation;
    }
    queue.sort((a, b) => b.buildUp - a.buildUp);
}
export function HasRequestQueued(request: RequestBase, passiveCheck: boolean = false): [boolean, object] {
    if (!passiveCheck) {
        const [isQueued, req] = HasRequestQueued(request, true);
        if (isQueued) return [isQueued, req];
    }
    const queueToUse = passiveCheck ? passiveQueue : queue;
    if (request.multiBatched) {
        const newArgs = (request.args as object[]).map((arg) => {
            const [isQueued, args] = HasRequestQueued({ ...request, path: arg[0], args: arg[1], singleBatched: arg[2], multiBatched: arg[3], id: arg[4] }, passiveCheck);
            if (isQueued) return null;
            if (arg[2] || arg[3]) {
                arg[1] = args;
            }
            return arg;
        }).filter((arg) => arg !== null);
        return [newArgs.length === 0, newArgs];
    }
    if (request.singleBatched) {
        const newArgs = (request.args as object[]).map((arg) => {
            const [isQueued, _] = HasRequestQueued({ ...request, singleBatched: false, args: arg }, passiveCheck);
            if (isQueued) return null;
            return arg;
        }).filter((arg) => arg !== null);
        return [newArgs.length === 0, newArgs];
    }
    function batchCheck(request: RequestBase, args: object[], multiBatched: boolean) {
        // request is always not batched as decomposed by HasRequestQueued
        if (multiBatched) {
            return args.some((arg) => {
                if (arg[2]) return batchCheck(request, arg[1], false);
                if (arg[3]) return batchCheck(request, arg[1], true);
                return arg[0] === request.path && arg[1] === request.args;
            });
        }
        return args.some((arg) => CompareValues(arg, request.args));
    }
    const index = queueToUse.findIndex((queued) => /* queued.id != request.id */
        // we don't actually want to check for the id, as we call this before pushing to queue, and it actively works against multi batched, which take in a spark that is already hit
        stripParentheses(queued.path) === stripParentheses(request.path)
        && queued.app === request.app
        && (
            (CompareValues(queued.args, request.args) ? true : false)
            || (
                (queued.singleBatched || queued.multiBatched)
                && batchCheck(request, queued.args, queued.multiBatched)
            )
        ));
    return [index !== -1, queueToUse[index]];
}

export function Enqueue(request: Omit<RequestBase, "buildUp">, immediate: boolean) {
    let idx = passiveQueue.findIndex((queued) => queued.id === request.id);
    if (idx !== -1) {
        passiveQueue.splice(idx, 1);
    }
    const buildUp = immediate ? request.priority : 999_999_999;
    queue.push({ ...request, buildUp });
}

// the idea is that it's just a queue for checking, as the requests get queued after waiting for the end of the event loop
export function PassiveQueue(request: RequestBase) {
    passiveQueue.push(request);
}

export function DequeuePassive(request: RequestBase) {
    const idx = passiveQueue.findIndex((queued) => queued.id === request.id);
    if (idx !== -1) {
        passiveQueue.splice(idx, 1);
    }
}

export function Invalidate(id: string) {
    for (let i = queue.length - 1; i >= 0; i--) {
        if (queue[i].id === id) {
            queue.splice(i, 1);
        }
    }
}

export function GetNext(app: number) {
    RefreshQueue();
    if (queue.length === 0) return null;
    const next = queue.findIndex((request) => request.app === app);
    if (next === -1) return null;
    const request = queue.splice(next, 1)[0];
    if (IsRequestLate(request)) {
        apps.get()[app].log("Request was cached after creation and could be skipped", request.url + request.path + JSON.stringify(request.args));
        return GetNext(app)
    };
    return request;
}

function IsRequestLate(request: RequestBase) { //! has side effect (modifies request args)
    if (typeof request['original'] === "undefined") {
        request['original'] = { ...request };
    }
    if (request.multiBatched) {
        const newArgs = (request.args as object[]).map((arg) => {
            const args = arg[1];
            if (IsRequestLate({ ...request, path: arg[0], args: args, singleBatched: arg[2], multiBatched: arg[3] })) return null;
            arg[1] = args;
            return arg;
        }).filter((arg) => arg !== null);
        if (newArgs.length === 0) return true;
        request.args = newArgs;
        return false;
    }
    if (request.singleBatched) {
        const newArgs = (request.args as object[]).map((arg) => {
            if (IsRequestLate({ ...request, singleBatched: false, args: arg })) return null;
            return arg;
        }).filter((arg) => arg !== null);
        if (newArgs.length === 0) return true;
        request.args = newArgs;
        return false;
    }
    return HasCachedRequest(request.url, request.path, request.args);
}

export function GetAllReady(app: number) {
    RefreshQueue();
    const readyIndexes = queue.reduce((acc, request, index) => {
        if (request.app !== app) return acc;
        if (request.multiBatched) return acc;
        acc.push(index);
        return acc;
    }, []);
    if (readyIndexes.length === 0) return [];
    const res = readyIndexes.reverse().map((index) => queue.splice(index, 1)[0]).filter((request) => !IsRequestLate(request));
    if (!apps.is((apps) => apps[app].verbose)) return res;
    if (res.length === 0) console.log("All requests in queue were cached after creation and could be skipped");
    if (res.length < readyIndexes.length) console.log(`${readyIndexes.length - res.length} requests were cached after creation and could be skipped`);
    return res;
}

export function NextIsBatchable(app: number) {
    RefreshQueue();
    if (queue.length === 0) return false;
    let count = 0;
    for (const request of queue) {
        if (request.app !== app) continue;
        if (request.multiBatched) break;
        count++;
    }
    return count > 1;
}

function stripParentheses(path: string) {
    return path.slice(+path.startsWith("/"), -+path.endsWith("/"));
}
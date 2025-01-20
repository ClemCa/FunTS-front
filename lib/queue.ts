import { RequestBase } from "./types";

const queue = [];

function RefreshQueue() {
    const maxExpectation = Math.max(...queue.map((request) => request.expectation));
    for(let i = 0; i < queue.length; i++) {
        const request = queue[i];
        request.buildUp += request.priority * maxExpectation / request.expectation;
    }
    queue.sort((a, b) => b.buildUp - a.buildUp);
}

export function Enqueue(request: Omit<RequestBase, "buildUp">, immediate: boolean) {
    const buildUp = immediate ? request.priority : 999_999_999;
    queue.push({...request, buildUp});
}

export function Invalidate(id: string) {
    for(let i = queue.length - 1; i >= 0; i--) {
        if(queue[i].id === id) {
            queue.splice(i, 1);
        }
    }
}

export function GetNext(app: number) {
    RefreshQueue();
    if(queue.length === 0) return null;
    const next = queue.findIndex((request) => request.app === app);
    if(next === -1) return null;
    return queue.splice(next, 1)[0];
}

export function GetAllReady(app: number) {
    RefreshQueue();
    const readyIndexes = queue.reduce((acc, request, index) => {
        if(request.app !== app) return acc;
        if(request.multiBatched) return acc;
        acc.push(index);
        return acc;
    }, []);
    if(readyIndexes.length === 0) return [];
    return readyIndexes.reverse().map((index) => queue.splice(index, 1)[0]);
}

export function NextIsBatchable(app: number) {
    RefreshQueue();
    if(queue.length === 0) return false;
    let count = 0;
    for(const request of queue) {
        if(request.app !== app) continue;
        if(request.multiBatched) break;
        count++;
    }
    return count > 1;
}
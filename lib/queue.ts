export type RequestBase = {
    id: string;
    path: string;
    args: object;
    priority: number;
    stale: number;
    renewable: boolean;
    buildUp: number;
    callback: (response: object) => void;
}

const queue = [];

function RefreshQueue() {
    for(let i = 0; i < queue.length; i++) {
        const request = queue[i];
        request.buildUp += request.priority;
    }
    queue.sort((a, b) => b.buildUp - a.buildUp);
}

export function Enqueue(request: Omit<RequestBase, "buildUp">) {
    const buildUp = request.priority;
    queue.push({...request, buildUp});
}

export function Invalidate(id: string) {
    for(let i = queue.length - 1; i >= 0; i--) {
        if(queue[i].id === id) {
            queue.splice(i, 1);
        }
    }
}

export function GetNext() {
    RefreshQueue();
    return queue.shift();
}
import { Invalidate } from "./queue";

export function CacheRequest(request, response) {
    Invalidate(request.id); // just in case this was queued;
    console.log(request, response);
}
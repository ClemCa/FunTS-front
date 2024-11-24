import { CacheRequest } from "./cache";
import { RequestBase } from "./queue";


function Request(url: string, request: RequestBase) {
    const requestPath = url + request.path;
    const body = JSON.stringify(request.args);
    const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    };
    const options = {
        method: "POST",
        headers,
        body
    };
    fetch(requestPath, options)
        .then(response => response.json())
        .then(response => CacheRequest(request, response));
}
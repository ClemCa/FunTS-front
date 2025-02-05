import { LoadApp } from "index";
import schema from "test/schema";
import readline from "readline";
const address = "https://api.xeno.run"
const app = LoadApp(schema, address);
app.$settings.set({ concurrency_limit: 10, default_stale: 3600, unlimited_direct: false, verbose: true });

const userPlug = app.fetch.mock.user.$();
console.log("Which test would you like to run?\n(D)eduping\n(B)asic\n(E)xit");

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stdin.on('keypress', (str, key) => {
    switch (key.name.toLowerCase()) {
        case "d":
            DedupingTest();
            break;
        case "b":
            Test();
            break;
        case "e":
        case "q":
        case "escape":
            process.exit(0);
            break;
        case "c":
            if(key.ctrl) process.exit(0);
        default:
            console.log("Invalid input");
            return;
    }
    process.stdin.setRawMode(false);
    process.stdin.pause();
});

async function DedupingTest() {
    function Count(log: string, str: string) {
        return log.split(str).length - 1 - (log.endsWith(str) ? 1 : 0);
    }
    await RunAndAssert("Basic deduping", () => {
        for (let i = 0; i < 10; i++) {
            userPlug({ UID: "1" });
        }
    }, log => Count(log, "Request bound to the existing version in queue") === 9);
    await RunAndAssert("Partial deduping", () => {
        userPlug.batch({ UID: "1" }, { UID: "2" });
    }, log => Count(log, "Batched request had some elements already in queue") === 1);
    await RunAndAssert("Batched deduping", () => {
        userPlug.batch({ UID: "2" }, { UID: "1" });
    }, log => Count(log, "Batched request was already in queue") === 1);
    await RunAndAssert("Double batched deduping", () => {
        userPlug.batch({ UID: "2" }, { UID: "3" });
    }, log => Count(log, "Batched request had some elements already in queue") === 1);
    await RunAndAssert("Full batched deduping", () => {
        userPlug.batch({ UID: "1" }, { UID: "2" }, { UID: "3" });
    }, log => Count(log, "Batched request was already in queue") === 1);
    await RunAndAssert("Multi batched deduping", () => {
        app.$batch(userPlug({ UID: "1" }), userPlug.batch({ UID: "2" }, { UID: "3" }), app.$batch(userPlug({ UID: "2" }), userPlug.batch({ UID: "2" }, {"UID": "3"})));
    }, log => Count(log, "Queueing") === 0);
    await RunAndAssert("Delayed test", async () => {
        const user1 = userPlug({ UID: "1" });
        await user1.promise();
        const user1Cached = userPlug({ UID: "1" });
        await user1Cached.promise();
    }, log => Count(log, "Request already queued") === 1 && Count(log, "From cache") === 1);
    await RunAndAssert("From cache complex", async () => {
        const plug = app.$batch(userPlug({ UID: "1" }), userPlug.batch({ UID: "2" }, { UID: "3" }), app.$batch(userPlug({ UID: "2" }), userPlug.batch({ UID: "2" }, {"UID": "3"})));
        await plug.promise();
    }, log => Count(log, "Error") === 0 && Count(log, "Multi-batched request had all elements in cache") === 2);
}

async function RunAndAssert(name: string, func: () => Promise<void> | void, assertion: (log: string) => boolean) {
    const log = console.log;
    let logString = "";
    console.log = (...msg) => logString += msg.map((m) => typeof m === "string" ? m : JSON.stringify(m)).join(' ') + '\n';
    await func();
    console.log = log;
    console.log(`Test ${name} ${assertion(logString) ? "passed" : "failed:\n  " + logString.replaceAll('\n', '\n  ')}`);
}

async function Test() {
    const u1Time = Date.now();
    const user1Spark = userPlug({ UID: "1" });
    const u2Time = Date.now();
    const user2Spark = userPlug.queue({ UID: "2" });
    const u1Bottle = user1Spark.bottle();

    // request the same users in parallel
    const user2Over = userPlug({ UID: "2" });
    const bothOver = userPlug.batch({ UID: "1" }, { UID: "2" });
    const multiOver = app.$batch(userPlug({ UID: "1" }), userPlug({ UID: "2" }));
    // TODO change methodology so we immediately react when all requests are filled, we don't wait on the side just like single batched requests (can go from 10ms to 0ms if it's cached when we request it)

    await user1Spark.catch();

    console.log(`user1 caught in ${Date.now() - u1Time}ms: ${u1Bottle}`);

    console.log(`user2 caught in ${Date.now() - u2Time}ms: ${await user2Spark.promise()}`);

    const u3Time = Date.now();
    await user2Over.catch();
    console.log(`overlapping user2 in ${Date.now() - u3Time}ms: ${await user2Over.promise()}`);
    console.log(`overlapping both in ${Date.now() - u3Time}ms: ${await bothOver.promise()}`);
    console.log(`overlapping multi in ${Date.now() - u3Time}ms: ${await multiOver.promise()}`);

    const u2ReTime = Date.now();
    const alreadyCached = userPlug({ UID: "2" });
    console.log(`user2 from cache in ${Date.now() - u2ReTime}ms: ${await alreadyCached.promise()}`);

    await userPlug.batch({ UID: "3" }, { UID: "4" }, { UID: "5" }).promise();
    console.log("single batched");
    await app.$batch(userPlug({ UID: "6" }), app.fetch.mock.user.$()({ UID: "7" })).promise();
    console.log("multi batched");
    // const preCached = userPlug.batch({ UID: "3" }, { UID: "4" }, { UID: "5" }, { UID: "6" }, { UID: "7" });
    // const u3ReTime = Date.now();
    // console.log(`users 3-7 from cache in ${Date.now() - u3ReTime}ms: ${await preCached.promise()}`);
}
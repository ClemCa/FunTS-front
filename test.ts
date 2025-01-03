import { LoadApp } from "index";
import schema from "test/schema";
const address = "https://api.xeno.run"
const app = LoadApp(schema, address);
app.$settings.set({concurrency_limit: 10, default_stale: 3600, unlimited_direct: false});

const userPlug = app.fetch.mock.user.$();
Test();

async function Test() {
    const u1Time = Date.now();
    const user1Spark = userPlug({ UID: "1"});
    const u2Time = Date.now();
    const user2Spark = userPlug.queue({ UID: "2" });
    const u1Bottle = user1Spark.bottle();

    await user1Spark.catch();
    console.log(`user1 caught in ${
        Date.now() - u1Time        
    }ms: ${u1Bottle}`);

    console.log(`user2 caught in ${
        Date.now() - u2Time
    }ms: ${await user2Spark.promise()}`);

    const u2ReTime = Date.now();
    const alreadyCached = userPlug({ UID: "2" });
    console.log(`user2 from cache in ${Date.now() - u2ReTime}ms: ${await alreadyCached.promise()}`);
}

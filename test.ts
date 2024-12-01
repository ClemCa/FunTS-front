import { LoadApp } from "index";
import schema, { Schema } from "test/schema";
const address = "https://api.xeno.run"
const app = LoadApp<Schema>(schema, address);
app.$settings.set({concurrency_limit: 10, default_stale: 3600, unlimited_direct: false});

const userPlug = app.fetch.mock.user.$();
Test();

async function Test() {
    const user1Spark = userPlug({ UID: "1"});
    const user2Spark = userPlug.queue({ UID: "2" });
    const u1Bottle = user1Spark.bottle();
    await user1Spark.catch();
    console.log("user1",u1Bottle);
    console.log("user2", await user2Spark.promise());
}

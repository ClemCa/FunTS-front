import { LoadApp } from "index";
import schema, { Schema } from "test/schema";

const app = LoadApp<Schema>(schema, "localhost:3000");
app.$settings.set({concurrency_limit: 10, default_stale: 3600, unlimited_direct: false});

const plug = app.$1();
let spark = plug.queue({a: 0, b: 2, c: 0});
spark = plug({a: 0, b: 2, c: 0})
.with({priority: 1, stale: 1000, renewable: true})

const a = spark.promise();
const b = spark.bottle();
spark.catch();
if(b.caught) {
    b.uncork();
} else {
    // the kind of situation where you're sure there's a library bug or your server is very much down
    console.error("Spark not caught");
}
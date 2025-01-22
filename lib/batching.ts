import { GenerateSpark } from "./plug";
import { Spark, SparkBatch } from "./types";



export function BatchSparks<T extends Spark<any>[]>(app: number, url: string, sparks: T): SparkBatch<T> {
    CancelRequests(sparks);
    // generationData is intentionally not typed to avoid user confusion
    const data = sparks.map((spark: any) => spark.generationData()) as [string, [any, any], any, boolean, boolean, string][];
    const body = data.map(([path, format, args, singleBatch, multiBatch, id]) => ([path, args, singleBatch, multiBatch, id]));
    return GenerateSpark(app, url, "/batch/", [[],[]], body, false, false, true);
}

function CancelRequests<T>(sparks: Spark<T>[]) {
    sparks.forEach((spark: any) => { // cancel is intentionally not typed to avoid user confusion
        spark.cancel();
    });
}
import { Resource } from "sst";
import { Example } from "@openpromo/core/example";

console.log(`${Example.hello()} Linked to ${Resource.MyBucket.name}.`);

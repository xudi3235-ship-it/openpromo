import { Hono } from "hono";

const app = new Hono().get("/", (c) => c.text("ping from workers!"));

export default app;

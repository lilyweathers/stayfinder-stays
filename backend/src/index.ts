import { serve } from "@hono/node-server";
import app from "./app.js";
import { env } from "./env.js";

const port = env.honoPort;

if (!process.env.VERCEL) {
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  });
}

export default app;

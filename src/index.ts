import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import app from "./app.js";
import { env } from "./env.js";

dotenv.config();

const port = Number(process.env.HONO_PORT) || 3000;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`);
});

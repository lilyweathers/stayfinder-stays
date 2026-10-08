import { Hono } from "hono";
import { prettyJSON } from "hono/pretty-json";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { env } from "./env.js";
import { optionalAuth } from "./middleware/auth.js";
import { authApp } from "./routes/auth.js";
import bookingApp from "./routes/bookings.js";
import profilesApp from "./routes/profiles.js";
import propertiesApp from "./routes/properties.js";

const app = new Hono({ strict: false });

app.use(prettyJSON());
app.use("*", cors({
  origin: env.frontendUrl,
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type"],
}));
app.use("*", async (c, next) => {
  const origin = c.req.header("Origin");
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method) && origin && origin !== env.frontendUrl) {
    return c.json({ error: "Origin not allowed" }, 403);
  }
  await next();
});
app.use("*", optionalAuth);

app.get("/", (c) => c.text("StayFinder API"));
app.route("/profiles", profilesApp);
app.route("/properties", propertiesApp);
app.route("/auth", authApp);
app.route("/bookings", bookingApp);

app.notFound((c) => c.json({ error: "Route not found" }, 404));
app.onError((error, c) => {
  if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
  console.error(error);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;

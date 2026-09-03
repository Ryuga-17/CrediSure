require("dotenv").config();
const express = require("express");
const mongoose = require("./config/db");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const mlService = require("./services/mlService");
const logger = require("./utils/logger");
const requestId = require("./middlewares/requestId");
const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });
}
if (!process.env.JWT_SECRET) {
  logger.error("JWT_SECRET is not set. Refusing to start.");
  process.exit(1);
}

const documentRoutes = require("./routes/document");

const app = express();

// Behind a reverse proxy (the documented deploy topology: frontend on
// Vercel, backend on a separate host), req.ip resolves to the proxy's own
// address unless Express is told which X-Forwarded-* headers to trust --
// which silently breaks rateLimit.js's per-IP buckets by bucketing every
// user together. TRUST_PROXY sets Express's "trust proxy" hop count
// explicitly; absent that, default to 1 (trust exactly one hop -- the
// single reverse proxy/load balancer a typical PaaS deploy sits behind) in
// production, and 0 in development, where there's no proxy and trusting
// one would let a client spoof its own IP via X-Forwarded-For.
const trustProxy = process.env.TRUST_PROXY !== undefined
  ? Number(process.env.TRUST_PROXY)
  : (process.env.NODE_ENV === "production" ? 1 : 0);
app.set("trust proxy", trustProxy);

app.use(express.json());
app.use(cookieParser());
app.use(requestId);

// CORS_ORIGIN is a comma-separated allowlist. Auth now rides in a cookie
// (see routes/auth.js), which requires credentials: true plus a specific
// origin -- a wildcard/open CORS response can't carry credentialed
// requests at all, so falling back to a wide-open cors() would just make
// login silently fail cross-origin instead of being a real fallback.
// Default to the Next.js dev server so local development still works
// without CORS_ORIGIN set.
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!process.env.CORS_ORIGIN) {
  logger.warn(`CORS_ORIGIN is not set; defaulting to ${allowedOrigins.join(", ")}.`);
}
app.use(cors({ origin: allowedOrigins, credentials: true }));

app.use(helmet());
// Access log, not the structured application log above -- morgan's own
// "dev" format is the standard, well-known shape for this and is left as
// plain console output; :id ties each access-log line to the same
// correlation id an error for that request would carry.
morgan.token("id", (req) => req.id);
app.use(morgan(":id :method :url :status :response-time ms"));

const PORT = process.env.PORT || 5000;
app.get("/", (req, res) => {
    res.send("CrediSure Backend API is running");
  });

// For load balancer / orchestrator readiness probes.
app.get("/health", (req, res) => {
  const mongoConnected = mongoose.connection.readyState === 1;
  res.status(mongoConnected ? 200 : 503).json({
    status: mongoConnected ? "ok" : "degraded",
    mongo: mongoose.connection.readyState,
  });
});

// Swagger setup
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "CrediSure API",
      version: "1.0.0",
      description: "API Documentation for CrediSure Backend",
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
      },
    ],
  },
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/auth", require("./routes/auth"));
app.use("/users", require("./routes/user"));
app.use("/loans", require("./routes/loan"));
app.use("/document", documentRoutes);

if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Final safety net so an unexpected throw returns 500 instead of hanging the request.
app.use((err, req, res, next) => {
  logger.error("Unhandled error", { err, requestId: req.id, path: req.path });
  res.status(500).json({ error: "Server error" });
});

const server = app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));

// Drain in-flight requests and close the Mongo connection + Python child
// process instead of a hard kill on deploy/restart.
function shutdown(signal) {
  logger.info(`${signal} received: shutting down gracefully`);

  server.close(async () => {
    logger.info("HTTP server closed");
    mlService.shutdown();
    try {
      await mongoose.connection.close();
      logger.info("MongoDB connection closed");
    } catch (err) {
      logger.error("Error closing MongoDB connection", { err });
    }
    process.exit(0);
  });

  // Don't hang forever if something doesn't drain.
  setTimeout(() => {
    logger.error("Graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));


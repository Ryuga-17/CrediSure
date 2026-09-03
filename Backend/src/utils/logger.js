/**
 * Minimal structured logger. Dependency-free, matching this codebase's
 * existing style (see middlewares/rateLimit.js) rather than pulling in
 * pino/winston for a project this size. Each line is a single JSON object
 * so it's greppable and parseable by a log aggregator without extra config,
 * unlike the raw `console.log`/`console.error` calls this replaces.
 *
 * LOG_LEVEL controls verbosity (error < warn < info < debug); defaults to
 * "info" so debug-level detail stays opt-in.
 */
const LEVELS = ["error", "warn", "info", "debug"];
const configuredLevel = (process.env.LOG_LEVEL || "info").toLowerCase();
const configuredLevelIndex = LEVELS.includes(configuredLevel)
  ? LEVELS.indexOf(configuredLevel)
  : LEVELS.indexOf("info");

function log(level, message, meta = {}) {
  if (LEVELS.indexOf(level) > configuredLevelIndex) {
    return;
  }
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  // Errors go to stderr like console.error did, so log-level filtering by
  // stream (e.g. 2>/dev/null in dev) keeps working the same way.
  const line = JSON.stringify(entry);
  if (level === "error") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

// meta.err, when an Error instance, is expanded to {message, stack} rather
// than logged as-is -- JSON.stringify(Error) otherwise produces `{}`, since
// Error's own properties are non-enumerable.
function normalizeMeta(meta) {
  if (meta && meta.err instanceof Error) {
    return { ...meta, err: { message: meta.err.message, stack: meta.err.stack } };
  }
  return meta;
}

module.exports = {
  error: (message, meta) => log("error", message, normalizeMeta(meta)),
  warn: (message, meta) => log("warn", message, normalizeMeta(meta)),
  info: (message, meta) => log("info", message, normalizeMeta(meta)),
  debug: (message, meta) => log("debug", message, normalizeMeta(meta)),
};

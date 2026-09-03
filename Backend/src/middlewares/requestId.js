const crypto = require("crypto");

/**
 * Attaches a per-request correlation id (req.id) so a single request's log
 * lines -- across routes, services, and error handlers -- can be grepped
 * together. Echoed back as X-Request-Id so a client-reported error can be
 * matched to server-side logs. Honors an inbound X-Request-Id (e.g. from a
 * reverse proxy or upstream service) instead of always minting a new one,
 * so a trace can be correlated across service boundaries.
 */
module.exports = function requestId(req, res, next) {
  req.id = req.header("X-Request-Id") || crypto.randomUUID();
  res.set("X-Request-Id", req.id);
  next();
};

/**
 * Double-submit-cookie CSRF check.
 *
 * Now that the JWT lives in an httpOnly cookie, the browser attaches it to
 * every request automatically (unlike the old Authorization-header scheme,
 * which required JS to read it out of localStorage). That closes the XSS
 * token-theft gap but opens a CSRF one -- a malicious page can trigger a
 * state-changing request and the cookie rides along. The CSRF token cookie
 * set alongside it on login is deliberately NOT httpOnly (the frontend must
 * be able to read it and echo it back), so a cross-site attacker can't
 * forge the header even though the auth cookie is sent automatically.
 */
module.exports = function csrfProtection(req, res, next) {
  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.header("X-CSRF-Token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: "CSRF token missing or invalid" });
  }
  next();
};

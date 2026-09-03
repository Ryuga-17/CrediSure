import { describe, it, expect, beforeEach } from 'vitest';
import api from './api';

/**
 * Regression test for a real bug: the response interceptor used to
 * force-redirect to /signup on ANY 401, including the routine "am I logged
 * in?" probe AuthContext fires on every page load (GET /auth/me). Since
 * AuthProvider wraps the whole app, that meant every anonymous visitor to
 * any public page got immediately bounced to /signup -- nobody could browse
 * the site without an account.
 *
 * The fix scopes the force-redirect to 401s from requests NOT under /auth/
 * (login/register/me's own 401s are expected outcomes the caller already
 * handles). This test drives the interceptor's rejected handler directly --
 * jsdom doesn't implement real navigation, and this is exactly the branch
 * that matters, not the HTTP layer around it.
 */
describe('api response interceptor', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // jsdom throws "Not implemented: navigation" on a real
    // window.location.href assignment -- replace it with a plain writable
    // object so the assignment the interceptor performs is just a property
    // write we can assert on.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: '' },
    });
  });

  function getRejectedHandler() {
    // axios stores registered interceptors on interceptors.response.handlers;
    // there's exactly one response interceptor registered by api.ts.
    const handlers = (api.interceptors.response as unknown as {
      handlers: Array<{ rejected: (error: unknown) => Promise<never> }>;
    }).handlers;
    return handlers[handlers.length - 1].rejected;
  }

  function makeError(url: string, status: number) {
    return {
      config: { url },
      response: { status },
    };
  }

  it('does NOT redirect on a 401 from /auth/me (the routine session probe)', async () => {
    const rejected = getRejectedHandler();
    await expect(rejected(makeError('/auth/me', 401))).rejects.toBeDefined();
    expect(window.location.href).toBe('');
  });

  it('does NOT redirect on a 401 from /auth/login (a failed login attempt)', async () => {
    const rejected = getRejectedHandler();
    await expect(rejected(makeError('/auth/login', 401))).rejects.toBeDefined();
    expect(window.location.href).toBe('');
  });

  it('DOES redirect on a 401 from a protected, non-auth endpoint (session actually expired)', async () => {
    const rejected = getRejectedHandler();
    await expect(rejected(makeError('/loans', 401))).rejects.toBeDefined();
    expect(window.location.href).toBe('/signup');
  });

  it('does not redirect on non-401 errors', async () => {
    const rejected = getRejectedHandler();
    await expect(rejected(makeError('/loans', 500))).rejects.toBeDefined();
    expect(window.location.href).toBe('');
  });
});

/**
 * Single source of truth for the private admin route's URL prefix — used by
 * `proxy.ts` (matcher + redirect target), the admin layout (server-side
 * guard), and the login form (where to send a successful login). Changing
 * the admin's location later means changing it here only, not hunting down
 * every redirect.
 *
 * Deliberately not `/admin`: obscurity is NOT the security mechanism (real
 * auth below is), but avoiding the single most-scanned admin path costs
 * nothing and cuts down noise from automated scanners hitting a path that
 * requires real credentials anyway.
 */
export const ADMIN_BASE_PATH = "/gh-control-7f2k9";
export const ADMIN_LOGIN_PATH = `${ADMIN_BASE_PATH}/login`;

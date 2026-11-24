import { env } from '../config/env.js';

/**
 * Parses duration strings like '7d', '24h', '60m', '3600s' or numeric seconds into milliseconds.
 * @param {string|number} duration
 * @returns {number} milliseconds
 */
export function parseDurationToMs(duration) {
  if (typeof duration === 'number') {
    return duration * 1000;
  }
  if (!duration || typeof duration !== 'string') {
    return 7 * 24 * 60 * 60 * 1000; // default 7 days
  }

  const match = duration.trim().match(/^(\d+)([smhd])?$/i);
  if (!match) {
    const parsed = parseInt(duration, 10);
    return isNaN(parsed) ? 7 * 24 * 60 * 60 * 1000 : parsed * 1000;
  }

  const value = parseInt(match[1], 10);
  const unit = (match[2] || 's').toLowerCase();

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return value * 1000;
  }
}

export const AUTH_COOKIE_NAME = 'mc_auth_token';

/**
 * Generates options for setting the authentication HttpOnly cookie.
 * @returns {import('express').CookieOptions}
 */
export function getAuthCookieOptions() {
  const isProduction = env.NODE_ENV === 'production';
  const isSecure = isProduction && process.env.COOKIE_SECURE !== 'false';
  const maxAge = parseDurationToMs(env.JWT_EXPIRES_IN);

  /** @type {import('express').CookieOptions} */
  const options = {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    path: '/',
    maxAge
  };

  if (env.COOKIE_DOMAIN && env.COOKIE_DOMAIN.trim() !== '') {
    options.domain = env.COOKIE_DOMAIN.trim();
  }

  return options;
}

/**
 * Generates options for clearing the authentication cookie upon logout.
 * Must strictly match path, domain, sameSite, and secure attributes of the setter.
 * @returns {import('express').CookieOptions}
 */
export function getClearAuthCookieOptions() {
  const options = getAuthCookieOptions();
  // For clearing, omit maxAge and set maxAge to 0 / expires to epoch
  delete options.maxAge;
  return {
    ...options,
    expires: new Date(0)
  };
}


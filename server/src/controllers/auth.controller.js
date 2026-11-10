import { AuthService } from '../services/auth.service.js';
import { ApiResponse } from '../utils/api-response.js';
import {
  AUTH_COOKIE_NAME,
  getAuthCookieOptions,
  getClearAuthCookieOptions
} from '../utils/cookie-options.js';

export class AuthController {
  /**
   * Handle user signup and Space registration.
   */
  static async signup(req, res) {
    const result = await AuthService.signup(req.body);
    return ApiResponse.created(
      res,
      'User and Space registered successfully. Please sign in.',
      result
    );
  }

  /**
   * Handle user signin, sets HttpOnly authentication cookie.
   */
  static async signin(req, res) {
    const { token, user, space } = await AuthService.signin(req.body);

    // Set secure HttpOnly cookie
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    // Do NOT return JWT in JSON response
    return ApiResponse.success(res, 'Signed in successfully', {
      user,
      space
    });
  }

  /**
   * Handle user logout, revokes session and clears cookie.
   */
  static async logout(req, res) {
    const token = req.cookies?.[AUTH_COOKIE_NAME];
    await AuthService.logout(token);

    // Clear authentication cookie with identical path, domain, sameSite & secure settings
    res.clearCookie(AUTH_COOKIE_NAME, getClearAuthCookieOptions());

    return ApiResponse.success(res, 'Logged out successfully', {});
  }

  /**
   * Return currently authenticated user and their Space.
   */
  static async getMe(req, res) {
    const user = {
      id: req.user._id.toString(),
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      createdAt: req.user.createdAt
    };

    const space = {
      id: req.space._id.toString(),
      name: req.space.name,
      slug: req.space.slug
    };

    return ApiResponse.success(res, 'User fetched successfully', {
      user,
      space
    });
  }
}


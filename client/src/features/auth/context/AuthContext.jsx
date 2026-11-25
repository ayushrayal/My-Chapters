import { createContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/auth.api.js';
import { parseApiError } from '../../../utils/error-handler.js';
import { clearUserQueries } from '../../../lib/queryClient.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [space, setSpace] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState(null);

  /**
   * Initializes or refreshes authentication context from backend session.
   */
  const getMe = useCallback(async () => {
    try {
      setInitError(null);
      const res = await authApi.getMe();
      if (res?.success && res?.data) {
        setUser(res.data.user);
        setSpace(res.data.space);
        setIsAuthenticated(true);
        return res.data;
      }
      throw new Error('Invalid authentication response');
    } catch (err) {
      const parsed = parseApiError(err);

      if (parsed.status === 401 || parsed.status === 403) {
        // Confirmed unauthenticated (no active session / expired)
        setUser(null);
        setSpace(null);
        setIsAuthenticated(false);
      } else {
        // Unexpected server or network failure
        setInitError(parsed.message);
        setUser(null);
        setSpace(null);
        setIsAuthenticated(false);
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load check on mount
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        await getMe();
      } catch {
        // Errors handled inside getMe
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [getMe]);

  /**
   * Sign in user and update context.
   */
  const signin = async (credentials) => {
    const res = await authApi.signin(credentials);
    if (res?.success && res?.data) {
      setUser(res.data.user);
      setSpace(res.data.space);
      setIsAuthenticated(true);
      setInitError(null);
      return res.data;
    }
    throw new Error(res?.message || 'Failed to sign in');
  };

  /**
   * Register new Admin user and Space.
   * Does NOT auto-login as per Phase 1 backend specification.
   */
  const signup = async (payload) => {
    const res = await authApi.signup(payload);
    return res;
  };

  /**
   * Logout user, revokes session and clears local authentication state.
   */
  const logout = async () => {
    let logoutWarning = null;
    try {
      await authApi.logout();
    } catch (err) {
      // Even if network/server fails, client must clear local state
      const parsed = parseApiError(err);
      logoutWarning = `Server-side session revocation could not be confirmed: ${parsed.message}`;
    } finally {
      setUser(null);
      setSpace(null);
      setIsAuthenticated(false);
      clearUserQueries();
    }

    if (logoutWarning) {
      return { warning: logoutWarning };
    }
    return { success: true };
  };

  const value = {
    user,
    space,
    isAuthenticated,
    isLoading,
    initError,
    signup,
    signin,
    logout,
    getMe
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


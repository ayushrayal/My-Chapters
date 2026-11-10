import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../context/AuthContext.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { authApi } from '../services/auth.api.js';

function TestConsumer() {
  const { user, space, isAuthenticated, isLoading, initError } = useAuth();
  if (isLoading) return <div>Loading Auth...</div>;
  if (initError) return <div>Error: {initError}</div>;
  return (
    <div>
      <div>Status: {isAuthenticated ? 'AUTHENTICATED' : 'ANONYMOUS'}</div>
      {user && <div>User: {user.username}</div>}
      {space && <div>Space: {space.name}</div>}
    </div>
  );
}

describe('AuthContext & useAuth Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes as authenticated when GET /api/auth/me succeeds', async () => {
    vi.spyOn(authApi, 'getMe').mockResolvedValueOnce({
      success: true,
      message: 'User fetched successfully',
      data: {
        user: { id: 'u1', username: 'ayush', email: 'ayush@example.com', role: 'ADMIN' },
        space: { id: 's1', name: 'My Space', slug: 'my-space' }
      }
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByText('Loading Auth...')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Status: AUTHENTICATED')).toBeDefined();
      expect(screen.getByText('User: ayush')).toBeDefined();
      expect(screen.getByText('Space: My Space')).toBeDefined();
    });
  });

  it('initializes as unauthenticated when GET /api/auth/me returns 401 Unauthorized', async () => {
    vi.spyOn(authApi, 'getMe').mockRejectedValueOnce({
      response: {
        status: 401,
        data: {
          success: false,
          message: 'Authentication required. No session cookie provided.'
        }
      }
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Status: ANONYMOUS')).toBeDefined();
    });
  });

  it('records initError when server returns 500 without treating as confirmed normal logout', async () => {
    vi.spyOn(authApi, 'getMe').mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          success: false,
          message: 'Internal server error'
        }
      }
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Error: Internal server error/i)).toBeDefined();
    });
  });
});

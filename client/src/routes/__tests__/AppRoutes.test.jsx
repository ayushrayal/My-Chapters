import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../AppRoutes.jsx';
import * as authHook from '../../features/auth/hooks/useAuth.js';

describe('AppRoutes & Route Protection', () => {
  it('redirects unauthenticated users trying to access /dashboard to /signin', async () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: null,
      space: null,
      isAuthenticated: false,
      isLoading: false
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { level: 2, name: /welcome back/i })).toBeDefined();
    expect(await screen.findByLabelText(/email or username/i)).toBeDefined();
  });

  it('redirects unauthenticated users trying to access /profile to /signin', async () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: null,
      space: null,
      isAuthenticated: false,
      isLoading: false
    });

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { level: 2, name: /welcome back/i })).toBeDefined();
  });

  it('redirects unauthenticated users trying to access /someday to /signin', async () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: null,
      space: null,
      isAuthenticated: false,
      isLoading: false
    });

    render(
      <MemoryRouter initialEntries={['/someday']}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { level: 2, name: /welcome back/i })).toBeDefined();
  });

  it('redirects authenticated users visiting /signin to /dashboard', async () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: { id: 'u1', username: 'ayush', email: 'ayush@example.com', role: 'ADMIN' },
      space: { id: 's1', name: 'My Space', slug: 'my-space' },
      isAuthenticated: true,
      isLoading: false
    });

    render(
      <MemoryRouter initialEntries={['/signin']}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Hello, Welcome ayush!' }, { timeout: 4000 })).toBeDefined();
  });

  it('redirects authenticated users visiting /signup to /dashboard', async () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: { id: 'u1', username: 'ayush', email: 'ayush@example.com', role: 'ADMIN' },
      space: { id: 's1', name: 'My Space', slug: 'my-space' },
      isAuthenticated: true,
      isLoading: false
    });

    render(
      <MemoryRouter initialEntries={['/signup']}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Hello, Welcome ayush!' }, { timeout: 4000 })).toBeDefined();
  });

  it('renders Profile page when authenticated user visits /profile', async () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: { id: 'u1', username: 'ayush', email: 'ayush@example.com', role: 'ADMIN' },
      space: { id: 's1', name: 'My Space', slug: 'my-space' },
      isAuthenticated: true,
      isLoading: false
    });

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'ayush' }, { timeout: 4000 })).toBeDefined();
    expect(await screen.findByText('Personal Space & Profile Details')).toBeDefined();
  });

  it('displays 404 page for unknown routes', async () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: null,
      space: null,
      isAuthenticated: false,
      isLoading: false
    });

    render(
      <MemoryRouter initialEntries={['/some/unknown/route']}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByText(/404 — Page Not Found/i)).toBeDefined();
    expect(await screen.findByRole('link', { name: /return to dashboard/i })).toBeDefined();
  });
});

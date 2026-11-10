import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Dashboard } from '../pages/Dashboard.jsx';
import * as authHook from '../../auth/hooks/useAuth.js';

describe('Dashboard Page Component', () => {
  it('renders welcome greeting with username and real account details', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: {
        id: 'u123',
        username: 'ayush',
        email: 'ayush@example.com',
        role: 'ADMIN',
        createdAt: '2026-11-10T12:00:00.000Z'
      },
      space: {
        id: 's123',
        name: 'My Personal World',
        slug: 'my-personal-world'
      },
      isAuthenticated: true,
      isLoading: false
    });

    render(<Dashboard />);

    // Welcome greeting dynamically shows "Hello, Welcome {username}!"
    expect(screen.getByRole('heading', { level: 1, name: 'Hello, Welcome ayush!' })).toBeDefined();

    // Account & Space details from GET /api/auth/me
    expect(screen.getByText('My Personal World')).toBeDefined();
    expect(screen.getByText('my-personal-world')).toBeDefined();
    expect(screen.getByText('ayush@example.com')).toBeDefined();
    expect(screen.getByText('ADMIN')).toBeDefined();
  });
});


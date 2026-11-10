import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Profile } from '../pages/Profile.jsx';
import * as authHook from '../../auth/hooks/useAuth.js';

describe('Profile Page Component', () => {
  it('renders authenticated user profile and Space information', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: {
        id: 'u456',
        username: 'ayush_admin',
        email: 'ayush@example.com',
        role: 'ADMIN',
        createdAt: '2026-11-10T12:00:00.000Z'
      },
      space: {
        id: 's456',
        name: 'Ayush Personal Space',
        slug: 'ayush-personal-space'
      },
      isAuthenticated: true,
      isLoading: false
    });

    render(<Profile />);

    // Header avatar & profile identity
    expect(screen.getByText('A')).toBeDefined();
    expect(screen.getByRole('heading', { level: 1, name: 'ayush_admin' })).toBeDefined();
    expect(screen.getAllByText('ayush@example.com').length).toBe(2);

    // Space & Account details
    expect(screen.getByText('Ayush Personal Space')).toBeDefined();
    expect(screen.getByText('ayush-personal-space')).toBeDefined();
    expect(screen.getAllByText('ADMIN').length).toBe(2);
  });
});

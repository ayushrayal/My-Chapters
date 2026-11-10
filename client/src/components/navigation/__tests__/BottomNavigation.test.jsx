import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { BottomNavigation } from '../BottomNavigation.jsx';

describe('BottomNavigation Component', () => {
  it('renders Home and Profile navigation links', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <BottomNavigation />
      </MemoryRouter>
    );

    const nav = screen.getByRole('navigation', { name: /mobile navigation/i });
    expect(nav).toBeDefined();

    const homeLink = screen.getByRole('link', { name: /home/i });
    const profileLink = screen.getByRole('link', { name: /profile/i });

    expect(homeLink).toBeDefined();
    expect(profileLink).toBeDefined();
    expect(homeLink.getAttribute('href')).toBe('/dashboard');
    expect(profileLink.getAttribute('href')).toBe('/profile');
  });

  it('marks Home as active when on /dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <BottomNavigation />
      </MemoryRouter>
    );

    const homeLink = screen.getByRole('link', { name: /home/i });
    const profileLink = screen.getByRole('link', { name: /profile/i });

    expect(homeLink.className).toContain('mobile-bottom-nav__item--active');
    expect(profileLink.className).not.toContain('mobile-bottom-nav__item--active');
  });

  it('marks Profile as active when on /profile', () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <BottomNavigation />
      </MemoryRouter>
    );

    const homeLink = screen.getByRole('link', { name: /home/i });
    const profileLink = screen.getByRole('link', { name: /profile/i });

    expect(profileLink.className).toContain('mobile-bottom-nav__item--active');
    expect(homeLink.className).not.toContain('mobile-bottom-nav__item--active');
  });
});


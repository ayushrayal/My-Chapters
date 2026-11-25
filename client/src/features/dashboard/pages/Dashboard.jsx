import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { somedayApi } from '../../someday/services/someday.api.js';
import { queryClient } from '../../../lib/queryClient.js';
import { queryKeys } from '../../../lib/queryKeys.js';

function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Dashboard() {
  const { user, space } = useAuth();
  const spaceId = space?.id;

  // Cached Someday items/stats query to compute overview stats with zero lag
  const { data: rawStats = null, isLoading: isLoadingStats } = useQuery(
    {
      queryKey: queryKeys.someday.allItems(spaceId),
      queryFn: async () => {
        try {
          return await somedayApi.getStats();
        } catch {
          return { total: 0, planned: 0, purchased: 0 };
        }
      },
      staleTime: 60 * 1000,
      enabled: Boolean(spaceId)
    },
    queryClient
  );

  const stats = useMemo(() => {
    if (Array.isArray(rawStats)) {
      const total = rawStats.length;
      const planned = rawStats.filter((i) => i.status === 'PLANNED').length;
      const purchased = rawStats.filter((i) => i.status === 'PURCHASED').length;
      return { total, planned, purchased };
    }
    return {
      total: Number(rawStats?.total) || 0,
      planned: Number(rawStats?.planned) || 0,
      purchased: Number(rawStats?.purchased) || 0
    };
  }, [rawStats]);

  const greeting = getTimeBasedGreeting();
  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'N/A';

  return (
    <div className="dashboard-page">
      {/* 1. Hero Card in Primary Gradient with Time-Based Greeting and Subtle Pattern */}
      <section className="dashboard-hero" aria-labelledby="welcome-heading">
        <div className="dashboard-hero__pattern" aria-hidden="true">
          <svg className="dashboard-hero__svg" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hero-dots" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="rgba(255, 255, 255, 0.12)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-dots)" />
          </svg>
          <div className="dashboard-hero__glow dashboard-hero__glow--one" />
          <div className="dashboard-hero__glow dashboard-hero__glow--two" />
        </div>

        <div className="dashboard-hero__content">
          <div className="dashboard-hero__tag">
            <span className="dashboard-hero__tag-dot" aria-hidden="true" />
            <span className="dashboard-hero__tag-text">Space &bull; {space?.name || 'My Space'}</span>
          </div>

          <h1
            id="welcome-heading"
            className="dashboard-hero__greeting"
            aria-label={`Hello, Welcome ${user?.username || 'User'}!`}
          >
            {greeting}, {user?.username}!
          </h1>

          <p className="dashboard-hero__subtitle">
            Your personal life documentation platform is active. Document decisions, milestones, and memories.
          </p>
        </div>
      </section>

      {/* 2. Stats Row with Quick Cards & Lime Accents */}
      <section className="dashboard-stats" aria-label="Someday Overview Statistics">
        <a href="/someday" className="stat-card">
          <div className="stat-card__icon-wrap stat-card__icon-wrap--primary" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div className="stat-card__content">
            <span className="stat-card__label">Total Someday Items</span>
            <div className="stat-card__value-row">
              <span className="stat-card__value">{isLoadingStats ? '-' : stats.total}</span>
              <span className="stat-card__accent-dot" title="Active feature" />
            </div>
          </div>
        </a>

        <a href="/someday" className="stat-card">
          <div className="stat-card__icon-wrap stat-card__icon-wrap--planned" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 14 14" />
            </svg>
          </div>
          <div className="stat-card__content">
            <span className="stat-card__label">Planned Items</span>
            <div className="stat-card__value-row">
              <span className="stat-card__value">{isLoadingStats ? '-' : stats.planned}</span>
              <span className="stat-card__status-chip stat-card__status-chip--planned">Planned</span>
            </div>
          </div>
        </a>

        <a href="/someday" className="stat-card">
          <div className="stat-card__icon-wrap stat-card__icon-wrap--purchased" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="stat-card__content">
            <span className="stat-card__label">Purchased Items</span>
            <div className="stat-card__value-row">
              <span className="stat-card__value">{isLoadingStats ? '-' : stats.purchased}</span>
              <span className="stat-card__status-chip stat-card__status-chip--purchased">Purchased</span>
            </div>
          </div>
        </a>
      </section>

      {/* 3. Account & Space Overview: Compact Info Grid with Icons & Lime Role Chip */}
      <section className="account-card" aria-labelledby="account-details-heading">
        <header className="account-card__header">
          <div className="account-card__header-left">
            <h2 id="account-details-heading" className="account-card__title">
              Account & Space Overview
            </h2>
            <p className="account-card__header-desc">
              Your single-tenant space parameters and authentication status.
            </p>
          </div>
          <span className="account-card__role-chip" title="Account Role">
            {user?.role || 'ADMIN'}
          </span>
        </header>

        <div className="account-card__grid">
          <div className="account-card__item">
            <div className="account-card__icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div className="account-card__item-content">
              <span className="account-card__label">Personal Space</span>
              <span className="account-card__value">{space?.name || 'My Space'}</span>
            </div>
          </div>

          <div className="account-card__item">
            <div className="account-card__icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <div className="account-card__item-content">
              <span className="account-card__label">Space Slug</span>
              <span className="account-card__value text-muted">{space?.slug || 'my-space'}</span>
            </div>
          </div>

          <div className="account-card__item">
            <div className="account-card__icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="account-card__item-content">
              <span className="account-card__label">Username</span>
              <span className="account-card__value">{user?.username}</span>
            </div>
          </div>

          <div className="account-card__item">
            <div className="account-card__icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div className="account-card__item-content">
              <span className="account-card__label">Email Address</span>
              <span className="account-card__value">{user?.email}</span>
            </div>
          </div>

          <div className="account-card__item">
            <div className="account-card__icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="account-card__item-content">
              <span className="account-card__label">Member Since</span>
              <span className="account-card__value">{formattedDate}</span>
            </div>
          </div>

          <div className="account-card__item">
            <div className="account-card__icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div className="account-card__item-content">
              <span className="account-card__label">Session Status</span>
              <span className="account-card__value font-medium" style={{ color: '#16a34a' }}>
                Active (HttpOnly Cookie)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Tasteful Empty / "Recent Activity" Section Placeholder */}
      <section className="dashboard-activity" aria-labelledby="activity-heading">
        <div className="activity-card">
          <div className="activity-card__header">
            <h2 id="activity-heading" className="activity-card__title">
              Recent Activity
            </h2>
            <a href="/someday" className="activity-card__view-link">
              View Collection &rarr;
            </a>
          </div>

          <div className="activity-card__placeholder">
            <div className="activity-card__placeholder-icon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8v4l3 3" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <h3 className="activity-card__placeholder-title">Your personal chronicle is just beginning</h3>
            <p className="activity-card__placeholder-desc">
              As you document life chapters, record reflections, and track Someday milestones, your timeline will come to life right here.
            </p>
            <a href="/someday" className="activity-card__cta-btn">
              Explore Someday Tracker
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}


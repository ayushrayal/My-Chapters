import { useState } from 'react';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { useToast } from '../../../context/ToastContext.jsx';

export function Profile() {
  const { user, space } = useAuth();
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState(null);

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'N/A';

  const handleCopy = (text, key, label = 'Copied to clipboard!') => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    toast?.success?.(label);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const initial = user?.username ? user.username.charAt(0).toUpperCase() : 'U';

  return (
    <div className="profile-page">
      {/* 1. Profile Banner Header with Gradient Cover and Overlapping Avatar */}
      <section className="profile-hero-card" aria-labelledby="profile-title">
        <div className="profile-hero-card__cover" aria-hidden="true">
          <div className="profile-hero-card__cover-shape profile-hero-card__cover-shape--one" />
          <div className="profile-hero-card__cover-shape profile-hero-card__cover-shape--two" />
        </div>

        <div className="profile-hero-card__body">
          <div className="profile-hero-card__avatar-wrap">
            <div className="profile-header-card__avatar" aria-hidden="true">
              {initial}
            </div>
          </div>

          <div className="profile-hero-card__identity">
            <div className="profile-hero-card__meta">
              <h1 id="profile-title" className="profile-header-card__name">
                {user?.username}
              </h1>
              <p className="profile-header-card__email">{user?.email}</p>
            </div>

            <span className="profile-header-card__badge" title="User Role">
              {user?.role || 'ADMIN'}
            </span>
          </div>
        </div>
      </section>

      {/* 2. Account Details: Clean Two-Column Grid of Labeled Rows with Copy Buttons */}
      <section className="account-card" aria-labelledby="account-info-title">
        <header className="account-card__header">
          <div>
            <h2 id="account-info-title" className="account-card__title">
              Personal Space & Profile Details
            </h2>
            <p className="account-card__header-desc">
              Core credentials and tenancy configuration for your private workspace.
            </p>
          </div>
        </header>

        <div className="account-card__grid profile-details-grid">
          {/* Row 1: Space Name */}
          <div className="account-card__item profile-detail-row">
            <div className="account-card__icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div className="account-card__item-content">
              <span className="account-card__label">Personal Space Name</span>
              <span className="account-card__value">{space?.name || 'My Space'}</span>
            </div>
          </div>

          {/* Row 2: Space URL Slug with Copy Button */}
          <div className="account-card__item profile-detail-row">
            <div className="account-card__icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <div className="account-card__item-content">
              <span className="account-card__label">Space URL Slug</span>
              <div className="profile-detail-row__value-wrap">
                <span className="account-card__value text-muted">{space?.slug || 'my-space'}</span>
                <button
                  type="button"
                  className="profile-copy-btn"
                  onClick={() => handleCopy(space?.slug, 'slug', 'Space URL slug copied to clipboard!')}
                  aria-label="Copy Space URL slug"
                  title="Copy slug to clipboard"
                >
                  {copiedKey === 'slug' ? (
                    <span className="profile-copy-btn__copied">Copied!</span>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Row 3: Username */}
          <div className="account-card__item profile-detail-row">
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

          {/* Row 4: Email Address with Copy Button */}
          <div className="account-card__item profile-detail-row">
            <div className="account-card__icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div className="account-card__item-content">
              <span className="account-card__label">Email Address</span>
              <div className="profile-detail-row__value-wrap">
                <span className="account-card__value">{user?.email}</span>
                <button
                  type="button"
                  className="profile-copy-btn"
                  onClick={() => handleCopy(user?.email, 'email', 'Email address copied to clipboard!')}
                  aria-label="Copy email address"
                  title="Copy email to clipboard"
                >
                  {copiedKey === 'email' ? (
                    <span className="profile-copy-btn__copied">Copied!</span>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Row 5: Account Role */}
          <div className="account-card__item profile-detail-row">
            <div className="account-card__icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className="account-card__item-content">
              <span className="account-card__label">Account Role</span>
              <span className="account-card__value font-medium">{user?.role || 'ADMIN'}</span>
            </div>
          </div>

          {/* Row 6: Member Since */}
          <div className="account-card__item profile-detail-row">
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
        </div>
      </section>
    </div>
  );
}


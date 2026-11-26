import { useState } from 'react';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { WindowCard } from '../../../components/common/WindowCard.jsx';

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
    <div className="profile-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Flat Primary Blue banner with 3px border, 96px avatar block (10px radius) overlapping banner */}
      <section className="profile-hero-card" aria-labelledby="profile-title" style={{ position: 'relative' }}>
        <div
          style={{
            height: '110px',
            backgroundColor: '#3A4EFB',
            border: '3px solid #252943',
            borderRadius: '10px 10px 0 0',
            boxShadow: '4px 4px 0 #252943',
            position: 'relative'
          }}
        />

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '3px solid #252943',
            borderTop: 'none',
            borderRadius: '0 0 10px 10px',
            boxShadow: '4px 4px 0 #252943',
            padding: '16px 20px 20px',
            position: 'relative'
          }}
        >
          {/* Overlapping 96px block avatar */}
          <div
            style={{
              position: 'absolute',
              top: '-48px',
              left: '20px',
              width: '96px',
              height: '96px',
              backgroundColor: '#E3FF3B',
              color: '#252943',
              border: '3px solid #252943',
              borderRadius: '10px',
              boxShadow: '4px 4px 0 #252943',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              fontWeight: 800,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              zIndex: 10
            }}
            aria-hidden="true"
          >
            {initial}
          </div>

          {/* User identity & sticker */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              paddingLeft: '112px',
              minHeight: '52px'
            }}
          >
            <div>
              <h1
                id="profile-title"
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  margin: 0,
                  color: '#252943',
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em'
                }}
              >
                {user?.username}
              </h1>
              <p style={{ fontSize: '14px', color: 'rgba(37,41,67,0.7)', margin: '4px 0 0', fontWeight: 500 }}>
                {user?.email}
              </p>
            </div>

            <span className="neo-sticker" title="User Role">
              {user?.role || 'ADMIN'}
            </span>
          </div>
        </div>
      </section>

      {/* 2. Account Details: WindowCard with 1-col (mobile) / 2-col (desktop) grid of detail tiles */}
      <WindowCard
        title="Personal Space & Profile Details"
        headerBg="canvas"
        action={
          <span className="neo-tag neo-tag--lime">
            ACTIVE SPACE
          </span>
        }
      >
        <p style={{ fontSize: '13px', color: 'rgba(37,41,67,0.7)', margin: '0 0 16px 0' }}>
          Core credentials and tenancy configuration for your private workspace.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '14px'
          }}
        >
          {/* Row 1: Space Name */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              border: '2px solid #252943',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              boxShadow: '2px 2px 0 #252943'
            }}
          >
            <div style={{ width: '40px', height: '40px', borderRadius: '6px', backgroundColor: '#E3FF3B', border: '2px solid #252943', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#252943" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(37,41,67,0.7)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>PERSONAL SPACE NAME</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#252943', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {space?.name || 'My Space'}
              </span>
            </div>
          </div>

          {/* Row 2: Space URL Slug with Copy Button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '12px',
              border: '2px solid #252943',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              boxShadow: '2px 2px 0 #252943'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '6px', backgroundColor: '#33A4FA', border: '2px solid #252943', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#252943" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(37,41,67,0.7)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>SPACE URL SLUG</span>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#252943', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {space?.slug || 'my-space'}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn--sm btn--secondary"
              style={{ width: '44px', height: '44px', minHeight: '44px', padding: 0, flexShrink: 0 }}
              onClick={() => handleCopy(space?.slug, 'slug', 'Space URL slug copied to clipboard!')}
              aria-label="Copy Space URL slug"
              title="Copy slug to clipboard"
            >
              {copiedKey === 'slug' ? (
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#168B68' }}>✓</span>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#252943" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </div>

          {/* Row 3: Username */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              border: '2px solid #252943',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              boxShadow: '2px 2px 0 #252943'
            }}
          >
            <div style={{ width: '40px', height: '40px', borderRadius: '6px', backgroundColor: '#E3FF3B', border: '2px solid #252943', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#252943" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(37,41,67,0.7)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>USERNAME</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#252943', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.username}
              </span>
            </div>
          </div>

          {/* Row 4: Email Address with Copy Button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '12px',
              border: '2px solid #252943',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              boxShadow: '2px 2px 0 #252943'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '6px', backgroundColor: '#33A4FA', border: '2px solid #252943', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#252943" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(37,41,67,0.7)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>EMAIL ADDRESS</span>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#252943', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn--sm btn--secondary"
              style={{ width: '44px', height: '44px', minHeight: '44px', padding: 0, flexShrink: 0 }}
              onClick={() => handleCopy(user?.email, 'email', 'Email address copied to clipboard!')}
              aria-label="Copy email address"
              title="Copy email to clipboard"
            >
              {copiedKey === 'email' ? (
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#168B68' }}>✓</span>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#252943" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </div>

          {/* Row 5: Account Role */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              border: '2px solid #252943',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              boxShadow: '2px 2px 0 #252943'
            }}
          >
            <div style={{ width: '40px', height: '40px', borderRadius: '6px', backgroundColor: '#E3FF3B', border: '2px solid #252943', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#252943" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(37,41,67,0.7)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ACCOUNT ROLE</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#252943' }}>
                {user?.role || 'ADMIN'}
              </span>
            </div>
          </div>

          {/* Row 6: Member Since */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              border: '2px solid #252943',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              boxShadow: '2px 2px 0 #252943'
            }}
          >
            <div style={{ width: '40px', height: '40px', borderRadius: '6px', backgroundColor: '#DEE0ED', border: '2px solid #252943', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#252943" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(37,41,67,0.7)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>MEMBER SINCE</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#252943' }}>
                {formattedDate}
              </span>
            </div>
          </div>
        </div>
      </WindowCard>
    </div>
  );
}

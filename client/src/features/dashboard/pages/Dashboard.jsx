import { useAuth } from '../../auth/hooks/useAuth.js';

export function Dashboard() {
  const { user, space } = useAuth();

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'N/A';

  return (
    <div>
      {/* Main Welcome Section */}
      <section className="welcome-section" aria-labelledby="welcome-heading">
        <h1 id="welcome-heading" className="welcome-section__greeting">
          Hello, Welcome {user?.username}!
        </h1>
        <p className="welcome-section__tagline">
          Your personal life documentation platform is active.
        </p>
      </section>

      {/* Account & Space Details Card */}
      <section className="account-card" aria-labelledby="account-details-heading">
        <header className="account-card__header">
          <h2 id="account-details-heading" className="account-card__title">
            Account & Space Overview
          </h2>
          <span className="account-card__badge" title="Account Role">
            {user?.role || 'ADMIN'}
          </span>
        </header>

        <div className="account-card__grid">
          <div className="account-card__item">
            <span className="account-card__label">Personal Space</span>
            <span className="account-card__value">{space?.name || 'My Space'}</span>
          </div>

          <div className="account-card__item">
            <span className="account-card__label">Space Slug</span>
            <span className="account-card__value text-muted">
              {space?.slug || 'my-space'}
            </span>
          </div>

          <div className="account-card__item">
            <span className="account-card__label">Username</span>
            <span className="account-card__value">{user?.username}</span>
          </div>

          <div className="account-card__item">
            <span className="account-card__label">Email Address</span>
            <span className="account-card__value">{user?.email}</span>
          </div>

          <div className="account-card__item">
            <span className="account-card__label">Member Since</span>
            <span className="account-card__value">{formattedDate}</span>
          </div>

          <div className="account-card__item">
            <span className="account-card__label">Session Status</span>
            <span className="account-card__value font-medium" style={{ color: '#16a34a' }}>
              Active (HttpOnly Cookie)
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

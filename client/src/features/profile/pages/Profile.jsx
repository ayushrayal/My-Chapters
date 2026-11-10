import { useAuth } from '../../auth/hooks/useAuth.js';

export function Profile() {
  const { user, space } = useAuth();

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'N/A';

  return (
    <div className="profile-page">
      {/* Profile Header Card */}
      <section className="profile-header-card" aria-labelledby="profile-title">
        <div className="profile-header-card__avatar" aria-hidden="true">
          {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
        </div>
        <div className="profile-header-card__info">
          <h1 id="profile-title" className="profile-header-card__name">
            {user?.username}
          </h1>
          <p className="profile-header-card__email">{user?.email}</p>
        </div>
        <span className="profile-header-card__badge" title="User Role">
          {user?.role || 'ADMIN'}
        </span>
      </section>

      {/* Account Details Card */}
      <section className="account-card" aria-labelledby="account-info-title">
        <header className="account-card__header">
          <h2 id="account-info-title" className="account-card__title">
            Personal Space & Profile Details
          </h2>
        </header>

        <div className="account-card__grid">
          <div className="account-card__item">
            <span className="account-card__label">Personal Space Name</span>
            <span className="account-card__value">{space?.name || 'My Space'}</span>
          </div>

          <div className="account-card__item">
            <span className="account-card__label">Space URL Slug</span>
            <span className="account-card__value text-muted">{space?.slug || 'my-space'}</span>
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
            <span className="account-card__label">Account Role</span>
            <span className="account-card__value font-medium">{user?.role || 'ADMIN'}</span>
          </div>

          <div className="account-card__item">
            <span className="account-card__label">Member Since</span>
            <span className="account-card__value">{formattedDate}</span>
          </div>
        </div>
      </section>
    </div>
  );
}


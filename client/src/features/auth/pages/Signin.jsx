import { Link } from 'react-router-dom';
import { SigninForm } from '../components/SigninForm.jsx';

export function Signin() {
  return (
    <div className="auth-page-view auth-page-view--signin">
      <div className="auth-card__header">
        <h2 className="auth-card__title">Welcome Back</h2>
        <p className="auth-card__subtitle">
          Sign in to access your personal space.
        </p>
      </div>

      <SigninForm />

      <footer className="auth-card__footer">
        <span>Don&apos;t have a Space yet?</span>
        <Link to="/signup" className="auth-card__link">Register with Access Code</Link>
      </footer>
    </div>
  );
}


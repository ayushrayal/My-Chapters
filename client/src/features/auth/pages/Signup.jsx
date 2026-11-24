import { Link } from 'react-router-dom';
import { SignupForm } from '../components/SignupForm.jsx';

export function Signup() {
  return (
    <div className="auth-page-view auth-page-view--signup">
      <div className="auth-card__header">
        <h2 className="auth-card__title">Create your Space</h2>
        <p className="auth-card__subtitle">
          Set up your personal life documentation space as an Admin.
        </p>
      </div>

      <SignupForm />

      <footer className="auth-card__footer">
        <span>Already have a Space?</span>
        <Link to="/signin" className="auth-card__link">Sign In</Link>
      </footer>
    </div>
  );
}


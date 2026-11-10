import { Link } from 'react-router-dom';
import { SignupForm } from '../components/SignupForm.jsx';

export function Signup() {
  return (
    <>
      <h2 className="auth-card__title">Create your Space</h2>
      <p className="auth-card__subtitle">
        Set up your personal life documentation space as an Admin.
      </p>

      <SignupForm />

      <footer className="auth-card__footer">
        Already have a Space?
        <Link to="/signin">Sign In</Link>
      </footer>
    </>
  );
}


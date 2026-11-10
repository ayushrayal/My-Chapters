import { Link } from 'react-router-dom';
import { SigninForm } from '../components/SigninForm.jsx';

export function Signin() {
  return (
    <>
      <h2 className="auth-card__title">Welcome Back</h2>
      <p className="auth-card__subtitle">
        Sign in to access your personal space.
      </p>

      <SigninForm />

      <footer className="auth-card__footer">
        Don&apos;t have a Space yet?
        <Link to="/signup">Register with Access Code</Link>
      </footer>
    </>
  );
}

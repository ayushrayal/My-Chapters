import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { Input } from '../../../components/common/Input.jsx';
import { Button } from '../../../components/common/Button.jsx';
import { parseApiError } from '../../../utils/error-handler.js';

export function SigninForm() {
  const { signin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Pre-fill identifier or notice if redirected from successful signup
  const redirectMessage = location.state?.message;
  const initialIdentifier = location.state?.identifier || '';

  const [formData, setFormData] = useState({
    identifier: initialIdentifier,
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.identifier.trim()) {
      newErrors.identifier = 'Please enter your email or username';
    }

    if (!formData.password) {
      newErrors.password = 'Please enter your password';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setServerError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await signin({
        identifier: formData.identifier.trim(),
        password: formData.password
      });

      // Browser automatically received HttpOnly cookie; context updated
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      const parsed = parseApiError(err);
      setServerError(parsed.message);

      if (parsed.fieldErrors && Object.keys(parsed.fieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...parsed.fieldErrors }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="auth-card__form" onSubmit={handleSubmit} noValidate>
      {redirectMessage && !serverError && (
        <div className="alert alert--success" role="status">
          <div className="alert__content">
            <p>{redirectMessage}</p>
          </div>
        </div>
      )}

      {serverError && (
        <div className="alert alert--error" role="alert">
          <div className="alert__content">
            <p className="alert__title">Sign In Failed</p>
            <p>{serverError}</p>
          </div>
        </div>
      )}

      <Input
        label="Email or Username"
        id="identifier"
        name="identifier"
        type="text"
        icon="user"
        placeholder="Enter your email or username"
        value={formData.identifier}
        onChange={handleChange}
        error={errors.identifier}
        autoComplete="username"
        required
        disabled={isSubmitting}
      />

      <Input
        label="Password"
        id="password"
        name="password"
        type="password"
        icon="lock"
        placeholder="Enter your password"
        value={formData.password}
        onChange={handleChange}
        error={errors.password}
        visibilityToggle
        autoComplete="current-password"
        required
        disabled={isSubmitting}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isFullWidth
        isLoading={isSubmitting}
      >
        Sign In
      </Button>
    </form>
  );
}


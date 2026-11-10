import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { Input } from '../../../components/common/Input.jsx';
import { Button } from '../../../components/common/Button.jsx';
import { parseApiError } from '../../../utils/error-handler.js';

const USERNAME_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9_-]*[a-zA-Z0-9])?$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;

export function SignupForm() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    spaceName: '',
    accessCode: ''
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    // 1. Username
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.trim().length < 3 || formData.username.trim().length > 30) {
      newErrors.username = 'Username must be between 3 and 30 characters';
    } else if (!USERNAME_REGEX.test(formData.username.trim())) {
      newErrors.username = 'Username can contain letters, numbers, hyphens, and underscores';
    }

    // 2. Email
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    // 3. Password
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    } else if (!PASSWORD_REGEX.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    // 4. Space Name
    if (!formData.spaceName.trim()) {
      newErrors.spaceName = 'Space name is required';
    } else if (formData.spaceName.trim().length < 2 || formData.spaceName.trim().length > 50) {
      newErrors.spaceName = 'Space name must be between 2 and 50 characters';
    }

    // 5. Access Code
    if (!formData.accessCode.trim()) {
      newErrors.accessCode = 'Access code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field-specific error as user types
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
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signup({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        spaceName: formData.spaceName.trim(),
        accessCode: formData.accessCode.trim()
      });

      setSuccessMessage(result?.message || 'Registration successful! Redirecting to sign in...');

      // Redirect to signin page after short delay so user can read confirmation
      setTimeout(() => {
        navigate('/signin', {
          state: {
            message: 'Your Space and Admin account have been created. Please sign in.',
            identifier: formData.username.trim()
          }
        });
      }, 1500);
    } catch (err) {
      const parsed = parseApiError(err);
      setServerError(parsed.message);

      // Merge backend field-level errors if provided
      if (parsed.fieldErrors && Object.keys(parsed.fieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...parsed.fieldErrors }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="auth-card__form" onSubmit={handleSubmit} noValidate>
      {serverError && (
        <div className="alert alert--error" role="alert">
          <div className="alert__content">
            <p className="alert__title">Registration Failed</p>
            <p>{serverError}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="alert alert--success" role="status">
          <div className="alert__content">
            <p className="alert__title">Success!</p>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      <Input
        label="Username"
        id="username"
        name="username"
        type="text"
        placeholder="e.g. ayush"
        value={formData.username}
        onChange={handleChange}
        error={errors.username}
        autoComplete="username"
        required
        disabled={isSubmitting}
      />

      <Input
        label="Email Address"
        id="email"
        name="email"
        type="email"
        placeholder="you@example.com"
        value={formData.email}
        onChange={handleChange}
        error={errors.email}
        autoComplete="email"
        required
        disabled={isSubmitting}
      />

      <Input
        label="Password"
        id="password"
        name="password"
        type="password"
        placeholder="At least 8 characters"
        value={formData.password}
        onChange={handleChange}
        error={errors.password}
        hint="Min 8 characters, including uppercase, lowercase, and a number"
        visibilityToggle
        autoComplete="new-password"
        required
        disabled={isSubmitting}
      />

      <Input
        label="Space Name"
        id="spaceName"
        name="spaceName"
        type="text"
        placeholder="Your Space Name"
        value={formData.spaceName}
        onChange={handleChange}
        error={errors.spaceName}
        hint={'e.g. "My Space", "My World", "Rayal\'s Space"'}
        required
        disabled={isSubmitting}
      />

      <Input
        label="Access Code"
        id="accessCode"
        name="accessCode"
        type="password"
        placeholder="Private rollout access code"
        value={formData.accessCode}
        onChange={handleChange}
        error={errors.accessCode}
        hint="Provided during the early-access release"
        visibilityToggle
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
        Create Space & Register
      </Button>
    </form>
  );
}

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { SignupForm } from '../components/SignupForm.jsx';
import * as authHook from '../hooks/useAuth.js';

describe('SignupForm Component', () => {
  const mockSignup = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      signup: mockSignup,
      user: null,
      space: null,
      isAuthenticated: false,
      isLoading: false
    });
  });

  const renderComponent = () =>
    render(
      <BrowserRouter>
        <SignupForm />
      </BrowserRouter>
    );

  it('renders all required form fields', () => {
    renderComponent();

    expect(screen.getByLabelText(/username/i)).toBeDefined();
    expect(screen.getByLabelText(/email address/i)).toBeDefined();
    expect(screen.getByLabelText(/^password/i)).toBeDefined();
    expect(screen.getByLabelText(/space name/i)).toBeDefined();
    expect(screen.getByLabelText(/access code/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /create space & register/i })).toBeDefined();
  });

  it('validates missing required fields on submit', async () => {
    renderComponent();

    const submitBtn = screen.getByRole('button', { name: /create space & register/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Username is required')).toBeDefined();
    expect(await screen.findByText('Email address is required')).toBeDefined();
    expect(await screen.findByText('Password is required')).toBeDefined();
    expect(await screen.findByText('Space name is required')).toBeDefined();
    expect(await screen.findByText('Access code is required')).toBeDefined();
    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('validates invalid email format', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByLabelText(/email address/i), 'invalid-email');
    await user.click(screen.getByRole('button', { name: /create space & register/i }));

    expect(await screen.findByText('Please enter a valid email address')).toBeDefined();
    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('validates weak passwords (less than 8 chars, missing uppercase/number)', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByLabelText(/^password/i), 'weak');
    await user.click(screen.getByRole('button', { name: /create space & register/i }));

    expect(await screen.findByText('Password must be at least 8 characters long')).toBeDefined();

    await user.clear(screen.getByLabelText(/^password/i));
    await user.type(screen.getByLabelText(/^password/i), 'lowercaseonly123');
    await user.click(screen.getByRole('button', { name: /create space & register/i }));

    expect(
      await screen.findByText(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      )
    ).toBeDefined();
  });

  it('submits valid data to backend signup service', async () => {
    mockSignup.mockResolvedValueOnce({
      success: true,
      message: 'User and Space registered successfully. Please sign in.'
    });

    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByLabelText(/username/i), 'ayush_admin');
    await user.type(screen.getByLabelText(/email address/i), 'ayush@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'StrongPass123!');
    await user.type(screen.getByLabelText(/space name/i), 'My Space');
    await user.type(screen.getByLabelText(/access code/i), 'MY_ACCESS_CODE');

    await user.click(screen.getByRole('button', { name: /create space & register/i }));

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith({
        username: 'ayush_admin',
        email: 'ayush@example.com',
        password: 'StrongPass123!',
        spaceName: 'My Space',
        accessCode: 'MY_ACCESS_CODE'
      });
    });

    expect(await screen.findByText(/User and Space registered successfully/i)).toBeDefined();
  });

  it('displays backend error message on conflict (409) or invalid access code (400)', async () => {
    mockSignup.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          success: false,
          message: 'Username is already taken',
          errors: []
        }
      }
    });

    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByLabelText(/username/i), 'ayush_admin');
    await user.type(screen.getByLabelText(/email address/i), 'ayush@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'StrongPass123!');
    await user.type(screen.getByLabelText(/space name/i), 'My Space');
    await user.type(screen.getByLabelText(/access code/i), 'MY_ACCESS_CODE');

    await user.click(screen.getByRole('button', { name: /create space & register/i }));

    expect(await screen.findByText('Username is already taken')).toBeDefined();
  });

  it('toggles password and access code visibility', async () => {
    const user = userEvent.setup();
    renderComponent();

    const passwordInput = screen.getByLabelText(/^password/i);
    expect(passwordInput.getAttribute('type')).toBe('password');

    const toggleBtns = screen.getAllByRole('button', { name: /show password/i });
    expect(toggleBtns.length).toBe(2); // password and access code toggles

    await user.click(toggleBtns[0]);
    expect(passwordInput.getAttribute('type')).toBe('text');

    await user.click(toggleBtns[0]);
    expect(passwordInput.getAttribute('type')).toBe('password');
  });
});

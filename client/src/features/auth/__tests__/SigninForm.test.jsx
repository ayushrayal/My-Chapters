import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { SigninForm } from '../components/SigninForm.jsx';
import * as authHook from '../hooks/useAuth.js';

describe('SigninForm Component', () => {
  const mockSignin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      signin: mockSignin,
      user: null,
      space: null,
      isAuthenticated: false,
      isLoading: false
    });
  });

  const renderComponent = () =>
    render(
      <BrowserRouter>
        <SigninForm />
      </BrowserRouter>
    );

  it('renders identifier and password inputs', () => {
    renderComponent();

    expect(screen.getByLabelText(/email or username/i)).toBeDefined();
    expect(screen.getByLabelText(/^password/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeDefined();
  });

  it('validates missing fields on submit', async () => {
    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByText('Please enter your email or username')).toBeDefined();
    expect(await screen.findByText('Please enter your password')).toBeDefined();
    expect(mockSignin).not.toHaveBeenCalled();
  });

  it('submits valid credentials and triggers signin', async () => {
    mockSignin.mockResolvedValueOnce({
      user: { id: 'u1', username: 'ayush' },
      space: { id: 's1', name: 'My Space' }
    });

    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByLabelText(/email or username/i), 'ayush@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'StrongPass123!');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockSignin).toHaveBeenCalledWith({
        identifier: 'ayush@example.com',
        password: 'StrongPass123!'
      });
    });
  });

  it('displays generic invalid credentials error on 401 response', async () => {
    mockSignin.mockRejectedValueOnce({
      response: {
        status: 401,
        data: {
          success: false,
          message: 'Invalid credentials',
          errors: []
        }
      }
    });

    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByLabelText(/email or username/i), 'ayush@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'WrongPass!');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByText('Invalid credentials')).toBeDefined();
  });

  it('displays rate-limit error on 429 response', async () => {
    mockSignin.mockRejectedValueOnce({
      response: {
        status: 429,
        data: {
          success: false,
          message: 'Too many signin attempts from this IP, please try again after 15 minutes',
          errors: []
        }
      }
    });

    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByLabelText(/email or username/i), 'ayush@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'AnyPass123!');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(
      await screen.findByText(/too many signin attempts from this IP/i)
    ).toBeDefined();
  });
});

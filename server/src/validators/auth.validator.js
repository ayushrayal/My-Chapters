import { z } from 'zod';

/**
 * Username Policy:
 * - 3 to 30 characters
 * - Letters (a-z, A-Z), numbers (0-9), underscores (_), and hyphens (-)
 * - Must start and end with an alphanumeric character
 */
const usernameRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9_-]*[a-zA-Z0-9])?$/;

/**
 * Password Policy:
 * - Minimum 8 characters, maximum 128 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one number (0-9)
 */
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;

/**
 * Space Name Policy:
 * - 2 to 50 characters
 * - Letters, numbers, spaces, apostrophes, and standard punctuation
 */
const spaceNameRegex = /^[\p{L}\p{N}\s'._\-&]+$/u;

export const signupSchema = z.object({
  username: z
    .string({ required_error: 'Username is required' })
    .trim()
    .min(3, 'Username must be at least 3 characters long')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(
      usernameRegex,
      'Username must contain only letters, numbers, hyphens, or underscores and cannot start or end with a symbol'
    ),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address format')
    .max(255, 'Email cannot exceed 255 characters'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(
      passwordRegex,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  spaceName: z
    .string({ required_error: 'Space name is required' })
    .trim()
    .min(2, 'Space name must be at least 2 characters long')
    .max(50, 'Space name cannot exceed 50 characters')
    .regex(
      spaceNameRegex,
      'Space name contains invalid characters. Use letters, numbers, spaces, and standard punctuation'
    ),
  accessCode: z
    .string({ required_error: 'Access code is required' })
    .trim()
    .min(1, 'Access code cannot be empty')
});

export const signinSchema = z.object({
  identifier: z
    .string({ required_error: 'Identifier (email or username) is required' })
    .trim()
    .min(1, 'Identifier cannot be empty'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty')
});


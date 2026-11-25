// Vitest setup file
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { clearUserQueries } from '../lib/queryClient.js';

// Automatically cleanup DOM and QueryClient cache after each test
afterEach(() => {
  cleanup();
  clearUserQueries();
});


import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Someday } from '../pages/Someday.jsx';
import { somedayApi } from '../services/someday.api.js';

describe('Someday Main Page Component', () => {
  const mockCategories = [
    { id: 'cat-1', name: 'Electronics', isSystem: false, itemCount: 1 },
    { id: 'cat-2', name: 'Other', isSystem: true, itemCount: 1 }
  ];

  const mockItems = [
    {
      id: 'item-1',
      name: 'Sony Headphones',
      category: { id: 'cat-1', name: 'Electronics', isSystem: false },
      categoryId: 'cat-1',
      status: 'PLANNED',
      note: 'Wait for holiday sale',
      links: [{ label: 'Sony', url: 'https://sony.com' }],
      purchaseDate: null
    },
    {
      id: 'item-2',
      name: 'Coffee Mug',
      category: { id: 'cat-2', name: 'Other', isSystem: true },
      categoryId: 'cat-2',
      status: 'PURCHASED',
      note: 'Ceramic blue mug',
      links: [],
      purchaseDate: '2026-11-01T00:00:00.000Z'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(somedayApi, 'getCategories').mockResolvedValue(mockCategories);
    vi.spyOn(somedayApi, 'getItems').mockResolvedValue(mockItems);
  });

  it('renders heading, subtitle, real statistics, and item cards', async () => {
    render(<Someday />);

    expect(screen.getByRole('heading', { level: 1, name: 'Someday' })).toBeDefined();
    expect(screen.getByText("Things you want. Things you've got.")).toBeDefined();

    // Wait for items to load
    await waitFor(() => {
      expect(screen.getByText('Sony Headphones')).toBeDefined();
      expect(screen.getByText('Coffee Mug')).toBeDefined();
    });

    // Real statistics calculated from API items (Total: 2, Planned: 1, Purchased: 1)
    expect(screen.getByText('Total Items')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined(); // Total count
    expect(screen.getByText('Planned (1)')).toBeDefined();
    expect(screen.getByText('Purchased (1)')).toBeDefined();
  });

  it('filters items by status when clicking status pill', async () => {
    render(<Someday />);

    await waitFor(() => {
      expect(screen.getByText('Sony Headphones')).toBeDefined();
    });

    const plannedPill = screen.getByRole('radio', { name: /planned/i });
    fireEvent.click(plannedPill);

    await waitFor(() => {
      expect(somedayApi.getItems).toHaveBeenCalledWith({ status: 'PLANNED' });
    });
  });

  it('renders contextual empty state when no items exist', async () => {
    vi.spyOn(somedayApi, 'getItems').mockResolvedValue([]);

    render(<Someday />);

    await waitFor(() => {
      expect(screen.getByText('Nothing here yet.')).toBeDefined();
      expect(screen.getByText('Add your first item to Someday.')).toBeDefined();
    });
  });
});

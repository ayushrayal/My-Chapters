import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ItemFormModal } from '../components/ItemFormModal.jsx';

describe('ItemFormModal Component', () => {
  const mockCategories = [
    { id: 'cat-1', name: 'Books', isSystem: false },
    { id: 'cat-2', name: 'Other', isSystem: true }
  ];

  it('renders form inputs and handles dynamic link limits (0 to 3 max)', () => {
    render(
      <ItemFormModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        categories={mockCategories}
      />
    );

    expect(screen.getByRole('heading', { name: /add item to someday/i })).toBeDefined();
    expect(screen.getByPlaceholderText(/what would you like to own/i)).toBeDefined();
    expect(screen.getByLabelText(/category/i)).toBeDefined();

    // Link limit indicator starts at 0/3 max
    expect(screen.getByText(/\(0\/3 max\)/i)).toBeDefined();

    const addLinkBtn = screen.getByRole('button', { name: /\+ add link/i });
    expect(addLinkBtn).toBeDefined();

    // Add 1st link
    fireEvent.click(addLinkBtn);
    expect(screen.getByText(/\(1\/3 max\)/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/https:\/\/example.com\/item/i)).toBeDefined();

    // Add 2nd link
    fireEvent.click(addLinkBtn);
    expect(screen.getByText(/\(2\/3 max\)/i)).toBeDefined();

    // Add 3rd link
    fireEvent.click(addLinkBtn);
    expect(screen.getByText(/\(3\/3 max\)/i)).toBeDefined();

    // At 3 links, the "+ Add Link" action button is hidden/disallowed
    expect(screen.queryByRole('button', { name: /\+ add link/i })).toBeNull();
  });

  it('validates empty name on submission', async () => {
    const mockSubmit = vi.fn();

    render(
      <ItemFormModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={mockSubmit}
        categories={mockCategories}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /^add item$/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/item name is required/i)).toBeDefined();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('submits valid data and calls onSubmit', async () => {
    const mockSubmit = vi.fn().mockResolvedValue({});
    const mockClose = vi.fn();

    render(
      <ItemFormModal
        isOpen={true}
        onClose={mockClose}
        onSubmit={mockSubmit}
        categories={mockCategories}
      />
    );

    const nameInput = screen.getByPlaceholderText(/what would you like to own/i);
    fireEvent.change(nameInput, { target: { value: 'Casio Watch' } });

    const submitBtn = screen.getByRole('button', { name: /^add item$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Casio Watch',
          categoryId: 'cat-1',
          links: [],
          status: 'PLANNED',
          purchaseDate: null
        })
      );
      expect(mockClose).toHaveBeenCalled();
    });
  });
});


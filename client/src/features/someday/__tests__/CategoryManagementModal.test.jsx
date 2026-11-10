import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CategoryManagementModal } from '../components/CategoryManagementModal.jsx';

describe('CategoryManagementModal Component', () => {
  const mockCategories = [
    { id: 'cat-1', name: 'Electronics', isSystem: false, itemCount: 3 },
    { id: 'cat-2', name: 'Other', isSystem: true, itemCount: 1 }
  ];

  it('renders categories list, protects Other from deletion, and shows items move notice on delete', async () => {
    const mockDelete = vi.fn().mockResolvedValue({ movedItems: 3 });

    render(
      <CategoryManagementModal
        isOpen={true}
        onClose={vi.fn()}
        categories={mockCategories}
        onCreateCategory={vi.fn()}
        onUpdateCategory={vi.fn()}
        onDeleteCategory={mockDelete}
      />
    );

    expect(screen.getByRole('heading', { name: /manage categories/i })).toBeDefined();

    // Verify Other has system badge
    expect(screen.getByText('System Default')).toBeDefined();

    // Electronics has Delete button, but Other does not
    const deleteBtns = screen.getAllByRole('button', { name: /delete category/i });
    expect(deleteBtns.length).toBe(1); // Only for Electronics

    // Click delete on Electronics
    fireEvent.click(deleteBtns[0]);

    // Warning confirmation dialog appears with mandatory wording
    expect(
      screen.getByText(/items in this category will be moved to/i)
    ).toBeDefined();

    // Confirm deletion
    const confirmBtn = screen.getByRole('button', { name: /confirm delete/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('cat-1', 'Electronics');
    });
  });
});

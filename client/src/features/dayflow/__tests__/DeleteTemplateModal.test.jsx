import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeleteTemplateModal } from '../components/DeleteTemplateModal';

describe('DeleteTemplateModal', () => {
  const mockTemplate = {
    _id: 'tpl-123',
    name: 'Weekday High Focus'
  };

  const mockOnClose = vi.fn();
  const mockOnConfirmDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(
      <DeleteTemplateModal
        isOpen={false}
        template={mockTemplate}
        onClose={mockOnClose}
        onConfirmDelete={mockOnConfirmDelete}
      />
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders correctly with template name and disabled Delete button when input is empty', () => {
    render(
      <DeleteTemplateModal
        isOpen={true}
        template={mockTemplate}
        onClose={mockOnClose}
        onConfirmDelete={mockOnConfirmDelete}
      />
    );

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /delete template/i })).toBeTruthy();
    expect(screen.getByText('Weekday High Focus')).toBeTruthy();

    const deleteBtn = screen.getByRole('button', { name: /delete template/i });
    expect(deleteBtn.disabled).toBe(true);
  });

  it('keeps Delete button disabled for incorrect or partial name match', () => {
    render(
      <DeleteTemplateModal
        isOpen={true}
        template={mockTemplate}
        onClose={mockOnClose}
        onConfirmDelete={mockOnConfirmDelete}
      />
    );

    const input = screen.getByPlaceholderText(/Type "Weekday High Focus" to confirm/i);
    const deleteBtn = screen.getByRole('button', { name: /delete template/i });

    // Partial match
    fireEvent.change(input, { target: { value: 'Weekday' } });
    expect(deleteBtn.disabled).toBe(true);

    // Partial with casing mismatch
    fireEvent.change(input, { target: { value: 'weekday high focus' } });
    expect(deleteBtn.disabled).toBe(true);

    // Match with whitespace (no silent trimming allowed)
    fireEvent.change(input, { target: { value: 'Weekday High Focus ' } });
    expect(deleteBtn.disabled).toBe(true);
  });

  it('enables Delete button only when exact name matches', () => {
    render(
      <DeleteTemplateModal
        isOpen={true}
        template={mockTemplate}
        onClose={mockOnClose}
        onConfirmDelete={mockOnConfirmDelete}
      />
    );

    const input = screen.getByPlaceholderText(/Type "Weekday High Focus" to confirm/i);
    const deleteBtn = screen.getByRole('button', { name: /delete template/i });

    fireEvent.change(input, { target: { value: 'Weekday High Focus' } });
    expect(deleteBtn.disabled).toBe(false);
  });

  it('calls onConfirmDelete with correct template id and name on submission, and closes modal', async () => {
    mockOnConfirmDelete.mockResolvedValueOnce({ success: true });

    render(
      <DeleteTemplateModal
        isOpen={true}
        template={mockTemplate}
        onClose={mockOnClose}
        onConfirmDelete={mockOnConfirmDelete}
      />
    );

    const input = screen.getByPlaceholderText(/Type "Weekday High Focus" to confirm/i);
    fireEvent.change(input, { target: { value: 'Weekday High Focus' } });

    const deleteBtn = screen.getByRole('button', { name: /delete template/i });
    fireEvent.click(deleteBtn);

    expect(mockOnConfirmDelete).toHaveBeenCalledTimes(1);
    expect(mockOnConfirmDelete).toHaveBeenCalledWith('tpl-123', 'Weekday High Focus');

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps modal open and displays error when onConfirmDelete fails', async () => {
    mockOnConfirmDelete.mockRejectedValueOnce(new Error('Server error occurred'));

    render(
      <DeleteTemplateModal
        isOpen={true}
        template={mockTemplate}
        onClose={mockOnClose}
        onConfirmDelete={mockOnConfirmDelete}
      />
    );

    const input = screen.getByPlaceholderText(/Type "Weekday High Focus" to confirm/i);
    fireEvent.change(input, { target: { value: 'Weekday High Focus' } });

    const deleteBtn = screen.getByRole('button', { name: /delete template/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText('Server error occurred')).toBeTruthy();
    });

    expect(mockOnClose).not.toHaveBeenCalled();
    expect(deleteBtn.disabled).toBe(false);
  });

  it('closes modal without calling onConfirmDelete when Cancel button is clicked', () => {
    render(
      <DeleteTemplateModal
        isOpen={true}
        template={mockTemplate}
        onClose={mockOnClose}
        onConfirmDelete={mockOnConfirmDelete}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnConfirmDelete).not.toHaveBeenCalled();
  });

  it('closes modal on Escape key press when not deleting', () => {
    render(
      <DeleteTemplateModal
        isOpen={true}
        template={mockTemplate}
        onClose={mockOnClose}
        onConfirmDelete={mockOnConfirmDelete}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnConfirmDelete).not.toHaveBeenCalled();
  });
});

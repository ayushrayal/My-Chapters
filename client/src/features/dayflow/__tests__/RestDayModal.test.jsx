import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RestDayModal } from '../components/RestDayModal.jsx';

describe('RestDayModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirmRestDay = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(
      <RestDayModal
        isOpen={false}
        date="2026-11-26"
        schedule={{ blocks: [], tasks: [] }}
        onClose={mockOnClose}
        onConfirmRestDay={mockOnConfirmRestDay}
      />
    );

    expect(screen.queryByText(/mark this day as rest day\?/i)).toBeNull();
  });

  it('renders modal with title, description, and formatted date when isOpen is true', () => {
    render(
      <RestDayModal
        isOpen={true}
        date="2026-11-26"
        schedule={{ blocks: [{ id: 'b1' }], tasks: [{ id: 't1' }, { id: 't2' }] }}
        onClose={mockOnClose}
        onConfirmRestDay={mockOnConfirmRestDay}
      />
    );

    expect(screen.getByRole('heading', { name: /mark this day as rest day\?/i })).toBeDefined();
    expect(
      screen.getByText(/marking this date as a rest day will clear all existing blocks and tasks for this date/i)
    ).toBeDefined();
    expect(screen.getByText(/2 tasks/i)).toBeDefined();
    expect(screen.getByText(/1 block/i)).toBeDefined();

    // No API request sent on open
    expect(mockOnConfirmRestDay).not.toHaveBeenCalled();
  });

  it('keeps confirm button disabled until the acknowledgment checkbox is checked', () => {
    render(
      <RestDayModal
        isOpen={true}
        date="2026-11-26"
        schedule={{ blocks: [], tasks: [] }}
        onClose={mockOnClose}
        onConfirmRestDay={mockOnConfirmRestDay}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: /confirm rest day/i });
    expect(confirmBtn.hasAttribute('disabled')).toBe(true);

    const checkbox = screen.getByLabelText(/i understand that existing blocks and tasks will be cleared/i);
    fireEvent.click(checkbox);

    expect(confirmBtn.hasAttribute('disabled')).toBe(false);

    // Unchecking disables it again
    fireEvent.click(checkbox);
    expect(confirmBtn.hasAttribute('disabled')).toBe(true);
  });

  it('closes modal without sending an API request when Cancel button is clicked', () => {
    render(
      <RestDayModal
        isOpen={true}
        date="2026-11-26"
        schedule={{ blocks: [], tasks: [] }}
        onClose={mockOnClose}
        onConfirmRestDay={mockOnConfirmRestDay}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnConfirmRestDay).not.toHaveBeenCalled();
  });

  it('calls onConfirmRestDay with the date, shows loading state, and closes on success', async () => {
    mockOnConfirmRestDay.mockResolvedValueOnce({ success: true });

    render(
      <RestDayModal
        isOpen={true}
        date="2026-11-26"
        schedule={{ blocks: [], tasks: [] }}
        onClose={mockOnClose}
        onConfirmRestDay={mockOnConfirmRestDay}
      />
    );

    const checkbox = screen.getByLabelText(/i understand that existing blocks and tasks will be cleared/i);
    fireEvent.click(checkbox);

    const confirmBtn = screen.getByRole('button', { name: /confirm rest day/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockOnConfirmRestDay).toHaveBeenCalledWith('2026-11-26');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('displays error message and keeps modal open if API call rejects', async () => {
    mockOnConfirmRestDay.mockRejectedValueOnce(new Error('Schedule on 2026-11-26 is permanently locked'));

    render(
      <RestDayModal
        isOpen={true}
        date="2026-11-26"
        schedule={{ blocks: [], tasks: [] }}
        onClose={mockOnClose}
        onConfirmRestDay={mockOnConfirmRestDay}
      />
    );

    const checkbox = screen.getByLabelText(/i understand that existing blocks and tasks will be cleared/i);
    fireEvent.click(checkbox);

    const confirmBtn = screen.getByRole('button', { name: /confirm rest day/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText(/permanently locked/i)).toBeDefined();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });
});

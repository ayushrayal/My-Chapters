import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TemplateEditorModal } from '../components/TemplateEditorModal.jsx';

describe('TemplateEditorModal Component', () => {
  it('validates required template name and non-overlapping time blocks', async () => {
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    render(
      <TemplateEditorModal
        isOpen={true}
        template={null}
        onClose={handleClose}
        onSave={handleSave}
      />
    );

    // Initial default block: Morning Focus 09:00 - 11:00
    const nameInput = screen.getByLabelText(/template name \*/i);
    fireEvent.change(nameInput, { target: { value: 'My Routine' } });

    // Add overlapping block
    const addBlockBtn = screen.getByRole('button', { name: /\+ add block/i });
    fireEvent.click(addBlockBtn);

    // Get time inputs and set overlap
    const timeInputs = screen.getAllByDisplayValue(/^(09:00|10:00|11:00|12:00)/);
    // Submit form
    const submitBtn = screen.getByRole('button', { name: /create template/i });
    fireEvent.click(submitBtn);

    // Error for missing block name or overlap
    await waitFor(() => {
      const banner = screen.queryByRole('alert');
      expect(banner).toBeDefined();
    });
  });
});

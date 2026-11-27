import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GymTemplateModal } from '../components/GymTemplateModal.jsx';

describe('GymTemplateModal - Parent Workout Architecture & UI Selection', () => {
  const mockParentWorkouts = [
    {
      parentWorkoutName: 'Pull Day',
      variations: [{ id: 'var-1', name: 'Pull Day Variation A' }]
    },
    {
      parentWorkoutName: 'Push Day',
      variations: [{ id: 'var-2', name: 'Push Day Variation A' }]
    }
  ];

  it('renders mutually exclusive Option A and Option B cards and defaults to Separate Workout', () => {
    render(
      <GymTemplateModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        parentWorkouts={mockParentWorkouts}
      />
    );

    // Both option buttons are present
    const separateBtn = screen.getByRole('button', { name: /create a separate workout/i });
    const existingBtn = screen.getByRole('button', { name: /add to existing parent workout/i });
    expect(separateBtn).toBeDefined();
    expect(existingBtn).toBeDefined();

    // Option A is selected by default
    expect(separateBtn.getAttribute('aria-pressed')).toBe('true');
    expect(existingBtn.getAttribute('aria-pressed')).toBe('false');

    // Existing parent dropdown is NOT visible when Option A is active
    expect(screen.queryByLabelText(/select existing parent workout/i)).toBeNull();
  });

  it('creates a separate parent workout using template name when Option A is selected', async () => {
    const handleSave = vi.fn().mockResolvedValue({});
    const handleClose = vi.fn();

    render(
      <GymTemplateModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
        parentWorkouts={mockParentWorkouts}
      />
    );

    // Enter template name
    const nameInput = screen.getByLabelText(/template name \*/i);
    fireEvent.change(nameInput, { target: { value: 'Legs Day' } });

    // Add a body part and exercise so form is valid
    const bpInput = screen.getByPlaceholderText(/new body part/i);
    fireEvent.change(bpInput, { target: { value: 'Quads' } });
    fireEvent.click(screen.getByRole('button', { name: /add body part/i }));

    const exInput = screen.getByLabelText(/add exercise to quads/i);
    fireEvent.change(exInput, { target: { value: 'Squats' } });
    const addExBtn = screen.getByRole('button', { name: /add$/i });
    fireEvent.click(addExBtn);

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /create template/i }));

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Legs Day',
          parentWorkoutName: 'Legs Day' // Option A uses template name as parent
        })
      );
    });
  });

  it('shows existing parent dropdown and stores selected parent when Option B is selected', async () => {
    const handleSave = vi.fn().mockResolvedValue({});
    const handleClose = vi.fn();

    render(
      <GymTemplateModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
        parentWorkouts={mockParentWorkouts}
      />
    );

    // Enter variation template name
    fireEvent.change(screen.getByLabelText(/template name \*/i), {
      target: { value: 'Pull Day Variation B' }
    });

    // Select Option B: Add to Existing Parent Workout
    const existingBtn = screen.getByRole('button', { name: /add to existing parent workout/i });
    fireEvent.click(existingBtn);
    expect(existingBtn.getAttribute('aria-pressed')).toBe('true');

    // Dropdown is now displayed with real parents
    expect(screen.getByText(/select existing parent workout \*/i)).toBeDefined();

    // Select Pull Day from the dropdown
    const selectTrigger = screen.getByRole('button', { name: /select existing parent workout/i });
    fireEvent.click(selectTrigger);
    fireEvent.click(screen.getByRole('option', { name: 'Pull Day' }));

    // Add required body part and exercise
    fireEvent.change(screen.getByPlaceholderText(/new body part/i), { target: { value: 'Back' } });
    fireEvent.click(screen.getByRole('button', { name: /add body part/i }));
    fireEvent.change(screen.getByLabelText(/add exercise to back/i), { target: { value: 'Lat Pulldown' } });
    fireEvent.click(screen.getByRole('button', { name: /add$/i }));

    // Save template
    fireEvent.click(screen.getByRole('button', { name: /create template/i }));

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Pull Day Variation B',
          parentWorkoutName: 'Pull Day' // Option B stores existing parent
        })
      );
    });
  });

  it('switching from Option B to Option A clears stale parent selection', async () => {
    const handleSave = vi.fn().mockResolvedValue({});

    render(
      <GymTemplateModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={handleSave}
        parentWorkouts={mockParentWorkouts}
      />
    );

    fireEvent.change(screen.getByLabelText(/template name \*/i), { target: { value: 'Custom Routine' } });

    // Switch to Option B and pick Push Day
    fireEvent.click(screen.getByRole('button', { name: /add to existing parent workout/i }));
    const selectTrigger = screen.getByRole('button', { name: /select existing parent workout/i });
    fireEvent.click(selectTrigger);
    fireEvent.click(screen.getByRole('option', { name: 'Push Day' }));

    // Switch back to Option A
    fireEvent.click(screen.getByRole('button', { name: /create a separate workout/i }));

    // Add minimal body part and exercise
    fireEvent.change(screen.getByPlaceholderText(/new body part/i), { target: { value: 'Chest' } });
    fireEvent.click(screen.getByRole('button', { name: /add body part/i }));
    fireEvent.change(screen.getByLabelText(/add exercise to chest/i), { target: { value: 'Incline Press' } });
    fireEvent.click(screen.getByRole('button', { name: /add$/i }));

    fireEvent.click(screen.getByRole('button', { name: /create template/i }));

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Custom Routine',
          parentWorkoutName: 'Custom Routine' // Push Day was completely cleared
        })
      );
    });
  });

  it('preselects Option B when editing a template that already has a parent workout', () => {
    const existingTemplate = {
      _id: 'tpl-pull-b',
      name: 'Pull Day Variation B',
      parentWorkoutName: 'Pull Day', // Parent differs from template name
      bodyParts: [{ name: 'Back', exercises: [{ name: 'Pullups', plannedSets: 3 }] }]
    };

    render(
      <GymTemplateModal
        isOpen={true}
        template={existingTemplate}
        onClose={vi.fn()}
        onSave={vi.fn()}
        parentWorkouts={mockParentWorkouts}
      />
    );

    const existingBtn = screen.getByRole('button', { name: /add to existing parent workout/i });
    expect(existingBtn.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Pull Day')).toBeDefined();
  });

  it('shows an appropriate message when Option B is selected but no parent workouts exist', () => {
    render(
      <GymTemplateModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        parentWorkouts={[]} // Empty list
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /add to existing parent workout/i }));

    expect(
      screen.getByText(/no existing parent workouts found\. create this template as a separate workout first/i)
    ).toBeDefined();
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GymFlow } from '../pages/GymFlow.jsx';
import * as gymflowHook from '../hooks/useGymflow.js';

vi.mock('../hooks/useGymflow.js');

describe('GymFlow Page Component & New Feature Suite', () => {
  const mockSession = {
    _id: 'session-1',
    date: '2026-11-24',
    isFinished: false,
    isRestDay: false,
    bodyParts: [
      {
        name: 'Chest',
        exercises: [
          {
            _id: 'ex-1',
            name: 'Bench Press',
            targetBodyPart: 'Chest',
            plannedSets: 3,
            sets: [
              { setNumber: 1, weightKg: 80, reps: 10, status: 'COMPLETED' },
              { setNumber: 2, weightKg: 85, reps: 8, status: 'COMPLETED' },
              { setNumber: 3, weightKg: 90, reps: 6, status: 'INCOMPLETE' }
            ]
          }
        ]
      }
    ],
    treadmill: {
      targetMinutes: 10,
      actualMinutes: 12,
      caloriesBurned: 110,
      status: 'COMPLETED'
    },
    scoreBreakdown: {
      totalScore: 75,
      explanation: 'Finished: 0/20, Sets: 27/40, Reps: 18/20, Progression: 10/20'
    }
  };

  const mockTemplates = [
    {
      _id: 'tpl-push',
      name: 'Push Day',
      description: 'Chest, Shoulders & Triceps',
      bodyParts: [
        {
          _id: 'bp-1',
          name: 'Chest',
          order: 0,
          exercises: [{ _id: 'ex-bench', name: 'Bench Press', targetBodyPart: 'Chest', plannedSets: 3, notes: 'Warm up' }]
        }
      ]
    }
  ];

  const mockWeeklySchedule = {
    days: [
      { weekday: 'Monday', templateId: { _id: 'tpl-push', name: 'Push Day' }, isRestDay: false },
      { weekday: 'Sunday', templateId: null, isRestDay: true }
    ]
  };

  const mockAnalytics = {
    overall: {
      totalWorkouts: 5,
      totalCompletedExercises: 20,
      totalCompletedSets: 60,
      totalReps: 580,
      totalVolume: 42000,
      averageScore: 82,
      restDaysCount: 2
    },
    treadmill: {
      totalSessions: 5,
      totalMinutes: 65,
      caloriesBurned: 580,
      completedCount: 5,
      partialCount: 0,
      skippedCount: 0
    },
    dailyVolumeTrend: [
      { date: '2026-11-20', volume: 8000 },
      { date: '2026-11-22', volume: 8500 }
    ],
    templatesBreakdown: [
      { name: 'Push Day', sessionsCount: 3, totalVolume: 26000, totalSets: 36, averageScore: 85 }
    ],
    bodyPartsBreakdown: [
      { name: 'Chest', exercisesCount: 6, totalVolume: 18000, totalReps: 180 }
    ],
    exercisesBreakdown: [
      { name: 'Bench Press', targetBodyPart: 'Chest', history: [] }
    ]
  };

  let mockHookValues;

  beforeEach(() => {
    vi.clearAllMocks();
    mockHookValues = {
      currentDate: '2026-11-24',
      selectedDate: '2026-11-24',
      session: mockSession,
      dayAssignment: { templateId: { name: 'Push Day' } },
      templates: mockTemplates,
      weeklySchedule: mockWeeklySchedule,
      comparisons: {
        'ex-1': { previousDate: '2026-11-20', previousMaxWeight: 85, previousTotalReps: 22, previousVolume: 1800 }
      },
      analytics: mockAnalytics,
      isLoadingSession: false,
      isLoadingTemplates: false,
      error: null,
      goToDate: vi.fn(),
      goToToday: vi.fn(),
      goToPreviousDay: vi.fn(),
      goToNextDay: vi.fn(),
      startWorkout: vi.fn(),
      saveWorkoutProgress: vi.fn(),
      finishWorkout: vi.fn(),
      discardWorkout: vi.fn().mockResolvedValue(true),
      markRestDay: vi.fn(),
      removeRestDay: vi.fn(),
      saveTemplate: vi.fn().mockResolvedValue({}),
      deleteTemplate: vi.fn().mockResolvedValue({}),
      updateWeeklyScheduleDays: vi.fn(),
      fetchAnalytics: vi.fn()
    };
    gymflowHook.useGymflow.mockReturnValue(mockHookValues);
  });

  it('renders GymFlow header, tabs, and active workout session with sets', () => {
    render(<GymFlow />);

    expect(screen.getByRole('heading', { name: /gymflow/i })).toBeDefined();
    expect(screen.getByText(/chest/i)).toBeDefined();
    expect(screen.getByText(/bench press/i)).toBeDefined();
    expect(screen.getByText(/cardio & warmup/i)).toBeDefined();
    expect(screen.getAllByRole('button', { name: /finish workout/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('displays previous performance comparisons for the exercise', () => {
    render(<GymFlow />);

    expect(screen.getByText(/prev: 85 kg max/i)).toBeDefined();
  });

  it('switches between Workout, Templates, Schedule, and Analytics tabs', () => {
    render(<GymFlow />);

    // Templates tab
    const tplTab = screen.getByRole('tab', { name: /templates/i });
    fireEvent.click(tplTab);
    expect(screen.getByText(/workout templates/i)).toBeDefined();
    expect(screen.getByText('Push Day')).toBeDefined();

    // Schedule tab
    const schedTab = screen.getByRole('tab', { name: /schedule/i });
    fireEvent.click(schedTab);
    expect(screen.getByText(/weekly workout assignment/i)).toBeDefined();
    expect(screen.getByText('Monday')).toBeDefined();

    // Analytics tab
    const analyticsTab = screen.getByRole('tab', { name: /analytics/i });
    fireEvent.click(analyticsTab);
    expect(screen.getByText(/workout score/i)).toBeDefined();
    expect(screen.getByText(/total volume lifted/i)).toBeDefined();
    expect(screen.getByText(/42,000 kg/i)).toBeDefined();
  });

  it('opens finish workout modal with accurate summary stats when Finish Workout is clicked', () => {
    render(<GymFlow />);

    const finishBtns = screen.getAllByRole('button', { name: /finish workout/i });
    fireEvent.click(finishBtns[0]);

    expect(screen.getByRole('heading', { name: /finish & log workout/i })).toBeDefined();
    expect(screen.getByText(/total repetitions/i)).toBeDefined();
  });

  // --- TASK 1 & 4: Template Editing & Form Isolation ---
  it('opens Edit Template modal pre-populated with selected template details and supports editing', async () => {
    render(<GymFlow />);

    // Switch to templates tab
    fireEvent.click(screen.getByRole('tab', { name: /templates/i }));

    // Click Edit button on the template card
    const editBtn = screen.getByTitle('Edit Template');
    fireEvent.click(editBtn);

    // Modal title should say Edit Workout Template
    expect(screen.getByRole('heading', { name: /edit workout template/i })).toBeDefined();

    // Input fields should contain Push Day data
    const nameInput = screen.getByLabelText(/template name \*/i);
    expect(nameInput.value).toBe('Push Day');

    const descInput = screen.getByLabelText(/description/i);
    expect(descInput.value).toBe('Chest, Shoulders & Triceps');

    // Body part should be present
    expect(screen.getByDisplayValue('Chest')).toBeDefined();
    expect(screen.getByDisplayValue('Bench Press')).toBeDefined();

    // Rename body part
    const bpInput = screen.getByDisplayValue('Chest');
    fireEvent.change(bpInput, { target: { value: 'Upper Chest' } });
    expect(bpInput.value).toBe('Upper Chest');

    // Add another body part
    const newBpInput = screen.getByPlaceholderText(/new body part/i);
    fireEvent.change(newBpInput, { target: { value: 'Triceps' } });
    const addBpBtn = screen.getByRole('button', { name: /add body part/i });
    fireEvent.click(addBpBtn);
    expect(screen.getByDisplayValue('Triceps')).toBeDefined();

    // Save changes
    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockHookValues.saveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Push Day',
          bodyParts: expect.arrayContaining([
            expect.objectContaining({ name: 'Upper Chest' }),
            expect.objectContaining({ name: 'Triceps' })
          ])
        }),
        'tpl-push'
      );
    });
  });

  it('guarantees clean isolated initial state when opening Create Template modal', () => {
    render(<GymFlow />);

    // Switch to templates tab
    fireEvent.click(screen.getByRole('tab', { name: /templates/i }));

    // Click Create Template button
    const createBtn = screen.getByRole('button', { name: /create template/i });
    fireEvent.click(createBtn);

    expect(screen.getByRole('heading', { name: /create workout template/i })).toBeDefined();

    // Input fields must start EMPTY
    const nameInput = screen.getByLabelText(/template name \*/i);
    expect(nameInput.value).toBe('');

    const descInput = screen.getByLabelText(/description/i);
    expect(descInput.value).toBe('');

    // No body parts or exercises from previous template should leak
    expect(screen.queryByDisplayValue('Push Day')).toBeNull();
    expect(screen.queryByDisplayValue('Chest')).toBeNull();
    expect(screen.queryByDisplayValue('Bench Press')).toBeNull();
  });

  // --- TASK 2: Type-to-Confirm Template Deletion ---
  it('opens safe Type-to-Confirm modal when Delete is clicked and validates exact name', async () => {
    render(<GymFlow />);

    fireEvent.click(screen.getByRole('tab', { name: /templates/i }));

    const deleteBtn = screen.getByTitle('Delete Template');
    fireEvent.click(deleteBtn);

    // Confirmation modal should open
    expect(screen.getByRole('heading', { name: /delete template/i })).toBeDefined();
    expect(screen.getByText(/this action is permanent and cannot be undone/i)).toBeDefined();

    const confirmInput = screen.getByPlaceholderText(/type "push day" to confirm/i);
    const confirmDeleteBtn = screen.getByRole('button', { name: /^delete template$/i });

    // Initially disabled
    expect(confirmDeleteBtn.disabled).toBe(true);

    // Typing partial name keeps it disabled
    fireEvent.change(confirmInput, { target: { value: 'Push' } });
    expect(confirmDeleteBtn.disabled).toBe(true);

    // Typing incorrect name keeps it disabled
    fireEvent.change(confirmInput, { target: { value: 'Pull Day' } });
    expect(confirmDeleteBtn.disabled).toBe(true);

    // Typing exact name enables the delete button
    fireEvent.change(confirmInput, { target: { value: 'Push Day' } });
    expect(confirmDeleteBtn.disabled).toBe(false);

    // Click confirm delete
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(mockHookValues.deleteTemplate).toHaveBeenCalledWith('tpl-push', 'Push Day');
    });
  });

  // --- TASK 3: Discard Unfinished Workout Session ---
  it('allows user to discard an unfinished workout session with confirmation modal', async () => {
    render(<GymFlow />);

    // Discard button should be available for unfinished session
    const discardBtns = screen.getAllByRole('button', { name: /discard workout/i });
    expect(discardBtns.length).toBeGreaterThanOrEqual(1);

    // Click Discard Workout
    fireEvent.click(discardBtns[0]);

    // Modal opens
    expect(screen.getByRole('heading', { name: /discard workout/i })).toBeDefined();
    expect(screen.getByText(/are you sure you want to discard this workout\?/i)).toBeDefined();

    // Cancel does not call discard
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);
    expect(mockHookValues.discardWorkout).not.toHaveBeenCalled();

    // Click Discard again and confirm
    const discardBtns2 = screen.getAllByRole('button', { name: /discard workout/i });
    fireEvent.click(discardBtns2[0]);

    // Modal dialog confirm button
    const modal = screen.getByRole('dialog');
    const confirmDiscardBtn = modal.querySelector('button.btn--danger');
    fireEvent.click(confirmDiscardBtn);

    await waitFor(() => {
      expect(mockHookValues.discardWorkout).toHaveBeenCalledTimes(1);
    });
  });

  it('does not display Discard Workout button when session is already finished', () => {
    mockHookValues.session = {
      ...mockSession,
      isFinished: true
    };
    gymflowHook.useGymflow.mockReturnValue(mockHookValues);

    render(<GymFlow />);

    expect(screen.queryByRole('button', { name: /discard workout/i })).toBeNull();
  });
});

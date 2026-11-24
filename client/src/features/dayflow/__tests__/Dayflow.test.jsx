import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Dayflow } from '../pages/Dayflow.jsx';
import * as dayflowHook from '../hooks/useDayflow.js';

vi.mock('../hooks/useDayflow.js');

describe('Dayflow Page Component', () => {
  const mockSchedule = {
    _id: 'sched-1',
    date: '2026-11-24',
    isFinished: false,
    isRestDay: false,
    blocks: [
      {
        _id: 'block-1',
        name: 'Morning Work',
        startTime: '09:00',
        endTime: '11:00',
        tasksRequired: true,
        status: 'UPCOMING'
      }
    ],
    tasks: [
      {
        _id: 'task-1',
        blockId: 'block-1',
        title: 'Review pull request',
        status: 'UPCOMING'
      }
    ]
  };

  const mockTemplates = [
    {
      _id: 'tpl-1',
      name: 'Weekday Deep Focus',
      blocks: [
        { _id: 'block-1', name: 'Deep Work', startTime: '09:00', endTime: '12:00', tasksRequired: true }
      ]
    }
  ];

  const mockAnalytics = {
    summary: {
      totalTasks: 6,
      completedTasks: 4,
      skippedTasks: 2,
      overallCompletionRate: 66.67,
      scheduledDaysCount: 1,
      restDaysCount: 0,
      finishedDaysCount: 0
    },
    dailyTrend: [
      {
        date: '2026-11-24',
        status: 'SCHEDULED',
        completionRate: 66.67,
        totalTasks: 6,
        completedTasks: 4,
        skippedTasks: 2
      }
    ],
    templateBreakdown: [
      {
        templateName: 'Weekday Deep Focus',
        daysCount: 1,
        totalTasks: 6,
        completedTasks: 4,
        skippedTasks: 2,
        completionRate: 66.67
      }
    ],
    timeBasedPerformance: null
  };

  const defaultHookReturn = {
    currentDate: '2026-11-24',
    selectedDate: '2026-11-24',
    schedule: mockSchedule,
    templates: mockTemplates,
    analytics: mockAnalytics,
    isLoadingSchedule: false,
    isLoadingTemplates: false,
    error: null,
    toast: null,
    goToDate: vi.fn(),
    goToToday: vi.fn(),
    goToPreviousDay: vi.fn(),
    goToNextDay: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    applyTemplate: vi.fn().mockResolvedValue({}),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    updateTaskStatus: vi.fn(),
    setRestDay: vi.fn(),
    finishDay: vi.fn(),
    moveSchedule: vi.fn(),
    fetchCalendarOverview: vi.fn().mockResolvedValue({ data: { days: [] } }),
    fetchAnalytics: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    dayflowHook.useDayflow.mockReturnValue(defaultHookReturn);
  });

  it('renders Dayflow header, tabs, and current schedule timeline', () => {
    render(<Dayflow />);

    expect(screen.getByRole('heading', { level: 1, name: /dayflow/i })).toBeDefined();
    expect(screen.getByText('Review pull request')).toBeDefined();
    expect(screen.getByText('Morning Work')).toBeDefined();
    expect(screen.getByText('Today')).toBeDefined();
  });

  it('switches between Daily Schedule, Templates, and Analytics tabs without blanking', () => {
    render(<Dayflow />);

    const templatesTab = screen.getByRole('tab', { name: /templates/i });
    fireEvent.click(templatesTab);
    expect(screen.getByRole('heading', { name: /day templates/i })).toBeDefined();
    expect(screen.getByText('Weekday Deep Focus')).toBeDefined();

    const analyticsTab = screen.getByRole('tab', { name: /analytics/i });
    fireEvent.click(analyticsTab);
    expect(screen.getByRole('heading', { name: /performance & consistency/i })).toBeDefined();
    expect(screen.getByText(/task completion rate/i)).toBeDefined();
    const rateElements = screen.getAllByText(/66.67%/);
    expect(rateElements.length).toBeGreaterThan(0);
  });

  it('handles empty analytics gracefully without crashing or fabricating data', () => {
    dayflowHook.useDayflow.mockReturnValue({
      ...defaultHookReturn,
      analytics: {
        summary: {
          totalTasks: 0,
          completedTasks: 0,
          skippedTasks: 0,
          overallCompletionRate: 0,
          scheduledDaysCount: 0,
          restDaysCount: 0,
          finishedDaysCount: 0
        },
        dailyTrend: [],
        templateBreakdown: [],
        timeBasedPerformance: null
      }
    });

    render(<Dayflow />);
    const analyticsTab = screen.getByRole('tab', { name: /analytics/i });
    fireEvent.click(analyticsTab);

    expect(screen.getByText(/no performance data yet/i)).toBeDefined();
    expect(screen.getByText(/0%/)).toBeDefined();
  });

  it('triggers task status completion when Complete button is clicked', async () => {
    render(<Dayflow />);

    const completeBtn = screen.getByRole('button', { name: /mark "review pull request" complete/i });
    fireEvent.click(completeBtn);

    expect(defaultHookReturn.updateTaskStatus).toHaveBeenCalledWith('task-1', 'COMPLETED');
  });

  it('opens skip task modal requiring a reason', async () => {
    render(<Dayflow />);

    const skipBtn = screen.getByRole('button', { name: /skip "review pull request" with reason/i });
    fireEvent.click(skipBtn);

    expect(screen.getByRole('heading', { name: /skip task/i })).toBeDefined();
    const reasonInput = screen.getByLabelText(/reason for skipping/i);
    fireEvent.change(reasonInput, { target: { value: 'Urgent meeting came up' } });

    const confirmSkipBtn = screen.getByRole('button', { name: /confirm skip/i });
    fireEvent.click(confirmSkipBtn);

    await waitFor(() => {
      expect(defaultHookReturn.updateTaskStatus).toHaveBeenCalledWith(
        'task-1',
        'SKIPPED',
        'Urgent meeting came up'
      );
    });
  });

  it('opens Apply Template modal, supports multiple tasks per block, and calls onApply with all tasks', async () => {
    render(<Dayflow />);

    // Switch to templates tab
    const templatesTab = screen.getByRole('tab', { name: /templates/i });
    fireEvent.click(templatesTab);

    // Click Apply to Day
    const applyBtn = screen.getByRole('button', { name: /apply to day/i });
    fireEvent.click(applyBtn);

    // Modal opens
    expect(screen.getByRole('heading', { name: /apply template: weekday deep focus/i })).toBeDefined();

    // Fill initial task
    const firstTaskInput = screen.getByPlaceholderText(/task #1 for deep work/i);
    fireEvent.change(firstTaskInput, { target: { value: 'First Task' } });

    // Click + Add Task
    const addTaskBtn = screen.getByRole('button', { name: /\+ add task/i });
    fireEvent.click(addTaskBtn);

    // Second task input appears
    const secondTaskInput = screen.getByPlaceholderText(/task #2 for deep work/i);
    fireEvent.change(secondTaskInput, { target: { value: 'Second Task' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /apply schedule/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(defaultHookReturn.applyTemplate).toHaveBeenCalled();
      const callArg = defaultHookReturn.applyTemplate.mock.calls[0][0];
      expect(callArg.tasks).toHaveLength(2);
      expect(callArg.tasks[0].title).toBe('First Task');
      expect(callArg.tasks[1].title).toBe('Second Task');
    });
  });
});

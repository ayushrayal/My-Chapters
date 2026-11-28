import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { GoodBits } from '../pages/GoodBits.jsx';
import * as goodbitsHook from '../hooks/useGoodBits.js';

describe('GoodBits Feature Suite', () => {
  const mockCreateEntry = vi.fn();
  const mockUpdateEntry = vi.fn();
  const mockDeleteEntry = vi.fn();
  const mockSelectDate = vi.fn();
  const mockPrevMonth = vi.fn();
  const mockNextMonth = vi.fn();
  const mockJumpToday = vi.fn();
  const mockOpenAddModal = vi.fn();
  const mockOpenEditModal = vi.fn();
  const mockCloseModal = vi.fn();
  const mockDismissReminder = vi.fn();
  const mockSetEntryToDelete = vi.fn();

  const defaultMockState = {
    spaceId: 'space-123',
    todayStr: '2026-11-27',
    currentYearMonth: { year: 2026, month: 10 }, // November 2026
    monthKey: '2026-11',
    daysInMonth: 30,
    selectedDate: '2026-11-27',
    monthEntries: [
      {
        _id: 'entry-1',
        date: '2026-11-27',
        title: 'Morning Breakthrough',
        description: 'Solved an architectural bottleneck with clean code.',
        createdAt: '2026-11-27T09:30:00.000Z'
      },
      {
        _id: 'entry-2',
        date: '2026-11-27',
        title: 'Evening Walk',
        description: 'Enjoyed a peaceful stroll under autumn leaves.',
        createdAt: '2026-11-27T18:00:00.000Z'
      },
      {
        _id: 'entry-3',
        date: '2026-11-15',
        title: 'Workout Milestone',
        description: 'Set a new personal record on squat.',
        createdAt: '2026-11-15T11:00:00.000Z'
      }
    ],
    dayCounts: {
      '2026-11-27': 2,
      '2026-11-15': 1
    },
    dateEntries: [
      {
        _id: 'entry-1',
        date: '2026-11-27',
        title: 'Morning Breakthrough',
        description: 'Solved an architectural bottleneck with clean code.',
        createdAt: '2026-11-27T09:30:00.000Z'
      },
      {
        _id: 'entry-2',
        date: '2026-11-27',
        title: 'Evening Walk',
        description: 'Enjoyed a peaceful stroll under autumn leaves.',
        createdAt: '2026-11-27T18:00:00.000Z'
      }
    ],
    historicalMemories: [
      {
        _id: 'hist-1',
        date: '2025-11-27',
        title: 'One Year Ago Celebration',
        description: 'Wonderful dinner with lifelong friends.'
      }
    ],
    isLoadingMonth: false,
    isLoadingDate: false,
    isEntryModalOpen: false,
    editingEntry: null,
    entryToDelete: null,
    isReminderOpen: false,
    setEntryToDelete: mockSetEntryToDelete,
    handlePrevMonth: mockPrevMonth,
    handleNextMonth: mockNextMonth,
    handleJumpToday: mockJumpToday,
    handleSelectDate: mockSelectDate,
    handleOpenAddModal: mockOpenAddModal,
    handleOpenEditModal: mockOpenEditModal,
    handleCloseModal: mockCloseModal,
    handleDismissReminder: mockDismissReminder,
    createEntry: mockCreateEntry,
    isCreating: false,
    updateEntry: mockUpdateEntry,
    isUpdating: false,
    deleteEntry: mockDeleteEntry,
    isDeleting: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(goodbitsHook, 'useGoodBits').mockReturnValue(defaultMockState);
  });

  it('renders page header, calendar, and selected date details', () => {
    render(
      <MemoryRouter>
        <GoodBits />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /good bits/i })).toBeDefined();
    expect(screen.getByText(/personal collection of positive daily moments/i)).toBeDefined();
    expect(screen.getByText('November 2026')).toBeDefined();
    expect(screen.getByText('Morning Breakthrough')).toBeDefined();
    expect(screen.getByText('Evening Walk')).toBeDefined();
    expect(screen.getByText('2 Good Bits recorded')).toBeDefined();
  });

  it('displays count badge for multiple entries and dot for single entry on calendar', () => {
    render(
      <MemoryRouter>
        <GoodBits />
      </MemoryRouter>
    );

    // Date 27 has 2 entries -> badge with text '2'
    const countBadge = screen.getByTitle('2 Good Bits');
    expect(countBadge).toBeDefined();
    expect(countBadge.textContent).toBe('2');

    // Date 15 has 1 entry -> dot
    const singleDot = screen.getByTitle('1 Good Bit');
    expect(singleDot).toBeDefined();
  });

  it('allows clicking previous, next month, and Jump to Today', () => {
    render(
      <MemoryRouter>
        <GoodBits />
      </MemoryRouter>
    );

    const prevBtn = screen.getByRole('button', { name: /previous month/i });
    const nextBtn = screen.getByRole('button', { name: /next month/i });
    const todayBtn = screen.getByRole('button', { name: /^today$/i });

    fireEvent.click(prevBtn);
    expect(mockPrevMonth).toHaveBeenCalledTimes(1);

    fireEvent.click(nextBtn);
    expect(mockNextMonth).toHaveBeenCalledTimes(1);

    fireEvent.click(todayBtn);
    expect(mockJumpToday).toHaveBeenCalledTimes(1);
  });

  it('renders friendly empty state when a selected date has 0 entries', () => {
    vi.spyOn(goodbitsHook, 'useGoodBits').mockReturnValue({
      ...defaultMockState,
      selectedDate: '2026-11-20',
      dateEntries: []
    });

    render(
      <MemoryRouter>
        <GoodBits />
      </MemoryRouter>
    );

    expect(screen.getByText(/no good bits recorded yet/i)).toBeDefined();
    expect(screen.getByText(/write down something positive/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /record your first memory/i })).toBeDefined();
  });

  it('renders memory reminder modal when isReminderOpen is true', () => {
    vi.spyOn(goodbitsHook, 'useGoodBits').mockReturnValue({
      ...defaultMockState,
      isReminderOpen: true
    });

    render(
      <MemoryRouter>
        <GoodBits />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 3, name: /past memories on this day/i })).toBeDefined();
    expect(screen.getByText('One Year Ago Celebration')).toBeDefined();
    expect(screen.getByText('Wonderful dinner with lifelong friends.')).toBeDefined();

    const dismissBtn = screen.getByRole('button', { name: /keep smiling/i });
    fireEvent.click(dismissBtn);
    expect(mockDismissReminder).toHaveBeenCalledTimes(1);
  });
});

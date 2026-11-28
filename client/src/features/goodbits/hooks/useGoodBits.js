import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { goodbitsApi } from '../services/goodbits.api.js';
import { queryClient } from '../../../lib/queryClient.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { useAuth } from '../../auth/hooks/useAuth.js';

function padZero(n) {
  return String(n).padStart(2, '0');
}

export function getTodayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = padZero(now.getMonth() + 1);
  const d = padZero(now.getDate());
  return `${y}-${m}-${d}`;
}

export function useGoodBits() {
  const { space } = useAuth();
  const spaceId = space?.id || space?._id;

  const todayStr = useMemo(() => getTodayDateString(), []);

  const [currentYearMonth, setCurrentYearMonth] = useState(() => {
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth() // 0-indexed
    };
  });

  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Modal states
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [isReminderOpen, setIsReminderOpen] = useState(false);

  const monthKey = `${currentYearMonth.year}-${padZero(currentYearMonth.month + 1)}`;
  const daysInMonth = new Date(currentYearMonth.year, currentYearMonth.month + 1, 0).getDate();

  // 1. Month overview query (all entries and dayCounts in month)
  const {
    data: monthData,
    isLoading: isLoadingMonth,
    refetch: refetchMonth
  } = useQuery(
    {
      queryKey: queryKeys.goodbits.month(spaceId, monthKey),
      queryFn: () => goodbitsApi.getMonthEntries(monthKey),
      staleTime: 60 * 1000,
      enabled: Boolean(spaceId)
    },
    queryClient
  );

  const monthEntries = monthData?.entries || [];
  const dayCounts = monthData?.dayCounts || {};

  // 2. Selected date query (detailed entries for the selected day)
  const {
    data: dateData,
    isLoading: isLoadingDate,
    refetch: refetchDate
  } = useQuery(
    {
      queryKey: queryKeys.goodbits.date(spaceId, selectedDate),
      queryFn: () => goodbitsApi.getDateEntries(selectedDate),
      staleTime: 30 * 1000,
      enabled: Boolean(spaceId && selectedDate)
    },
    queryClient
  );

  const dateEntries = dateData?.entries || [];

  // 3. Historical memories query for reminder (checked on initial load for today's date)
  const { data: memoriesData } = useQuery(
    {
      queryKey: queryKeys.goodbits.memories(spaceId, todayStr),
      queryFn: () => goodbitsApi.getHistoricalMemories(todayStr),
      staleTime: 10 * 60 * 1000,
      enabled: Boolean(spaceId)
    },
    queryClient
  );

  const historicalMemories = memoriesData?.memories || [];

  // Check if reminder modal should be displayed automatically
  useEffect(() => {
    if (historicalMemories.length > 0) {
      const storageKey = `mc_goodbits_reminder_dismissed_${spaceId}_${todayStr}`;
      const dismissed = sessionStorage.getItem(storageKey);
      if (!dismissed) {
        setIsReminderOpen(true);
      }
    }
  }, [historicalMemories, spaceId, todayStr]);

  const handleDismissReminder = useCallback(() => {
    setIsReminderOpen(false);
    if (spaceId) {
      const storageKey = `mc_goodbits_reminder_dismissed_${spaceId}_${todayStr}`;
      sessionStorage.setItem(storageKey, 'true');
    }
  }, [spaceId, todayStr]);

  // Mutations
  const createMutation = useMutation(
    {
      mutationFn: (data) => goodbitsApi.createEntry(data),
      onSuccess: (savedEntry) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.goodbits.all(spaceId) });
        setIsEntryModalOpen(false);
        setEditingEntry(null);
        if (savedEntry?.date) {
          setSelectedDate(savedEntry.date);
        }
      }
    },
    queryClient
  );

  const updateMutation = useMutation(
    {
      mutationFn: ({ id, data }) => goodbitsApi.updateEntry(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.goodbits.all(spaceId) });
        setIsEntryModalOpen(false);
        setEditingEntry(null);
      }
    },
    queryClient
  );

  const deleteMutation = useMutation(
    {
      mutationFn: (id) => goodbitsApi.deleteEntry(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.goodbits.all(spaceId) });
        setEntryToDelete(null);
      }
    },
    queryClient
  );

  // Month navigation
  const handlePrevMonth = useCallback(() => {
    setCurrentYearMonth((prev) => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentYearMonth((prev) => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  }, []);

  const handleJumpToday = useCallback(() => {
    const now = new Date();
    setCurrentYearMonth({
      year: now.getFullYear(),
      month: now.getMonth()
    });
    setSelectedDate(getTodayDateString());
  }, []);

  const handleSelectDate = useCallback((dateStr) => {
    setSelectedDate(dateStr);
  }, []);

  const handleOpenAddModal = useCallback(() => {
    setEditingEntry(null);
    setIsEntryModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((entry) => {
    setEditingEntry(entry);
    setIsEntryModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsEntryModalOpen(false);
    setEditingEntry(null);
  }, []);

  return {
    spaceId,
    todayStr,
    currentYearMonth,
    monthKey,
    daysInMonth,
    selectedDate,
    monthEntries,
    dayCounts,
    dateEntries,
    historicalMemories,
    isLoadingMonth,
    isLoadingDate,
    isEntryModalOpen,
    editingEntry,
    entryToDelete,
    isReminderOpen,
    setEntryToDelete,
    setIsReminderOpen,
    handlePrevMonth,
    handleNextMonth,
    handleJumpToday,
    handleSelectDate,
    handleOpenAddModal,
    handleOpenEditModal,
    handleCloseModal,
    handleDismissReminder,
    createEntry: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateEntry: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteEntry: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    refetchMonth,
    refetchDate
  };
}

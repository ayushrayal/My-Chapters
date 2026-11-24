import { useState, useEffect, useCallback } from 'react';
import { dayflowApi } from '../services/dayflow.api.js';
import { parseApiError } from '../../../utils/error-handler.js';
import { useToast } from '../../../context/ToastContext.jsx';

function getTodayString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function useDayflow(initialDate = null) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(initialDate || getTodayString());
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'templates' | 'analytics'

  const [schedule, setSchedule] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [calendarOverview, setCalendarOverview] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Load schedule for currently selected date
  const loadSchedule = useCallback(async (dateToLoad = selectedDate) => {
    try {
      const data = await dayflowApi.getSchedule(dateToLoad);
      setSchedule(data);
      return data;
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
      return null;
    }
  }, [selectedDate]);

  // Load templates list
  const loadTemplates = useCallback(async () => {
    try {
      const data = await dayflowApi.getTemplates();
      setTemplates(data);
      return data;
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
      return [];
    }
  }, []);

  // Load calendar overview for current month
  const loadCalendarOverview = useCallback(async (refDateStr = selectedDate) => {
    try {
      const parts = refDateStr.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const pad = (n) => String(n).padStart(2, '0');

      const startDate = `${y}-${pad(m)}-01`;
      const endDate = `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}`;

      const data = await dayflowApi.getCalendarOverview(startDate, endDate);
      setCalendarOverview(data);
      return data;
    } catch (err) {
      return [];
    }
  }, [selectedDate]);

  // Load analytics for specified range or current date window
  const loadAnalytics = useCallback(async (params = selectedDate) => {
    try {
      let startDate;
      let endDate;
      let dateRef;

      if (typeof params === 'object' && params !== null) {
        startDate = params.startDate;
        endDate = params.endDate;
        dateRef = params.date || selectedDate;
      } else {
        dateRef = params || selectedDate;
        const d = new Date(dateRef);
        const end = new Date(d);
        const start = new Date(d);
        start.setDate(start.getDate() - 6);

        const pad = (n) => String(n).padStart(2, '0');
        startDate = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
        endDate = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
      }

      const data = await dayflowApi.getAnalytics({
        startDate,
        endDate,
        date: dateRef
      });
      setAnalytics(data);
      return data;
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
      return null;
    }
  }, [selectedDate]);

  // Initial load
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    Promise.all([
      loadSchedule(selectedDate),
      loadTemplates(),
      loadCalendarOverview(selectedDate),
      loadAnalytics(selectedDate)
    ]).finally(() => {
      if (isMounted) setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedDate, loadSchedule, loadTemplates, loadCalendarOverview, loadAnalytics]);

  // Date navigation handlers
  const changeDate = useCallback((newDate) => {
    setSelectedDate(newDate);
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(getTodayString());
  }, []);

  const goToPreviousDay = useCallback(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    const pad = (n) => String(n).padStart(2, '0');
    setSelectedDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }, [selectedDate]);

  const goToNextDay = useCallback(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const pad = (n) => String(n).padStart(2, '0');
    setSelectedDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }, [selectedDate]);

  // Refresh current day
  const refreshDay = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadSchedule(selectedDate),
        loadCalendarOverview(selectedDate),
        loadAnalytics(selectedDate)
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadSchedule, loadCalendarOverview, loadAnalytics, selectedDate]);

  // --- Schedule Mutations ---

  const saveDaySchedule = async (blocks, tasks) => {
    setError(null);
    try {
      const saved = await dayflowApi.saveSchedule({
        date: selectedDate,
        blocks,
        tasks
      });
      setSchedule(saved);
      toast?.success?.('Daily schedule saved successfully.');
      await Promise.all([loadCalendarOverview(selectedDate), loadAnalytics(selectedDate)]);
      return saved;
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
      toast?.error?.(parsed.message || 'Failed to save daily schedule.');
      throw parsed;
    }
  };

  const applyTemplateToDate = async ({ templateId, targetDate, targetDates, overwrite = false, tasks = [] }) => {
    setError(null);
    try {
      const result = await dayflowApi.applyTemplate({
        templateId,
        targetDate: targetDate || selectedDate,
        targetDates,
        overwrite,
        tasks
      });

      const appliedSchedule = Array.isArray(result) ? result[0] : result;
      if (appliedSchedule && appliedSchedule.date === selectedDate) {
        setSchedule(appliedSchedule);
      } else if (targetDate) {
        setSelectedDate(targetDate);
      }

      toast?.success?.('Template applied to schedule.');
      await Promise.all([loadCalendarOverview(selectedDate), loadAnalytics(selectedDate)]);
      return result;
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
      toast?.error?.(parsed.message || 'Failed to apply template.');
      throw parsed;
    }
  };

  const moveScheduleToDate = async ({ sourceDate, targetDate, overwrite = false }) => {
    setError(null);
    try {
      const moved = await dayflowApi.moveSchedule({
        sourceDate: sourceDate || selectedDate,
        targetDate,
        overwrite
      });
      setSelectedDate(targetDate);
      setSchedule(moved);
      toast?.success?.(`Schedule moved to ${targetDate}.`);
      await Promise.all([loadCalendarOverview(targetDate), loadAnalytics(targetDate)]);
      return moved;
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
      toast?.error?.(parsed.message || 'Failed to move schedule.');
      throw parsed;
    }
  };

  const toggleRestDay = async (date = selectedDate, isRestDay = true, overwrite = false) => {
    setError(null);
    try {
      const result = await dayflowApi.setRestDay({
        date,
        isRestDay,
        overwrite
      });
      setSchedule(result);
      toast?.success?.(isRestDay ? `Marked ${date} as a Rest Day.` : `Rest Day cleared.`);
      await Promise.all([loadCalendarOverview(date), loadAnalytics(date)]);
      return result;
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
      toast?.error?.(parsed.message || 'Failed to update Rest Day setting.');
      throw parsed;
    }
  };

  const updateTask = async (taskId, payload) => {
    setError(null);
    try {
      const updatedSchedule = await dayflowApi.updateTask(taskId, {
        date: selectedDate,
        ...payload
      });
      setSchedule(updatedSchedule);

      if (payload.status === 'COMPLETED') {
        toast?.success?.('Task marked as Completed.');
      } else if (payload.status === 'SKIPPED') {
        toast?.info?.('Task marked as Skipped.');
      }

      await loadAnalytics(selectedDate);
      return updatedSchedule;
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
      toast?.error?.(parsed.message || 'Failed to update task.');
      throw parsed;
    }
  };

  const deleteTask = async (taskId) => {
    setError(null);
    try {
      const updatedSchedule = await dayflowApi.deleteTask(taskId, selectedDate);
      setSchedule(updatedSchedule);
      toast?.success?.('Task removed from schedule.');
      await loadAnalytics(selectedDate);
      return updatedSchedule;
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
      toast?.error?.(parsed.message || 'Failed to delete task.');
      throw parsed;
    }
  };

  const finishCurrentDay = async (date = selectedDate) => {
    setError(null);
    try {
      const finished = await dayflowApi.finishDay(date);
      setSchedule(finished);
      toast?.success?.(`Day finished and locked! Great execution.`);
      await Promise.all([loadCalendarOverview(date), loadAnalytics(date)]);
      return finished;
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
      toast?.error?.(parsed.message || 'Cannot finish day. Check for unresolved tasks.');
      throw parsed;
    }
  };

  // --- Template Mutations ---

  const createTemplate = async (payload) => {
    setError(null);
    try {
      const created = await dayflowApi.createTemplate(payload);
      setTemplates((prev) => [created, ...prev]);
      toast?.success?.(`Template "${created.name}" created.`);
      return created;
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
      toast?.error?.(parsed.message || 'Failed to create template.');
      throw parsed;
    }
  };

  const updateTemplate = async (templateId, payload) => {
    setError(null);
    try {
      const updated = await dayflowApi.updateTemplate(templateId, payload);
      setTemplates((prev) => prev.map((t) => (t.id === templateId ? updated : t)));
      toast?.success?.(`Template "${updated.name}" updated.`);
      return updated;
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
      toast?.error?.(parsed.message || 'Failed to update template.');
      throw parsed;
    }
  };

  const deleteTemplate = async (templateId, templateName = 'Template') => {
    setError(null);
    try {
      await dayflowApi.deleteTemplate(templateId);
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      toast?.success?.(`Template "${templateName}" deleted.`);
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
      toast?.error?.(parsed.message || 'Failed to delete template.');
      throw parsed;
    }
  };

  return {
    currentDate: getTodayString(),
    selectedDate,
    activeTab,
    setActiveTab,
    schedule,
    templates,
    calendarOverview,
    analytics,
    isLoading,
    isLoadingSchedule: isLoading,
    isLoadingTemplates: isLoading,
    isRefreshing,
    error,
    toast,
    setError,
    goToDate: changeDate,
    changeDate,
    goToToday,
    goToPreviousDay,
    goToNextDay,
    refreshDay,
    saveDaySchedule,
    applyTemplate: applyTemplateToDate,
    applyTemplateToDate,
    moveSchedule: moveScheduleToDate,
    moveScheduleToDate,
    setRestDay: toggleRestDay,
    toggleRestDay,
    createTask: async (payload) => {
      // Adding task to current schedule
      const currentBlocks = schedule?.blocks || [];
      const currentTasks = schedule?.tasks || [];
      const newTask = {
        blockId: payload.blockId,
        title: payload.title,
        description: payload.description || '',
        notes: payload.notes || '',
        status: 'UPCOMING'
      };
      return saveDaySchedule(currentBlocks, [...currentTasks, newTask]);
    },
    updateTask,
    deleteTask,
    updateTaskStatus: async (taskId, status, skippedReason = null) => {
      return updateTask(taskId, { status, skippedReason });
    },
    finishDay: finishCurrentDay,
    finishCurrentDay,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    fetchCalendarOverview: async (startDate, endDate) => {
      const data = await dayflowApi.getCalendarOverview(startDate, endDate);
      return { data: { days: data } };
    },
    fetchAnalytics: async (startDate, endDate) => {
      return loadAnalytics(startDate && endDate ? { startDate, endDate, date: selectedDate } : selectedDate);
    }
  };
}

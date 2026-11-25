import { useState, useEffect, useCallback, useRef } from 'react';
import { dayflowApi } from '../services/dayflow.api.js';
import { parseApiError } from '../../../utils/error-handler.js';
import { useToast } from '../../../context/ToastContext.jsx';

function getTodayString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getMonthKey(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.split('-');
  return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : '';
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

  // In-flight tracking & caching refs
  const templatesLoadedRef = useRef(false);
  const loadedMonthRef = useRef('');
  const lastRequestedDateRef = useRef(selectedDate);
  const inFlightScheduleDateRef = useRef(null);

  // 1. Load schedule for a specific date (with race condition prevention)
  const loadSchedule = useCallback(async (dateToLoad = selectedDate) => {
    lastRequestedDateRef.current = dateToLoad;
    inFlightScheduleDateRef.current = dateToLoad;
    try {
      const data = await dayflowApi.getSchedule(dateToLoad);
      // Only commit to state if this response corresponds to the latest requested date
      if (lastRequestedDateRef.current === dateToLoad) {
        setSchedule(data);
      }
      return data;
    } catch (err) {
      if (lastRequestedDateRef.current === dateToLoad) {
        const parsed = parseApiError(err);
        setError(parsed.message);
      }
      return null;
    } finally {
      if (inFlightScheduleDateRef.current === dateToLoad) {
        inFlightScheduleDateRef.current = null;
      }
    }
  }, [selectedDate]);

  // 2. Load templates list (cached; only fetches if forced or not yet loaded)
  const loadTemplates = useCallback(async (force = false) => {
    if (templatesLoadedRef.current && !force) {
      return templates;
    }
    try {
      const data = await dayflowApi.getTemplates();
      setTemplates(data || []);
      templatesLoadedRef.current = true;
      return data;
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
      return [];
    }
  }, [templates]);

  // 3. Load calendar overview for month (cached per month)
  const loadCalendarOverview = useCallback(async (refDateStr = selectedDate, force = false) => {
    const monthKey = getMonthKey(refDateStr);
    if (!force && loadedMonthRef.current === monthKey && calendarOverview.length > 0) {
      return calendarOverview;
    }

    try {
      const parts = refDateStr.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const pad = (n) => String(n).padStart(2, '0');

      const startDate = `${y}-${pad(m)}-01`;
      const endDate = `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}`;

      const data = await dayflowApi.getCalendarOverview(startDate, endDate);
      setCalendarOverview(data || []);
      loadedMonthRef.current = monthKey;
      return data;
    } catch (err) {
      return [];
    }
  }, [selectedDate, calendarOverview]);

  // 4. Load analytics for specified range or current date window
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

  // Initial load: Fetch schedule, templates (once), and calendar overview (once per month)
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const initialTasks = [
      loadSchedule(selectedDate),
      loadTemplates(),
      loadCalendarOverview(selectedDate)
    ];

    Promise.all(initialTasks).finally(() => {
      if (isMounted) setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []); // Run once on initial mount

  // Targeted date navigation: ONLY loads schedule when date changes (and checks month boundary)
  useEffect(() => {
    // Skip initial mount since it's handled above
    if (lastRequestedDateRef.current === selectedDate && schedule) {
      return;
    }

    let isMounted = true;
    setError(null);

    // 1. Always load the new date's schedule
    loadSchedule(selectedDate);

    // 2. Only re-fetch calendar overview if the user navigated across month boundaries
    const newMonth = getMonthKey(selectedDate);
    if (newMonth !== loadedMonthRef.current) {
      loadCalendarOverview(selectedDate, true);
    }

    // 3. Only fetch analytics if the analytics tab is currently active
    if (activeTab === 'analytics') {
      loadAnalytics(selectedDate);
    }

    return () => {
      isMounted = false;
    };
  }, [selectedDate, activeTab, loadSchedule, loadCalendarOverview, loadAnalytics, schedule]);

  // Lazy-load analytics when user switches to Analytics tab
  useEffect(() => {
    if (activeTab === 'analytics' && !analytics) {
      loadAnalytics(selectedDate);
    }
  }, [activeTab, analytics, loadAnalytics, selectedDate]);

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

  // Explicit refresh of current day (re-validates schedule and month overview)
  const refreshDay = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const promises = [
        loadSchedule(selectedDate),
        loadCalendarOverview(selectedDate, true)
      ];
      if (activeTab === 'analytics' || analytics) {
        promises.push(loadAnalytics(selectedDate));
      }
      await Promise.all(promises);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadSchedule, loadCalendarOverview, loadAnalytics, selectedDate, activeTab, analytics]);

  // --- Schedule Mutations (Invalidate only affected data) ---

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
      // Refresh calendar overview for the month to reflect task count/status
      loadCalendarOverview(selectedDate, true);
      if (activeTab === 'analytics' || analytics) {
        loadAnalytics(selectedDate);
      }
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
      loadCalendarOverview(selectedDate, true);
      if (activeTab === 'analytics' || analytics) {
        loadAnalytics(selectedDate);
      }
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
      loadCalendarOverview(targetDate, true);
      if (activeTab === 'analytics' || analytics) {
        loadAnalytics(targetDate);
      }
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
      loadCalendarOverview(date, true);
      if (activeTab === 'analytics' || analytics) {
        loadAnalytics(date);
      }
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

      // Background refresh calendar and analytics
      loadCalendarOverview(selectedDate, true);
      if (activeTab === 'analytics' || analytics) {
        loadAnalytics(selectedDate);
      }
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
      loadCalendarOverview(selectedDate, true);
      if (activeTab === 'analytics' || analytics) {
        loadAnalytics(selectedDate);
      }
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
      loadCalendarOverview(date, true);
      if (activeTab === 'analytics' || analytics) {
        loadAnalytics(date);
      }
      return finished;
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
      toast?.error?.(parsed.message || 'Cannot finish day. Check for unresolved tasks.');
      throw parsed;
    }
  };

  // --- Template Mutations (Modifies templates state in-place, zero schedule fetches) ---

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
    isLoadingTemplates: !templatesLoadedRef.current,
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

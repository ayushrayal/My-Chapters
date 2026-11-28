import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { dayflowApi } from '../services/dayflow.api.js';
import { queryClient } from '../../../lib/queryClient.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { AuthContext } from '../../auth/context/AuthContext.jsx';
import { parseApiError } from '../../../utils/error-handler.js';
import { useToast } from '../../../context/ToastContext.jsx';
import {
  getLocalDateString,
  addDaysToDateString,
  parseLocalDate
} from '../../../utils/date-utils.js';

function getTodayString() {
  return getLocalDateString();
}

function getMonthKey(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.split('-');
  return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : '';
}

export function useDayflow(initialDate = null) {
  const auth = useContext(AuthContext);
  const spaceId = auth?.space?.id;
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

  // In-flight tracking & race condition guards
  const lastRequestedDateRef = useRef(selectedDate);
  const inFlightScheduleDateRef = useRef(null);

  // 1. Load schedule for a specific date (TanStack Query cached + race guard)
  const loadSchedule = useCallback(
    async (dateToLoad = selectedDate) => {
      lastRequestedDateRef.current = dateToLoad;
      inFlightScheduleDateRef.current = dateToLoad;
      try {
        const data = await queryClient.fetchQuery({
          queryKey: queryKeys.dayflow.schedule(spaceId, dateToLoad),
          queryFn: () => dayflowApi.getSchedule(dateToLoad),
          staleTime: 30 * 1000
        });

        // Only commit to component state if response matches the latest user selection
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
    },
    [selectedDate, spaceId]
  );

  // 2. Load templates list (TanStack Query cached 5 minutes)
  const loadTemplates = useCallback(
    async (force = false) => {
      try {
        if (force) {
          await queryClient.invalidateQueries({ queryKey: queryKeys.dayflow.templates(spaceId) });
        }
        const data = await queryClient.fetchQuery({
          queryKey: queryKeys.dayflow.templates(spaceId),
          queryFn: () => dayflowApi.getTemplates(),
          staleTime: 5 * 60 * 1000
        });
        setTemplates(data || []);
        return data;
      } catch (err) {
        const parsed = parseApiError(err);
        setError(parsed.message);
        return [];
      }
    },
    [spaceId]
  );

  // 3. Load calendar overview for month (TanStack Query cached per month)
  const loadCalendarOverview = useCallback(
    async (refDateStr = selectedDate, force = false) => {
      const monthKey = getMonthKey(refDateStr);
      try {
        if (force) {
          await queryClient.invalidateQueries({ queryKey: queryKeys.dayflow.overview(spaceId, monthKey) });
        }

        const parts = refDateStr.split('-');
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const pad = (n) => String(n).padStart(2, '0');

        const startDate = `${y}-${pad(m)}-01`;
        const endDate = `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}`;

        const data = await queryClient.fetchQuery({
          queryKey: queryKeys.dayflow.overview(spaceId, monthKey),
          queryFn: () => dayflowApi.getCalendarOverview(startDate, endDate),
          staleTime: 5 * 60 * 1000
        });

        setCalendarOverview(data || []);
        return data;
      } catch {
        return [];
      }
    },
    [selectedDate, spaceId]
  );

  // 4. Load analytics for specified range or current date window (TanStack Query cached 2 minutes)
  const loadAnalytics = useCallback(
    async (params = selectedDate) => {
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

        const queryParams = { startDate, endDate, date: dateRef };
        const data = await queryClient.fetchQuery({
          queryKey: queryKeys.dayflow.analytics(spaceId, queryParams),
          queryFn: () => dayflowApi.getAnalytics(queryParams),
          staleTime: 2 * 60 * 1000
        });

        setAnalytics(data);
        return data;
      } catch (err) {
        const parsed = parseApiError(err);
        setError(parsed.message);
        return null;
      }
    },
    [selectedDate, spaceId]
  );

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
    if (lastRequestedDateRef.current === selectedDate && schedule) {
      return;
    }

    let isMounted = true;
    setError(null);

    // 1. Always load the new date's schedule
    loadSchedule(selectedDate);

    // 2. Check if user navigated across month boundaries
    const newMonth = getMonthKey(selectedDate);
    loadCalendarOverview(selectedDate);

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
    setSelectedDate((prev) => addDaysToDateString(prev, -1));
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDate((prev) => addDaysToDateString(prev, 1));
  }, []);

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
      queryClient.setQueryData(queryKeys.dayflow.schedule(spaceId, selectedDate), saved);
      toast?.success?.('Daily schedule saved successfully.');
      loadCalendarOverview(selectedDate, true);
      if (activeTab === 'analytics' || analytics) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dayflow.analytics(spaceId) });
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
      const datesToApply = targetDates && targetDates.length > 0 ? targetDates : [targetDate || selectedDate];
      const primaryTargetDate = targetDate || datesToApply[0] || selectedDate;

      const result = await dayflowApi.applyTemplate({
        templateId,
        targetDate: primaryTargetDate,
        targetDates: datesToApply.length > 1 ? datesToApply : undefined,
        overwrite,
        tasks
      });

      const appliedSchedule = Array.isArray(result) ? result[0] : result;
      const appliedDate = appliedSchedule?.date || primaryTargetDate;

      // 1. Invalidate schedule queries for all target dates
      datesToApply.forEach((d) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.dayflow.schedule(spaceId, d) });
      });

      // 2. Invalidate calendar overview and analytics
      queryClient.invalidateQueries({ queryKey: queryKeys.dayflow.overview(spaceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dayflow.analytics(spaceId) });

      // 3. Immediately commit applied schedule to state and query cache
      if (appliedSchedule) {
        if (appliedDate === selectedDate) {
          setSchedule(appliedSchedule);
          queryClient.setQueryData(queryKeys.dayflow.schedule(spaceId, selectedDate), appliedSchedule);
        } else {
          // If targeted another date, navigate to it and display the new schedule immediately
          setSelectedDate(appliedDate);
          setSchedule(appliedSchedule);
          queryClient.setQueryData(queryKeys.dayflow.schedule(spaceId, appliedDate), appliedSchedule);
        }
      }

      toast?.success?.('Template applied to schedule.');
      loadCalendarOverview(appliedDate, true);
      setError(null);
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
      queryClient.setQueryData(queryKeys.dayflow.schedule(spaceId, targetDate), moved);
      queryClient.invalidateQueries({ queryKey: queryKeys.dayflow.schedule(spaceId, sourceDate || selectedDate) });
      toast?.success?.(`Schedule moved to ${targetDate}.`);
      loadCalendarOverview(targetDate, true);
      if (activeTab === 'analytics' || analytics) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dayflow.analytics(spaceId) });
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

  const toggleRestDay = async (arg1, arg2, arg3) => {
    setError(null);
    let targetDate = selectedDate;
    let targetIsRestDay = true;
    let targetOverwrite = true;

    if (typeof arg1 === 'object' && arg1 !== null) {
      targetDate = arg1.date || selectedDate;
      targetIsRestDay = typeof arg1.isRestDay === 'boolean' ? arg1.isRestDay : true;
      targetOverwrite = typeof arg1.overwrite === 'boolean' ? arg1.overwrite : true;
    } else if (typeof arg1 === 'boolean') {
      targetIsRestDay = arg1;
      targetDate = selectedDate;
      targetOverwrite = typeof arg2 === 'boolean' ? arg2 : true;
    } else if (typeof arg1 === 'string') {
      targetDate = arg1;
      targetIsRestDay = typeof arg2 === 'boolean' ? arg2 : true;
      targetOverwrite = typeof arg3 === 'boolean' ? arg3 : true;
    }

    try {
      const result = await dayflowApi.setRestDay({
        date: targetDate,
        isRestDay: targetIsRestDay,
        overwrite: targetOverwrite
      });
      setSchedule(result);
      queryClient.setQueryData(queryKeys.dayflow.schedule(spaceId, targetDate), result);
      queryClient.invalidateQueries({ queryKey: ['dayflow', spaceId, 'schedule', targetDate] });
      queryClient.invalidateQueries({ queryKey: ['dayflow', spaceId, 'overview'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.dayflow.analytics(spaceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(spaceId) });

      toast?.success?.(targetIsRestDay ? `Marked ${targetDate} as a Rest Day.` : `Rest Day cleared.`);
      loadCalendarOverview(targetDate, true);
      if (activeTab === 'analytics' || analytics) {
        loadAnalytics(targetDate);
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
      queryClient.setQueryData(queryKeys.dayflow.schedule(spaceId, selectedDate), updatedSchedule);

      if (payload.status === 'COMPLETED') {
        toast?.success?.('Task marked as Completed.');
      } else if (payload.status === 'SKIPPED') {
        toast?.info?.('Task marked as Skipped.');
      }

      loadCalendarOverview(selectedDate, true);
      if (activeTab === 'analytics' || analytics) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dayflow.analytics(spaceId) });
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
      queryClient.setQueryData(queryKeys.dayflow.schedule(spaceId, selectedDate), updatedSchedule);
      toast?.success?.('Task removed from schedule.');
      loadCalendarOverview(selectedDate, true);
      if (activeTab === 'analytics' || analytics) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dayflow.analytics(spaceId) });
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
      queryClient.setQueryData(queryKeys.dayflow.schedule(spaceId, date), finished);
      toast?.success?.('Day finished and locked! Great execution.');
      loadCalendarOverview(date, true);
      if (activeTab === 'analytics' || analytics) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dayflow.analytics(spaceId) });
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

  // --- Template Mutations ---

  const createTemplate = async (payload) => {
    setError(null);
    try {
      const created = await dayflowApi.createTemplate(payload);
      setTemplates((prev) => [created, ...prev]);
      queryClient.invalidateQueries({ queryKey: queryKeys.dayflow.templates(spaceId) });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.dayflow.templates(spaceId) });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.dayflow.templates(spaceId) });
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
    isLoadingTemplates: templates.length === 0 && isLoading,
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

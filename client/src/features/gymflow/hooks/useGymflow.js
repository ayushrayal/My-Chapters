import { useState, useCallback, useRef, useMemo, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gymflowApi } from '../services/gymflow.api.js';
import { queryClient } from '../../../lib/queryClient.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { AuthContext } from '../../auth/context/AuthContext.jsx';
import { useToast } from '../../../context/ToastContext.jsx';

export function useGymflow() {
  const auth = useContext(AuthContext);
  const spaceId = auth?.space?.id;
  const lastSaveTimestampRef = useRef(0);
  const { showToast } = useToast();

  const [currentDate] = useState(() => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });

  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [analytics, setAnalytics] = useState(null);

  // 1. Templates Query (5-minute stale time)
  const {
    data: templates = [],
    isLoading: isLoadingTemplates
  } = useQuery(
    {
      queryKey: queryKeys.gymflow.templates(spaceId),
      queryFn: () => gymflowApi.getTemplates(),
      staleTime: 5 * 60 * 1000
    },
    queryClient
  );

  // 1b. Parent Workouts Query
  const {
    data: parentWorkouts = []
  } = useQuery(
    {
      queryKey: ['gymflow', 'parentWorkouts', spaceId],
      queryFn: () => gymflowApi.getParentWorkouts(),
      staleTime: 5 * 60 * 1000
    },
    queryClient
  );

  // 2. Weekly Schedule Query (5-minute stale time)
  const {
    data: weeklySchedule = null
  } = useQuery(
    {
      queryKey: queryKeys.gymflow.schedule(spaceId),
      queryFn: () => gymflowApi.getWeeklySchedule(),
      staleTime: 5 * 60 * 1000
    },
    queryClient
  );

  // 3. Daily Workout Session Query (30-second stale time)
  const {
    data: sessionData = null,
    isLoading: isLoadingSession,
    error: sessionQueryError
  } = useQuery(
    {
      queryKey: queryKeys.gymflow.session(spaceId, selectedDate),
      queryFn: () => gymflowApi.getSession(selectedDate),
      staleTime: 30 * 1000
    },
    queryClient
  );

  const session = sessionData?.session || null;
  const dayAssignment = sessionData?.dayAssignment || null;

  // Extract exercise list to query previous comparisons
  const exercisesForComparisons = useMemo(() => {
    if (!session || session.isRestDay || !Array.isArray(session.bodyParts)) return [];
    const list = [];
    session.bodyParts.forEach((bp) => {
      (bp.exercises || []).forEach((ex) => {
        list.push({
          _id: ex._id,
          originalExerciseId: ex.originalExerciseId,
          name: ex.name
        });
      });
    });
    return list;
  }, [session]);

  const sessionTemplateId = session?.templateId?._id || session?.templateId || undefined;

  // 4. Comparisons Query
  const {
    data: comparisons = {}
  } = useQuery(
    {
      queryKey: queryKeys.gymflow.comparisons(spaceId, selectedDate),
      queryFn: () => gymflowApi.getComparisons(selectedDate, exercisesForComparisons, sessionTemplateId),
      enabled: Boolean(selectedDate && exercisesForComparisons.length > 0),
      staleTime: 60 * 1000
    },
    queryClient
  );

  // 5. Analytics Fetcher with TanStack Cache (2-minute stale time)
  const fetchAnalytics = useCallback(async (params = {}) => {
    try {
      const data = await queryClient.fetchQuery({
        queryKey: queryKeys.gymflow.analytics(spaceId, params),
        queryFn: () => gymflowApi.getAnalytics(params),
        staleTime: 2 * 60 * 1000
      });
      setAnalytics(data || null);
      return data;
    } catch (err) {
      console.error('Failed to load gym analytics', err);
      return null;
    }
  }, [spaceId]);

  // Date navigation
  const goToDate = (date) => setSelectedDate(date);
  const goToToday = () => setSelectedDate(currentDate);
  const goToPreviousDay = () => {
    const d = new Date(`${selectedDate}T00:00:00`);
    d.setDate(d.getDate() - 1);
    const pad = (n) => String(n).padStart(2, '0');
    setSelectedDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  };
  const goToNextDay = () => {
    const d = new Date(`${selectedDate}T00:00:00`);
    d.setDate(d.getDate() + 1);
    const pad = (n) => String(n).padStart(2, '0');
    setSelectedDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  };

  // --- Mutations ---

  const startWorkout = async (templateId) => {
    try {
      const res = await gymflowApi.startSession({ date: selectedDate, templateId });
      queryClient.setQueryData(queryKeys.gymflow.session(spaceId, selectedDate), (old) => ({
        ...(old || {}),
        session: res
      }));
      queryClient.invalidateQueries({ queryKey: queryKeys.gymflow.session(spaceId, selectedDate) });
      queryClient.invalidateQueries({ queryKey: queryKeys.gymflow.analytics(spaceId) });
      showToast('Workout session started!', 'success');
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to start workout';
      showToast(msg, 'error');
      throw err;
    }
  };

  const saveWorkoutProgress = async (bodyParts, treadmill) => {
    const saveTimestamp = Date.now();
    lastSaveTimestampRef.current = saveTimestamp;
    try {
      const res = await gymflowApi.updateSession(selectedDate, { bodyParts, treadmill });
      if (lastSaveTimestampRef.current === saveTimestamp) {
        queryClient.setQueryData(queryKeys.gymflow.session(spaceId, selectedDate), (old) => ({
          ...(old || {}),
          session: res
        }));
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.gymflow.analytics(spaceId) });
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save workout';
      showToast(msg, 'error');
      throw err;
    }
  };

  const finishWorkout = async (isFinished = true) => {
    try {
      const res = await gymflowApi.finishSession(selectedDate, isFinished);
      queryClient.setQueryData(queryKeys.gymflow.session(spaceId, selectedDate), (old) => ({
        ...(old || {}),
        session: res
      }));
      queryClient.invalidateQueries({ queryKey: queryKeys.gymflow.session(spaceId, selectedDate) });
      queryClient.invalidateQueries({ queryKey: queryKeys.gymflow.analytics(spaceId) });
      showToast(isFinished ? 'Workout finished and logged!' : 'Workout reopened for editing', 'success');
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to finish workout';
      showToast(msg, 'error');
      throw err;
    }
  };

  const discardWorkout = async () => {
    try {
      await gymflowApi.discardSession(selectedDate);
      queryClient.setQueryData(queryKeys.gymflow.session(spaceId, selectedDate), (old) => ({
        ...(old || {}),
        session: null
      }));
      queryClient.invalidateQueries({ queryKey: queryKeys.gymflow.session(spaceId, selectedDate) });
      queryClient.invalidateQueries({ queryKey: queryKeys.gymflow.comparisons(spaceId, selectedDate) });
      queryClient.invalidateQueries({ queryKey: queryKeys.gymflow.analytics(spaceId) });
      showToast('Workout session discarded', 'success');
      return true;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to discard workout session';
      showToast(msg, 'error');
      throw err;
    }
  };

  const markRestDay = async (reason) => {
    try {
      const res = await gymflowApi.setRestDay(selectedDate, reason);
      queryClient.setQueryData(queryKeys.gymflow.session(spaceId, selectedDate), (old) => ({
        ...(old || {}),
        session: res
      }));
      queryClient.invalidateQueries({ queryKey: queryKeys.gymflow.session(spaceId, selectedDate) });
      queryClient.invalidateQueries({ queryKey: queryKeys.gymflow.analytics(spaceId) });
      showToast('Rest day logged', 'success');
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to mark rest day';
      showToast(msg, 'error');
      throw err;
    }
  };

  const removeRestDay = async () => {
    try {
      const res = await gymflowApi.removeRestDay(selectedDate);
      queryClient.setQueryData(queryKeys.gymflow.session(spaceId, selectedDate), (old) => ({
        ...(old || {}),
        session: res
      }));
      queryClient.invalidateQueries({ queryKey: queryKeys.gymflow.session(spaceId, selectedDate) });
      queryClient.invalidateQueries({ queryKey: queryKeys.gymflow.analytics(spaceId) });
      showToast('Rest day removed', 'success');
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to remove rest day';
      showToast(msg, 'error');
      throw err;
    }
  };

  const saveTemplate = async (templateData, templateId) => {
    try {
      let res;
      if (templateId) {
        res = await gymflowApi.updateTemplate(templateId, templateData);
        showToast('Template updated successfully', 'success');
      } else {
        res = await gymflowApi.createTemplate(templateData);
        showToast('Template created successfully', 'success');
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.gymflow.templates(spaceId) });
      return res;
    } catch (err) {
      throw err;
    }
  };

  const deleteTemplate = async (templateId, templateName) => {
    try {
      await gymflowApi.deleteTemplate(templateId);
      queryClient.invalidateQueries({ queryKey: queryKeys.gymflow.templates(spaceId) });
      showToast(`Template "${templateName}" deleted`, 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete template';
      showToast(msg, 'error');
      throw err;
    }
  };

  const updateWeeklyScheduleDays = async (days) => {
    try {
      const res = await gymflowApi.updateWeeklySchedule(days);
      queryClient.setQueryData(queryKeys.gymflow.schedule(spaceId), res);
      queryClient.invalidateQueries({ queryKey: queryKeys.gymflow.schedule(spaceId) });
      showToast('Weekly workout schedule updated', 'success');
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update schedule';
      showToast(msg, 'error');
      throw err;
    }
  };

  const pauseExercise = async (templateId, exerciseId, payload) => {
    try {
      const res = await gymflowApi.pauseExercise(templateId, exerciseId, payload);
      queryClient.invalidateQueries({ queryKey: queryKeys.gymflow.templates(spaceId) });
      showToast('Exercise paused', 'success');
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to pause exercise';
      showToast(msg, 'error');
      throw err;
    }
  };

  const resumeExercise = async (templateId, exerciseId, payload) => {
    try {
      const res = await gymflowApi.resumeExercise(templateId, exerciseId, payload);
      queryClient.invalidateQueries({ queryKey: queryKeys.gymflow.templates(spaceId) });
      showToast('Exercise resumed', 'success');
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resume exercise';
      showToast(msg, 'error');
      throw err;
    }
  };

  const error = sessionQueryError?.response?.data?.message || sessionQueryError?.message || null;

  return {
    currentDate,
    selectedDate,
    session,
    dayAssignment,
    templates,
    parentWorkouts,
    weeklySchedule,
    comparisons,
    analytics,
    isLoadingSession,
    isLoadingTemplates,
    error,
    goToDate,
    goToToday,
    goToPreviousDay,
    goToNextDay,
    startWorkout,
    saveWorkoutProgress,
    finishWorkout,
    discardWorkout,
    markRestDay,
    removeRestDay,
    saveTemplate,
    deleteTemplate,
    pauseExercise,
    resumeExercise,
    updateWeeklyScheduleDays,
    fetchAnalytics,
    spaceId,
    refreshSession: () => queryClient.invalidateQueries({ queryKey: queryKeys.gymflow.session(spaceId, selectedDate) })
  };
}

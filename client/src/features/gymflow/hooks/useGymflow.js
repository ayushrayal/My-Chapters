import { useState, useEffect, useCallback, useRef } from 'react';
import { gymflowApi } from '../services/gymflow.api.js';
import { useToast } from '../../../context/ToastContext.jsx';

export function useGymflow() {
  const lastSaveTimestampRef = useRef(0);
  const [currentDate] = useState(() => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });

  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [session, setSession] = useState(null);
  const [dayAssignment, setDayAssignment] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [weeklySchedule, setWeeklySchedule] = useState(null);
  const [comparisons, setComparisons] = useState({});
  const [analytics, setAnalytics] = useState(null);

  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [error, setError] = useState(null);

  const { showToast } = useToast();

  const fetchSession = useCallback(async (date) => {
    setIsLoadingSession(true);
    setError(null);
    try {
      const data = await gymflowApi.getSession(date);
      setSession(data.session || null);
      setDayAssignment(data.dayAssignment || null);

      if (data.session && !data.session.isRestDay && data.session.bodyParts?.length > 0) {
        // Collect all exercises to fetch comparisons
        const exercises = [];
        data.session.bodyParts.forEach((bp) => {
          (bp.exercises || []).forEach((ex) => {
            exercises.push({
              _id: ex._id,
              originalExerciseId: ex.originalExerciseId,
              name: ex.name
            });
          });
        });

        if (exercises.length > 0) {
          const compData = await gymflowApi.getComparisons(date, exercises);
          setComparisons(compData || {});
        } else {
          setComparisons({});
        }
      } else {
        setComparisons({});
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load workout session');
    } finally {
      setIsLoadingSession(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    try {
      const list = await gymflowApi.getTemplates();
      setTemplates(list || []);
    } catch (err) {
      console.error('Failed to load gym templates', err);
    } finally {
      setIsLoadingTemplates(false);
    }
  }, []);

  const fetchWeeklySchedule = useCallback(async () => {
    try {
      const sched = await gymflowApi.getWeeklySchedule();
      setWeeklySchedule(sched || null);
    } catch (err) {
      console.error('Failed to load weekly schedule', err);
    }
  }, []);

  const fetchAnalytics = useCallback(async (params = {}) => {
    try {
      const data = await gymflowApi.getAnalytics(params);
      setAnalytics(data || null);
      return data;
    } catch (err) {
      console.error('Failed to load gym analytics', err);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchSession(selectedDate);
  }, [selectedDate, fetchSession]);

  useEffect(() => {
    fetchTemplates();
    fetchWeeklySchedule();
  }, [fetchTemplates, fetchWeeklySchedule]);

  // Actions
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

  const startWorkout = async (templateId) => {
    try {
      const res = await gymflowApi.startSession({ date: selectedDate, templateId });
      setSession(res);
      showToast('Workout session started!', 'success');
      await fetchSession(selectedDate);
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
      // Only commit if this was the latest save request initiated
      if (lastSaveTimestampRef.current === saveTimestamp) {
        setSession(res);
      }
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
      setSession(res);
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
      setSession(null);
      setComparisons({});
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
      setSession(res);
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
      setSession(res);
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
      await fetchTemplates();
      return res;
    } catch (err) {
      throw err;
    }
  };

  const deleteTemplate = async (templateId, templateName) => {
    try {
      await gymflowApi.deleteTemplate(templateId);
      setTemplates((prev) => prev.filter((t) => (t._id || t.id) !== templateId));
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
      setWeeklySchedule(res);
      showToast('Weekly workout schedule updated', 'success');
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update schedule';
      showToast(msg, 'error');
      throw err;
    }
  };

  return {
    currentDate,
    selectedDate,
    session,
    dayAssignment,
    templates,
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
    updateWeeklyScheduleDays,
    fetchAnalytics,
    refreshSession: () => fetchSession(selectedDate)
  };
}

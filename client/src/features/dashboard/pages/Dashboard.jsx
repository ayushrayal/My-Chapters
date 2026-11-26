import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { dashboardApi } from '../services/dashboard.api.js';
import { queryClient } from '../../../lib/queryClient.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import {
  CalendarIcon,
  CheckIcon,
  DumbbellIcon,
  MoonIcon,
  BarChartIcon
} from '../../../components/common/Icons.jsx';

function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Dashboard() {
  const { user, space } = useAuth();
  const spaceId = space?.id;

  // Date range filter state
  const [selectedRange, setSelectedRange] = useState('30d'); // '7d' | '30d' | '90d' | 'month' | 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const queryParams = useMemo(() => {
    if (selectedRange === 'custom' && customStartDate && customEndDate) {
      return { range: 'custom', startDate: customStartDate, endDate: customEndDate };
    }
    return { range: selectedRange };
  }, [selectedRange, customStartDate, customEndDate]);

  // Consolidated dashboard query
  const { data: dashboardData, isLoading, isFetching } = useQuery(
    {
      queryKey: queryKeys.dashboard.overview(spaceId, queryParams),
      queryFn: () => dashboardApi.getOverview(queryParams),
      staleTime: 60 * 1000,
      enabled: Boolean(spaceId)
    },
    queryClient
  );

  const greeting = getTimeBasedGreeting();
  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'N/A';

  const overall = dashboardData?.overall || {
    dayflowCompletionRate: 0,
    gymWorkoutCount: 0,
    gymConsistency: 0,
    somedayTotal: 0,
    somedayPlanned: 0,
    somedayPurchased: 0
  };

  const dayflow = dashboardData?.dayflow || {
    totalScheduledDays: 0,
    completedDays: 0,
    restDays: 0,
    dayCompletionRate: 0,
    taskCompletionRate: 0,
    totalTasks: 0,
    completedTasks: 0,
    skippedTasks: 0,
    pendingTasks: 0,
    weeklyTrend: []
  };

  const gymflow = dashboardData?.gymflow || {
    totalWorkoutSessions: 0,
    completedWorkouts: 0,
    restDays: 0,
    totalVolume: 0,
    totalSets: 0,
    totalReps: 0,
    totalDurationMinutes: 0,
    activeWorkoutDays: 0,
    weeklyWorkoutFrequency: 0,
    workoutConsistency: 0,
    recentActivity: [],
    performanceTrend: []
  };

  const someday = dashboardData?.someday || {
    totalItems: 0,
    plannedItems: 0,
    purchasedItems: 0,
    archivedItems: 0,
    statusDistribution: { planned: 0, purchased: 0, archived: 0 },
    recentAdditions: []
  };

  const combinedActivity = dashboardData?.combinedActivity || [];

  return (
    <div className="dashboard-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Hero Card */}
      <section className="dashboard-hero" aria-labelledby="welcome-heading">
        <div className="dashboard-hero__pattern" aria-hidden="true">
          <svg className="dashboard-hero__svg" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hero-dots" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="rgba(255, 255, 255, 0.12)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-dots)" />
          </svg>
          <div className="dashboard-hero__glow dashboard-hero__glow--one" />
          <div className="dashboard-hero__glow dashboard-hero__glow--two" />
        </div>

        <div className="dashboard-hero__content">
          <div className="dashboard-hero__tag">
            <span className="dashboard-hero__tag-dot" aria-hidden="true" />
            <span className="dashboard-hero__tag-text">Space &bull; {space?.name || 'My Space'}</span>
          </div>

          <h1
            id="welcome-heading"
            className="dashboard-hero__greeting"
            aria-label={`Hello, Welcome ${user?.username || 'User'}!`}
          >
            {greeting}, {user?.username}!
          </h1>

          <p className="dashboard-hero__subtitle">
            Comprehensive personal performance overview across Dayflow, GymFlow, and Someday.
          </p>
        </div>
      </section>

      {/* 2. Date Range Filter Bar */}
      <section
        className="dashboard-filter-bar"
        aria-label="Dashboard Date Range Selector"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#FFFFFF',
          padding: '12px 16px',
          borderRadius: '14px',
          border: '1px solid #E6E9F2'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#252943', marginRight: '4px' }}>
            Period:
          </span>
          {[
            { id: '7d', label: 'Last 7 days' },
            { id: '30d', label: 'Last 30 days' },
            { id: '90d', label: 'Last 90 days' },
            { id: 'month', label: 'This month' },
            { id: 'custom', label: 'Custom range' }
          ].map((r) => {
            const active = selectedRange === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRange(r.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: active ? 800 : 600,
                  backgroundColor: active ? '#252943' : '#F0F2F7',
                  color: active ? '#E3FF3B' : '#252943',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        {selectedRange === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #DEE0ED',
                fontSize: '13px'
              }}
              aria-label="Start Date"
            />
            <span style={{ fontSize: '13px', color: 'rgba(37,41,67,0.6)' }}>to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #DEE0ED',
                fontSize: '13px'
              }}
              aria-label="End Date"
            />
          </div>
        )}

        {isFetching && !isLoading && (
          <span style={{ fontSize: '12px', color: 'rgba(37,41,67,0.6)' }}>Updating...</span>
        )}
      </section>

      {/* 3. Overall KPI Highlights Cards */}
      <section
        className="dashboard-kpi-grid"
        aria-label="Overall Performance KPI Highlights"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px'
        }}
      >
        {/* Dayflow Completion */}
        <a
          href="/dayflow"
          className="stat-card"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div className="stat-card__icon-wrap stat-card__icon-wrap--primary" aria-hidden="true">
            <CheckIcon size={22} />
          </div>
          <div className="stat-card__content">
            <span className="stat-card__label">Dayflow Task Completion</span>
            <div className="stat-card__value-row">
              <span className="stat-card__value">
                {isLoading ? '-' : `${overall.dayflowCompletionRate}%`}
              </span>
              <span className="stat-card__accent-dot" title="Active feature" />
            </div>
            <span style={{ fontSize: '11px', color: 'rgba(37,41,67,0.6)', marginTop: '2px' }}>
              {dayflow.completedTasks} of {dayflow.totalTasks} tasks done
            </span>
          </div>
        </a>

        {/* GymFlow Workouts */}
        <a
          href="/gymflow"
          className="stat-card"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div className="stat-card__icon-wrap stat-card__icon-wrap--planned" aria-hidden="true">
            <DumbbellIcon size={22} />
          </div>
          <div className="stat-card__content">
            <span className="stat-card__label">GymFlow Workouts</span>
            <div className="stat-card__value-row">
              <span className="stat-card__value">
                {isLoading ? '-' : overall.gymWorkoutCount}
              </span>
              <span className="stat-card__status-chip stat-card__status-chip--planned">
                {overall.gymConsistency}% Consistency
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'rgba(37,41,67,0.6)', marginTop: '2px' }}>
              {gymflow.totalVolume > 0 ? `${gymflow.totalVolume.toLocaleString()} kg volume` : `${gymflow.totalSets} sets`}
            </span>
          </div>
        </a>

        {/* Someday Total & Planned */}
        <a
          href="/someday"
          className="stat-card"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div className="stat-card__icon-wrap stat-card__icon-wrap--purchased" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div className="stat-card__content">
            <span className="stat-card__label">Someday Items</span>
            <div className="stat-card__value-row">
              <span className="stat-card__value">
                {isLoading ? '-' : overall.somedayTotal}
              </span>
              <span className="stat-card__status-chip stat-card__status-chip--purchased">
                {overall.somedayPurchased} Purchased
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'rgba(37,41,67,0.6)', marginTop: '2px' }}>
              {overall.somedayPlanned} currently planned
            </span>
          </div>
        </a>
      </section>

      {/* 4. Dayflow Performance Section */}
      <section
        className="dashboard-section-card"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #E6E9F2',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#252943' }}>
              Dayflow Execution
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(37,41,67,0.65)', margin: '2px 0 0' }}>
              Daily routine consistency and task accomplishment.
            </p>
          </div>
          <a href="/dayflow" style={{ fontSize: '13px', fontWeight: 700, color: '#4F46E5', textDecoration: 'none' }}>
            Open Dayflow &rarr;
          </a>
        </div>

        {/* 4 Metrics Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px'
          }}
        >
          <div style={{ backgroundColor: '#F8FAFD', borderRadius: '12px', padding: '14px', border: '1px solid #E6E9F2' }}>
            <span style={{ fontSize: '12px', color: 'rgba(37,41,67,0.6)', fontWeight: 700 }}>SCHEDULED DAYS</span>
            <span style={{ display: 'block', fontSize: '22px', fontWeight: 900, color: '#252943', marginTop: '4px' }}>
              {dayflow.totalScheduledDays}
            </span>
          </div>

          <div style={{ backgroundColor: '#F8FAFD', borderRadius: '12px', padding: '14px', border: '1px solid #E6E9F2' }}>
            <span style={{ fontSize: '12px', color: 'rgba(37,41,67,0.6)', fontWeight: 700 }}>COMPLETED DAYS</span>
            <span style={{ display: 'block', fontSize: '22px', fontWeight: 900, color: '#16A34A', marginTop: '4px' }}>
              {dayflow.completedDays}
            </span>
          </div>

          <div style={{ backgroundColor: '#F8FAFD', borderRadius: '12px', padding: '14px', border: '1px solid #E6E9F2' }}>
            <span style={{ fontSize: '12px', color: 'rgba(37,41,67,0.6)', fontWeight: 700 }}>REST DAYS</span>
            <span style={{ display: 'block', fontSize: '22px', fontWeight: 900, color: '#2563EB', marginTop: '4px' }}>
              {dayflow.restDays}
            </span>
          </div>

          <div style={{ backgroundColor: '#F8FAFD', borderRadius: '12px', padding: '14px', border: '1px solid #E6E9F2' }}>
            <span style={{ fontSize: '12px', color: 'rgba(37,41,67,0.6)', fontWeight: 700 }}>TASK RATE</span>
            <span style={{ display: 'block', fontSize: '22px', fontWeight: 900, color: '#4F46E5', marginTop: '4px' }}>
              {dayflow.taskCompletionRate}%
            </span>
          </div>
        </div>

        {/* Task Counts Summary Pills */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)', color: '#15803D', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
            ✓ {dayflow.completedTasks} Completed Tasks
          </span>
          <span style={{ backgroundColor: 'rgba(220, 38, 38, 0.08)', color: '#DC2626', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
            ✕ {dayflow.skippedTasks} Skipped Tasks
          </span>
          <span style={{ backgroundColor: '#F0F2F7', color: '#252943', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
            ⏳ {dayflow.pendingTasks} Pending Tasks
          </span>
        </div>

        {/* Rest Day Integrity Note */}
        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(37,41,67,0.55)', fontStyle: 'italic' }}>
          * Rest days are intentionally excluded from completion percentages and working day metrics.
        </p>
      </section>

      {/* 5. GymFlow Performance Section */}
      <section
        className="dashboard-section-card"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #E6E9F2',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#252943' }}>
              GymFlow Workouts & Performance
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(37,41,67,0.65)', margin: '2px 0 0' }}>
              Workout volume, set execution, and exercise consistency.
            </p>
          </div>
          <a href="/gymflow" style={{ fontSize: '13px', fontWeight: 700, color: '#4F46E5', textDecoration: 'none' }}>
            Open GymFlow &rarr;
          </a>
        </div>

        {/* 4 Workout KPI cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px'
          }}
        >
          <div style={{ backgroundColor: '#F8FAFD', borderRadius: '12px', padding: '14px', border: '1px solid #E6E9F2' }}>
            <span style={{ fontSize: '12px', color: 'rgba(37,41,67,0.6)', fontWeight: 700 }}>WORKOUTS DONE</span>
            <span style={{ display: 'block', fontSize: '22px', fontWeight: 900, color: '#252943', marginTop: '4px' }}>
              {gymflow.completedWorkouts}
            </span>
          </div>

          <div style={{ backgroundColor: '#F8FAFD', borderRadius: '12px', padding: '14px', border: '1px solid #E6E9F2' }}>
            <span style={{ fontSize: '12px', color: 'rgba(37,41,67,0.6)', fontWeight: 700 }}>TOTAL VOLUME</span>
            <span style={{ display: 'block', fontSize: '22px', fontWeight: 900, color: '#4F46E5', marginTop: '4px' }}>
              {gymflow.totalVolume.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 600 }}>kg</span>
            </span>
          </div>

          <div style={{ backgroundColor: '#F8FAFD', borderRadius: '12px', padding: '14px', border: '1px solid #E6E9F2' }}>
            <span style={{ fontSize: '12px', color: 'rgba(37,41,67,0.6)', fontWeight: 700 }}>SETS & REPS</span>
            <span style={{ display: 'block', fontSize: '22px', fontWeight: 900, color: '#252943', marginTop: '4px' }}>
              {gymflow.totalSets} <span style={{ fontSize: '14px', fontWeight: 600 }}>sets</span> · {gymflow.totalReps} <span style={{ fontSize: '14px', fontWeight: 600 }}>reps</span>
            </span>
          </div>

          <div style={{ backgroundColor: '#F8FAFD', borderRadius: '12px', padding: '14px', border: '1px solid #E6E9F2' }}>
            <span style={{ fontSize: '12px', color: 'rgba(37,41,67,0.6)', fontWeight: 700 }}>FREQUENCY / WK</span>
            <span style={{ display: 'block', fontSize: '22px', fontWeight: 900, color: '#16A34A', marginTop: '4px' }}>
              {gymflow.weeklyWorkoutFrequency} <span style={{ fontSize: '14px', fontWeight: 600 }}>/ wk</span>
            </span>
          </div>
        </div>

        {/* Recent Workouts List */}
        {gymflow.recentActivity && gymflow.recentActivity.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#252943' }}>
              Recent Workouts:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
              {gymflow.recentActivity.map((r, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#F8FAFD',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    border: '1px solid #E6E9F2',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#252943', display: 'block' }}>
                      {r.templateName}
                    </span>
                    <span style={{ fontSize: '11px', color: 'rgba(37,41,67,0.6)' }}>
                      {r.date}
                    </span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#4F46E5' }}>
                    {r.score}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 6. Someday Overview Section */}
      <section
        className="dashboard-section-card"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #E6E9F2',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#252943' }}>
              Someday Tracker
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(37,41,67,0.65)', margin: '2px 0 0' }}>
              Life goals, aspirational purchases, and wishlist items.
            </p>
          </div>
          <a href="/someday" style={{ fontSize: '13px', fontWeight: 700, color: '#4F46E5', textDecoration: 'none' }}>
            Open Someday &rarr;
          </a>
        </div>

        {/* Someday 3 Counts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
          <div style={{ backgroundColor: '#F8FAFD', borderRadius: '12px', padding: '14px', border: '1px solid #E6E9F2' }}>
            <span style={{ fontSize: '12px', color: 'rgba(37,41,67,0.6)', fontWeight: 700 }}>TOTAL ITEMS</span>
            <span style={{ display: 'block', fontSize: '22px', fontWeight: 900, color: '#252943', marginTop: '4px' }}>
              {someday.totalItems}
            </span>
          </div>

          <div style={{ backgroundColor: '#F8FAFD', borderRadius: '12px', padding: '14px', border: '1px solid #E6E9F2' }}>
            <span style={{ fontSize: '12px', color: 'rgba(37,41,67,0.6)', fontWeight: 700 }}>PLANNED</span>
            <span style={{ display: 'block', fontSize: '22px', fontWeight: 900, color: '#2563EB', marginTop: '4px' }}>
              {someday.plannedItems}
            </span>
          </div>

          <div style={{ backgroundColor: '#F8FAFD', borderRadius: '12px', padding: '14px', border: '1px solid #E6E9F2' }}>
            <span style={{ fontSize: '12px', color: 'rgba(37,41,67,0.6)', fontWeight: 700 }}>PURCHASED</span>
            <span style={{ display: 'block', fontSize: '22px', fontWeight: 900, color: '#16A34A', marginTop: '4px' }}>
              {someday.purchasedItems}
            </span>
          </div>
        </div>

        {/* Recent Additions */}
        {someday.recentAdditions && someday.recentAdditions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#252943' }}>
              Recent Someday Items:
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {someday.recentAdditions.map((item) => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: '#F8FAFD',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid #E6E9F2'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#252943' }}>
                      {item.title}
                    </span>
                    <span style={{ fontSize: '11px', color: 'rgba(37,41,67,0.6)', backgroundColor: '#DEE0ED', padding: '1px 6px', borderRadius: '4px' }}>
                      {item.categoryName}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: item.status === 'PURCHASED' ? '#16A34A' : '#2563EB'
                    }}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 7. Combined Activity Stream */}
      {combinedActivity.length > 0 && (
        <section
          className="dashboard-section-card"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #E6E9F2',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#252943' }}>
            Combined Activity Stream
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {combinedActivity.map((act, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#F8FAFD',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  border: '1px solid #E6E9F2'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 7px',
                      borderRadius: '6px',
                      backgroundColor: act.type === 'GYMFLOW' ? 'rgba(79, 70, 229, 0.1)' : 'rgba(22, 163, 74, 0.1)',
                      color: act.type === 'GYMFLOW' ? '#4F46E5' : '#15803D'
                    }}
                  >
                    {act.type}
                  </span>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#252943', display: 'block' }}>
                      {act.title}
                    </span>
                    <span style={{ fontSize: '11px', color: 'rgba(37,41,67,0.6)' }}>
                      {act.detail}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(37,41,67,0.6)' }}>
                  {act.date}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 8. Account & Space Overview (Preserved for compatibility and user information) */}
      <section className="account-card" aria-labelledby="account-details-heading">
        <header className="account-card__header">
          <div className="account-card__header-left">
            <h2 id="account-details-heading" className="account-card__title">
              Account & Space Overview
            </h2>
            <p className="account-card__header-desc">
              Your single-tenant space parameters and authentication status.
            </p>
          </div>
          <span className="account-card__role-chip" title="Account Role">
            {user?.role || 'ADMIN'}
          </span>
        </header>

        <div className="account-card__grid">
          <div className="account-card__item">
            <div className="account-card__icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div className="account-card__item-content">
              <span className="account-card__label">Personal Space</span>
              <span className="account-card__value">{space?.name || 'My Space'}</span>
            </div>
          </div>

          <div className="account-card__item">
            <div className="account-card__icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <div className="account-card__item-content">
              <span className="account-card__label">Space Slug</span>
              <span className="account-card__value text-muted">{space?.slug || 'my-space'}</span>
            </div>
          </div>

          <div className="account-card__item">
            <div className="account-card__icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="account-card__item-content">
              <span className="account-card__label">Username</span>
              <span className="account-card__value">{user?.username}</span>
            </div>
          </div>

          <div className="account-card__item">
            <div className="account-card__icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div className="account-card__item-content">
              <span className="account-card__label">Email Address</span>
              <span className="account-card__value">{user?.email}</span>
            </div>
          </div>

          <div className="account-card__item">
            <div className="account-card__icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="account-card__item-content">
              <span className="account-card__label">Member Since</span>
              <span className="account-card__value">{formattedDate}</span>
            </div>
          </div>

          <div className="account-card__item">
            <div className="account-card__icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div className="account-card__item-content">
              <span className="account-card__label">Session Status</span>
              <span className="account-card__value font-medium" style={{ color: '#16a34a' }}>
                Active (HttpOnly Cookie)
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

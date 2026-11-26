import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useInRouterContext } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { dashboardApi } from '../services/dashboard.api.js';
import { queryClient } from '../../../lib/queryClient.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { WindowCard, FolderCard } from '../../../components/common/WindowCard.jsx';
import { StatCard } from '../../../components/common/StatCard.jsx';
import { Ticker } from '../../../components/common/Ticker.jsx';
import {
  CalendarIcon,
  CheckIcon,
  DumbbellIcon,
  BarChartIcon
} from '../../../components/common/Icons.jsx';

function SafeLink({ to, children, ...props }) {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <Link to={to} {...props}>{children}</Link>;
  }
  return <a href={to} {...props}>{children}</a>;
}

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
    <div className="dashboard-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Hero Card: Flat Primary Blue, 3px border, 6px hard shadow, Lime Sticker */}
      <section className="dashboard-hero" aria-labelledby="welcome-heading">
        <div className="dashboard-hero__content">
          <div className="neo-sticker" style={{ marginBottom: '12px' }}>
            <span>SPACE • {space?.name || 'TAMASHA'}</span>
          </div>

          <h1
            id="welcome-heading"
            className="dashboard-hero__greeting"
          >
            Hello, Welcome {user?.username}!
          </h1>

          <p className="dashboard-hero__subtitle">
            Comprehensive personal performance overview across Dayflow, GymFlow, and Someday.
          </p>
        </div>
      </section>

      {/* Ticker Strip below Hero */}
      <Ticker items={['DAYFLOW • ROUTINES & HABITS', 'GYMFLOW • LIFT & TRACK', 'SOMEDAY • WISHLIST & GOALS', 'CONSISTENCY OVER INTENSITY']} />

      {/* 2. Date Range Filter Bar: FilterChips in single-line horizontal scroll */}
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
          borderRadius: '10px',
          border: '2px solid #252943',
          boxShadow: '3px 3px 0 #252943'
        }}
      >
        <div className="filter-chips" style={{ padding: '2px 0', margin: 0 }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#252943', textTransform: 'uppercase', letterSpacing: '0.04em', alignSelf: 'center', marginRight: '6px' }}>
            Period:
          </span>
          {[
            { id: '7d', label: 'Last 7 days' },
            { id: '30d', label: 'Last 30 days' },
            { id: 'month', label: 'This month' },
            { id: '90d', label: 'Last 90 days' },
            { id: 'custom', label: 'Custom range' }
          ].map((r) => {
            const active = selectedRange === r.id;
            return (
              <button
                key={r.id}
                type="button"
                className={`filter-chip ${active ? 'filter-chip--active' : ''}`}
                onClick={() => setSelectedRange(r.id)}
              >
                <span className="filter-chip__label">{r.label}</span>
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
              className="form-input"
              style={{
                height: '38px',
                minHeight: '38px',
                padding: '0 8px',
                border: '2px solid #252943',
                borderRadius: '6px',
                fontSize: '13px',
                backgroundColor: '#FFFFFF'
              }}
              aria-label="Start Date"
            />
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#252943' }}>TO</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="form-input"
              style={{
                height: '38px',
                minHeight: '38px',
                padding: '0 8px',
                border: '2px solid #252943',
                borderRadius: '6px',
                fontSize: '13px',
                backgroundColor: '#FFFFFF'
              }}
              aria-label="End Date"
            />
          </div>
        )}

        {isFetching && !isLoading && (
          <span className="neo-tag neo-tag--lime" style={{ fontSize: '11px' }}>UPDATING...</span>
        )}
      </section>

      {/* 3. Summary Stat Cards (1 col mobile, 3 col desktop) */}
      <section
        className="dashboard-kpi-grid"
        aria-label="Overall Performance KPI Highlights"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px'
        }}
      >
        <SafeLink to="/dayflow" style={{ textDecoration: 'none', color: 'inherit' }}>
          <StatCard
            label="Dayflow Task Completion"
            value={isLoading ? '-' : `${overall.dayflowCompletionRate}%`}
            subvalue={`${dayflow.completedTasks} of ${dayflow.totalTasks} tasks done`}
            badge={<span className="neo-tag neo-tag--primary">DAYFLOW</span>}
            icon={<CheckIcon size={16} />}
            accentColor="primary"
          />
        </SafeLink>

        <SafeLink to="/gymflow" style={{ textDecoration: 'none', color: 'inherit' }}>
          <StatCard
            label="GymFlow Workouts"
            value={isLoading ? '-' : overall.gymWorkoutCount}
            subvalue={gymflow.totalVolume > 0 ? `${gymflow.totalVolume.toLocaleString()} kg volume` : `${gymflow.totalSets} sets`}
            badge={<span className="neo-tag neo-tag--lime">{overall.gymConsistency}% CONSISTENCY</span>}
            icon={<DumbbellIcon size={16} />}
            accentColor="lime"
          />
        </SafeLink>

        <SafeLink to="/someday" style={{ textDecoration: 'none', color: 'inherit' }}>
          <StatCard
            label="Someday Items"
            value={isLoading ? '-' : overall.somedayTotal}
            subvalue={`${overall.somedayPlanned} planned · ${overall.somedayPurchased} purchased`}
            badge={<span className="neo-tag neo-tag--success">{overall.somedayPurchased} PURCHASED</span>}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            }
            accentColor="green"
          />
        </SafeLink>
      </section>

      {/* 4. Dayflow Performance Section: WindowCard */}
      <WindowCard
        title="Dayflow Execution"
        headerBg="canvas"
        action={
          <SafeLink to="/dayflow" className="btn btn--sm btn--secondary" style={{ height: '28px', minHeight: '28px', fontSize: '11px', padding: '0 10px' }}>
            Open Dayflow &rarr;
          </SafeLink>
        }
      >
        <p style={{ fontSize: '13px', color: 'rgba(37,41,67,0.7)', margin: '0 0 14px 0' }}>
          Daily routine consistency and task accomplishment.
        </p>

        {/* 2-column grid of bordered tiles */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px'
          }}
        >
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '6px', padding: '12px', border: '2px solid #252943', boxShadow: '2px 2px 0 #252943' }}>
            <span style={{ fontSize: '12px', color: 'rgba(37,41,67,0.7)', fontWeight: 800, textTransform: 'uppercase' }}>SCHEDULED DAYS</span>
            <span style={{ display: 'block', fontSize: '28px', fontWeight: 800, color: '#252943', marginTop: '2px', lineHeight: 1 }}>
              {dayflow.totalScheduledDays}
            </span>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '6px', padding: '12px', border: '2px solid #252943', boxShadow: '2px 2px 0 #252943' }}>
            <span style={{ fontSize: '12px', color: 'rgba(37,41,67,0.7)', fontWeight: 800, textTransform: 'uppercase' }}>COMPLETED DAYS</span>
            <span style={{ display: 'block', fontSize: '28px', fontWeight: 800, color: '#168B68', marginTop: '2px', lineHeight: 1 }}>
              {dayflow.completedDays}
            </span>
          </div>

          <div style={{ backgroundColor: '#DEE0ED', borderRadius: '6px', padding: '12px', border: '2px solid #252943', boxShadow: '2px 2px 0 #252943' }}>
            <span style={{ fontSize: '12px', color: '#252943', fontWeight: 800, textTransform: 'uppercase' }}>REST DAYS</span>
            <span style={{ display: 'block', fontSize: '28px', fontWeight: 800, color: '#252943', marginTop: '2px', lineHeight: 1 }}>
              {dayflow.restDays}
            </span>
          </div>

          <div style={{ backgroundColor: '#E3FF3B', borderRadius: '6px', padding: '12px', border: '2px solid #252943', boxShadow: '2px 2px 0 #252943' }}>
            <span style={{ fontSize: '12px', color: '#252943', fontWeight: 800, textTransform: 'uppercase' }}>TASK RATE</span>
            <span style={{ display: 'block', fontSize: '28px', fontWeight: 800, color: '#252943', marginTop: '2px', lineHeight: 1 }}>
              {dayflow.taskCompletionRate}%
            </span>
          </div>
        </div>

        {/* Task Counts Summary Tags */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px' }}>
          <span className="neo-tag neo-tag--success">
            ✓ {dayflow.completedTasks} Completed Tasks
          </span>
          <span className="neo-tag" style={{ backgroundColor: '#DC2626', color: '#FFFFFF' }}>
            ✕ {dayflow.skippedTasks} Skipped Tasks
          </span>
          <span className="neo-tag neo-tag--secondary">
            ⏳ {dayflow.pendingTasks} Pending Tasks
          </span>
        </div>

        <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: 'rgba(37,41,67,0.6)', fontStyle: 'italic' }}>
          * Rest days are intentionally excluded from completion percentages and working day metrics.
        </p>
      </WindowCard>

      {/* 5. GymFlow Performance Section: WindowCard */}
      <WindowCard
        title="GymFlow Workouts & Performance"
        headerBg="canvas"
        action={
          <SafeLink to="/gymflow" className="btn btn--sm btn--secondary" style={{ height: '28px', minHeight: '28px', fontSize: '11px', padding: '0 10px' }}>
            Open GymFlow &rarr;
          </SafeLink>
        }
      >
        <p style={{ fontSize: '13px', color: 'rgba(37,41,67,0.7)', margin: '0 0 14px 0' }}>
          Workout volume, set execution, and exercise consistency.
        </p>

        {/* 2-column grid of bordered tiles */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px'
          }}
        >
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '6px', padding: '12px', border: '2px solid #252943', boxShadow: '2px 2px 0 #252943' }}>
            <span style={{ fontSize: '12px', color: 'rgba(37,41,67,0.7)', fontWeight: 800, textTransform: 'uppercase' }}>WORKOUTS DONE</span>
            <span style={{ display: 'block', fontSize: '28px', fontWeight: 800, color: '#252943', marginTop: '2px', lineHeight: 1 }}>
              {gymflow.completedWorkouts}
            </span>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '6px', padding: '12px', border: '2px solid #252943', boxShadow: '2px 2px 0 #252943' }}>
            <span style={{ fontSize: '12px', color: 'rgba(37,41,67,0.7)', fontWeight: 800, textTransform: 'uppercase' }}>TOTAL VOLUME</span>
            <span style={{ display: 'block', fontSize: '28px', fontWeight: 800, color: '#3A4EFB', marginTop: '2px', lineHeight: 1 }}>
              {gymflow.totalVolume.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 700 }}>kg</span>
            </span>
          </div>

          <div style={{ backgroundColor: '#DEE0ED', borderRadius: '6px', padding: '12px', border: '2px solid #252943', boxShadow: '2px 2px 0 #252943' }}>
            <span style={{ fontSize: '12px', color: '#252943', fontWeight: 800, textTransform: 'uppercase' }}>SETS & REPS</span>
            <span style={{ display: 'block', fontSize: '24px', fontWeight: 800, color: '#252943', marginTop: '2px', lineHeight: 1 }}>
              {gymflow.totalSets} <span style={{ fontSize: '14px', fontWeight: 700 }}>sets</span> · {gymflow.totalReps} <span style={{ fontSize: '14px', fontWeight: 700 }}>reps</span>
            </span>
          </div>

          <div style={{ backgroundColor: '#E3FF3B', borderRadius: '6px', padding: '12px', border: '2px solid #252943', boxShadow: '2px 2px 0 #252943' }}>
            <span style={{ fontSize: '12px', color: '#252943', fontWeight: 800, textTransform: 'uppercase' }}>FREQUENCY / WK</span>
            <span style={{ display: 'block', fontSize: '28px', fontWeight: 800, color: '#252943', marginTop: '2px', lineHeight: 1 }}>
              {gymflow.weeklyWorkoutFrequency} <span style={{ fontSize: '14px', fontWeight: 700 }}>/ wk</span>
            </span>
          </div>
        </div>

        {/* Recent Workouts List */}
        {gymflow.recentActivity && gymflow.recentActivity.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#252943', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Recent Workouts:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
              {gymflow.recentActivity.map((r, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    border: '2px solid #252943',
                    boxShadow: '2px 2px 0 #252943',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#252943', display: 'block' }}>
                      {r.templateName}
                    </span>
                    <span style={{ fontSize: '11px', color: 'rgba(37,41,67,0.7)', fontWeight: 600 }}>
                      {r.date}
                    </span>
                  </div>
                  <span className="neo-tag neo-tag--lime">
                    {r.score}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </WindowCard>

      {/* 6. Someday Overview Section: WindowCard */}
      <WindowCard
        title="Someday Tracker"
        headerBg="canvas"
        action={
          <SafeLink to="/someday" className="btn btn--sm btn--secondary" style={{ height: '28px', minHeight: '28px', fontSize: '11px', padding: '0 10px' }}>
            Open Someday &rarr;
          </SafeLink>
        }
      >
        <p style={{ fontSize: '13px', color: 'rgba(37,41,67,0.7)', margin: '0 0 14px 0' }}>
          Life goals, aspirational purchases, and wishlist items.
        </p>

        {/* 3 Counts Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '6px', padding: '12px', border: '2px solid #252943', boxShadow: '2px 2px 0 #252943' }}>
            <span style={{ fontSize: '12px', color: 'rgba(37,41,67,0.7)', fontWeight: 800, textTransform: 'uppercase' }}>TOTAL ITEMS</span>
            <span style={{ display: 'block', fontSize: '28px', fontWeight: 800, color: '#252943', marginTop: '2px', lineHeight: 1 }}>
              {someday.totalItems}
            </span>
          </div>

          <div style={{ backgroundColor: '#33A4FA', borderRadius: '6px', padding: '12px', border: '2px solid #252943', boxShadow: '2px 2px 0 #252943' }}>
            <span style={{ fontSize: '12px', color: '#252943', fontWeight: 800, textTransform: 'uppercase' }}>PLANNED</span>
            <span style={{ display: 'block', fontSize: '28px', fontWeight: 800, color: '#252943', marginTop: '2px', lineHeight: 1 }}>
              {someday.plannedItems}
            </span>
          </div>

          <div style={{ backgroundColor: '#168B68', borderRadius: '6px', padding: '12px', border: '2px solid #252943', boxShadow: '2px 2px 0 #252943' }}>
            <span style={{ fontSize: '12px', color: '#FFFFFF', fontWeight: 800, textTransform: 'uppercase' }}>PURCHASED</span>
            <span style={{ display: 'block', fontSize: '28px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px', lineHeight: 1 }}>
              {someday.purchasedItems}
            </span>
          </div>
        </div>

        {/* Recent Additions: FIXED category chip & status collision with flex-wrap and min-width: 0 */}
        {someday.recentAdditions && someday.recentAdditions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#252943', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Recent Someday Items:
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {someday.recentAdditions.map((item) => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    border: '2px solid #252943',
                    boxShadow: '2px 2px 0 #252943',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  {/* First line: Item title */}
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#252943', wordBreak: 'break-word' }}>
                    {item.title}
                  </span>
                  {/* Second line: Flex row with category chip and status */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', minWidth: 0 }}>
                    <span className="neo-tag neo-tag--canvas">
                      {item.categoryName}
                    </span>
                    <span className={`neo-tag ${item.status === 'PURCHASED' ? 'neo-tag--success' : 'neo-tag--secondary'}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </WindowCard>

      {/* 7. Combined Activity Stream: FolderCards */}
      {combinedActivity.length > 0 && (
        <WindowCard title="Combined Activity Stream" headerBg="canvas">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {combinedActivity.map((act, i) => (
              <FolderCard
                key={i}
                tabLabel={act.type}
                tabColor={act.type === 'GYMFLOW' ? 'blue' : 'lime'}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#252943' }}>
                    {act.title}
                  </span>
                  {act.detail && (
                    <span style={{ fontSize: '12px', color: 'rgba(37,41,67,0.7)', lineHeight: 1.4 }}>
                      {act.detail}
                    </span>
                  )}
                  <div style={{ marginTop: '6px' }}>
                    <span className="neo-tag neo-tag--canvas" style={{ whiteSpace: 'nowrap' }}>
                      {act.date}
                    </span>
                  </div>
                </div>
              </FolderCard>
            ))}
          </div>
        </WindowCard>
      )}

      {/* 8. Account & Space Overview: WindowCard with 2-col desktop, 1-col mobile grid */}
      <WindowCard
        title="Account & Space Overview"
        headerBg="canvas"
        action={
          <span className="neo-sticker" style={{ fontSize: '10px', padding: '2px 6px' }}>
            {user?.role || 'ADMIN'}
          </span>
        }
      >
        <p style={{ fontSize: '13px', color: 'rgba(37,41,67,0.7)', margin: '0 0 14px 0' }}>
          Your single-tenant space parameters and authentication status.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', border: '2px solid #252943', borderRadius: '6px', backgroundColor: '#FFFFFF', boxShadow: '2px 2px 0 #252943' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: '#E3FF3B', border: '2px solid #252943', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#252943" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(37,41,67,0.7)', textTransform: 'uppercase' }}>PERSONAL SPACE</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#252943' }}>{space?.name || 'My Space'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', border: '2px solid #252943', borderRadius: '6px', backgroundColor: '#FFFFFF', boxShadow: '2px 2px 0 #252943' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: '#33A4FA', border: '2px solid #252943', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#252943" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(37,41,67,0.7)', textTransform: 'uppercase' }}>SPACE SLUG</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#252943' }}>{space?.slug || 'my-space'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', border: '2px solid #252943', borderRadius: '6px', backgroundColor: '#FFFFFF', boxShadow: '2px 2px 0 #252943' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: '#E3FF3B', border: '2px solid #252943', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#252943" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(37,41,67,0.7)', textTransform: 'uppercase' }}>USERNAME</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#252943' }}>{user?.username}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', border: '2px solid #252943', borderRadius: '6px', backgroundColor: '#FFFFFF', boxShadow: '2px 2px 0 #252943' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: '#33A4FA', border: '2px solid #252943', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#252943" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(37,41,67,0.7)', textTransform: 'uppercase' }}>EMAIL ADDRESS</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#252943' }}>{user?.email}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', border: '2px solid #252943', borderRadius: '6px', backgroundColor: '#FFFFFF', boxShadow: '2px 2px 0 #252943' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: '#DEE0ED', border: '2px solid #252943', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#252943" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(37,41,67,0.7)', textTransform: 'uppercase' }}>MEMBER SINCE</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#252943' }}>{formattedDate}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', border: '2px solid #252943', borderRadius: '6px', backgroundColor: '#FFFFFF', boxShadow: '2px 2px 0 #252943' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: '#168B68', border: '2px solid #252943', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(37,41,67,0.7)', textTransform: 'uppercase' }}>SESSION STATUS</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#168B68' }}>
                Active (HttpOnly Cookie)
              </span>
            </div>
          </div>
        </div>
      </WindowCard>
    </div>
  );
}

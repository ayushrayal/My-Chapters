import { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  SkipForwardIcon,
  MoonIcon,
  BarChartIcon,
  SparklesIcon,
  LayoutTemplateIcon,
  InfoIcon,
  ClockIcon,
  CalendarIcon
} from '../../../components/common/Icons.jsx';

function AnimatedNumber({ value, suffix = '', duration = 650 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const end = Math.round(Number(value) || 0);
    if (prefersReducedMotion) {
      setDisplayValue(end);
      return;
    }

    const start = 0;
    if (start === end) {
      setDisplayValue(end);
      return;
    }

    const startTime = performance.now();
    let animationFrame;

    const updateNumber = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(start + (end - start) * ease);
      setDisplayValue(current);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(updateNumber);
      }
    };

    animationFrame = requestAnimationFrame(updateNumber);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return (
    <>
      {displayValue}
      {suffix}
    </>
  );
}

function formatDateLabel(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return `${monthNames[m] || parts[1]} ${d}`;
  }
  return dateStr;
}

function shouldShowDate(idx, total) {
  if (total <= 8) return true;
  if (total <= 16) return idx % 2 === 0 || idx === total - 1;
  if (total <= 35) return idx % 4 === 0 || idx === total - 1;
  return idx % 7 === 0 || idx === total - 1;
}

export function PerformanceAnalytics({
  analytics,
  onRefresh,
  isLoading = false
}) {
  const [selectedRange, setSelectedRange] = useState('30d');
  const [breakdownTab, setBreakdownTab] = useState('weekly');
  const [isFetching, setIsFetching] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  useEffect(() => {
    let days = 30;
    if (selectedRange === '7d') days = 7;
    if (selectedRange === '90d') days = 90;

    const end = new Date().toISOString().split('T')[0];
    const d = new Date();
    d.setDate(d.getDate() - days);
    const start = d.toISOString().split('T')[0];

    if (typeof onRefresh === 'function') {
      setIsFetching(true);
      Promise.resolve(onRefresh(start, end)).finally(() => {
        setIsFetching(false);
      });
    }
  }, [selectedRange, onRefresh]);

  const rawSummary = analytics?.summary || {};
  const totalTasks = rawSummary.totalTasks ?? 0;
  const completedTasks = rawSummary.completedTasks ?? 0;
  const skippedTasks = rawSummary.skippedTasks ?? 0;
  const pendingTasks =
    rawSummary.pendingTasks ??
    Math.max(0, totalTasks - completedTasks - skippedTasks);

  const completionPercentage =
    rawSummary.completionPercentage ??
    rawSummary.overallCompletionRate ??
    (totalTasks > 0 ? Number(((completedTasks / totalTasks) * 100).toFixed(1)) : 0);

  const completedPct = totalTasks > 0 ? Number(((completedTasks / totalTasks) * 100).toFixed(1)) : 0;
  const pendingPct = totalTasks > 0 ? Number(((pendingTasks / totalTasks) * 100).toFixed(1)) : 0;
  const skippedPct = totalTasks > 0 ? Number(((skippedTasks / totalTasks) * 100).toFixed(1)) : 0;

  const totalSchedules = rawSummary.totalSchedules ?? rawSummary.scheduledDaysCount ?? 0;
  const finishedDays = rawSummary.finishedDays ?? rawSummary.finishedDaysCount ?? 0;
  const restDays = rawSummary.restDays ?? rawSummary.restDaysCount ?? 0;
  const finishRate = rawSummary.finishRate ?? (totalSchedules > 0 ? Math.round((finishedDays / totalSchedules) * 100) : 0);

  const trendList = analytics?.weeklyTrend || analytics?.dailyTrend || [];
  const weeklyPerformance = analytics?.weeklyPerformance || [];
  const monthlyPerformance = analytics?.monthlyPerformance || [];
  const templateBreakdown = analytics?.templateBreakdown || [];

  // Sort templates descending by performance
  const sortedTemplates = [...templateBreakdown].sort((a, b) => {
    const rateA = a.completionPercentage ?? a.completionRate ?? 0;
    const rateB = b.completionPercentage ?? b.completionRate ?? 0;
    return rateB - rateA;
  });

  // Identify best day in trend
  let maxRate = 0;
  let bestDayDate = null;
  trendList.forEach((d) => {
    const rate = d.completionPercentage ?? d.completionRate ?? 0;
    if (d.status !== 'REST_DAY' && rate > maxRate) {
      maxRate = rate;
      bestDayDate = d.date;
    }
  });

  // Calculate SVG circular ring for hero card
  const ringRadius = 26;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset =
    ringCircumference - (Math.min(100, Math.max(0, completionPercentage)) / 100) * ringCircumference;

  const showSkeleton = isLoading || (isFetching && !analytics);

  if (showSkeleton) {
    return (
      <div className="dayflow-analytics-view">
        <div className="dayflow-skeleton-list">
          <div className="dayflow-skeleton-card">
            <div className="skeleton-bone skeleton-bone--title" />
            <div className="skeleton-bone skeleton-bone--text" />
          </div>
          <div className="analytics-kpi-grid">
            <div className="dayflow-skeleton-card"><div className="skeleton-bone skeleton-bone--btn" /></div>
            <div className="dayflow-skeleton-card"><div className="skeleton-bone skeleton-bone--btn" /></div>
            <div className="dayflow-skeleton-card"><div className="skeleton-bone skeleton-bone--btn" /></div>
            <div className="dayflow-skeleton-card"><div className="skeleton-bone skeleton-bone--btn" /></div>
          </div>
        </div>
      </div>
    );
  }

  // Chart layout calculations
  const svgWidth = 600;
  const svgHeight = 220;
  const chartPadLeft = 46;
  const chartPadRight = 20;
  const chartPadTop = 24;
  const chartPadBottom = 40;
  const plotWidth = svgWidth - chartPadLeft - chartPadRight;
  const plotHeight = svgHeight - chartPadTop - chartPadBottom;

  const isSparse = trendList.length > 0 && trendList.length <= 2;
  const slotWidth = trendList.length > 0 ? plotWidth / trendList.length : plotWidth;
  const barWidth = isSparse ? 44 : Math.min(32, Math.max(10, slotWidth * 0.55));

  const hasNoData = !analytics || (totalSchedules === 0 && totalTasks === 0 && restDays === 0);

  return (
    <div className="dayflow-analytics-view">
      {/* Analytics Header Row */}
      <div className="dayflow-analytics-view__header">
        <div className="dayflow-analytics-view__titles">
          <h2 className="dayflow-analytics-view__title">Performance & Consistency</h2>
          <p className="dayflow-analytics-view__subtitle">
            Authentic productivity metrics based exclusively on your real scheduled records.
          </p>
        </div>

        {/* Compact Segmented Control with Active Sliding Pill */}
        <div className="analytics-range-selector" role="group" aria-label="Select date range">
          {[
            { id: '7d', label: 'Last 7 days', mobileLabel: '7 days' },
            { id: '30d', label: 'Last 30 days', mobileLabel: '30 days' },
            { id: '90d', label: 'Last 90 days', mobileLabel: '90 days' }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`analytics-range-selector__pill ${
                selectedRange === item.id ? 'analytics-range-selector__pill--active' : ''
              }`}
              onClick={() => setSelectedRange(item.id)}
            >
              <span className="analytics-range-selector__label--desktop">{item.label}</span>
              <span className="analytics-range-selector__label--mobile">{item.mobileLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* No Data Empty State Banner */}
      {hasNoData && (
        <div className="dayflow-empty-state" style={{ margin: '10px 0' }}>
          <div className="dayflow-empty-state__icon">
            <BarChartIcon size={40} />
          </div>
          <h3 className="dayflow-empty-state__title">No performance data yet</h3>
          <p className="dayflow-empty-state__description">
            Your performance metrics, task completion rates, and routine trends will appear here automatically once you schedule and complete days with Dayflow.
          </p>
        </div>
      )}

      {/* 5-Card Responsive KPI Grid */}
      <div className="analytics-kpi-grid">
        {/* Hero Card: Task Completion Rate */}
        <div className="kpi-card kpi-card--hero">
          <div className="kpi-card--hero__top">
            <div className="kpi-card--hero__info">
              <span className="kpi-card--hero__label">
                <span className="kpi-card--hero__label--desktop">Task Completion Rate</span>
                <span className="kpi-card--hero__label--mobile">Completion rate</span>
              </span>
              <div className="kpi-card--hero__value">
                <AnimatedNumber value={completionPercentage} suffix="%" />
              </div>
            </div>

            {/* Circular Ring */}
            <div className="kpi-card--hero__ring-wrap" aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 64 64" className="kpi-card--hero__ring-svg">
                <circle
                  cx="32"
                  cy="32"
                  r={ringRadius}
                  stroke="rgba(255, 255, 255, 0.22)"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="32"
                  cy="32"
                  r={ringRadius}
                  stroke="#E3FF3B"
                  strokeWidth="6"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  transform="rotate(-90 32 32)"
                  style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
                />
              </svg>
            </div>
          </div>
          <p className="kpi-card--hero__subtext">
            {completedTasks} of {totalTasks} tasks done ({completedPct}%)
          </p>
        </div>

        {/* Card 2: Pending Tasks (Amber accent icon) */}
        <div className="kpi-card">
          <div className="kpi-card__icon-circle kpi-card__icon-circle--amber">
            <ClockIcon size={20} />
          </div>
          <div className="kpi-card__value">
            <AnimatedNumber value={pendingTasks} />
          </div>
          <div className="kpi-card__label">
            <span className="kpi-card__label--desktop">Pending Tasks</span>
            <span className="kpi-card__label--mobile">Pending</span>
          </div>
          <div className="kpi-card__subtext">
            {pendingPct}% awaiting completion
          </div>
        </div>

        {/* Card 3: Skipped Tasks (Neutral tint) */}
        <div className="kpi-card">
          <div className="kpi-card__icon-circle kpi-card__icon-circle--neutral">
            <SkipForwardIcon size={20} />
          </div>
          <div className="kpi-card__value">
            <AnimatedNumber value={skippedTasks} />
          </div>
          <div className="kpi-card__label">Skipped Tasks</div>
          <div className="kpi-card__subtext">
            {skippedPct}% excluded from score
          </div>
        </div>

        {/* Card 4: Finished Days Locked (Lime accent icon) */}
        <div className="kpi-card">
          <div className="kpi-card__icon-circle kpi-card__icon-circle--lime">
            <CheckCircleIcon size={20} />
          </div>
          <div className="kpi-card__value">
            <AnimatedNumber value={finishedDays} />
          </div>
          <div className="kpi-card__label">
            <span className="kpi-card__label--desktop">Finished Days</span>
            <span className="kpi-card__label--mobile">Locked</span>
          </div>
          <div className="kpi-card__subtext">
            {finishRate}% finish rate ({totalSchedules} scheduled)
          </div>
        </div>

        {/* Card 5: Rest Days Taken (Neutral tint with Moon icon) */}
        <div className="kpi-card">
          <div className="kpi-card__icon-circle kpi-card__icon-circle--neutral">
            <MoonIcon size={20} />
          </div>
          <div className="kpi-card__value">
            <AnimatedNumber value={restDays} />
          </div>
          <div className="kpi-card__label">Rest Days</div>
          <div className="kpi-card__subtext">Protected from score dilution</div>
        </div>
      </div>

      {/* Task Distribution & Status Breakdown */}
      {totalTasks > 0 && (
        <div className="dayflow-chart-card">
          <div className="dayflow-chart-card__header">
            <div>
              <h3 className="dayflow-chart-card__title">Task Status Breakdown</h3>
              <p className="dayflow-chart-card__subtitle">
                Clear distribution across completed, pending, and skipped tasks.
              </p>
            </div>
            <span className="dayflow-badge dayflow-badge--neutral">
              {totalTasks} total {totalTasks === 1 ? 'task' : 'tasks'}
            </span>
          </div>

          <div className="dayflow-task-distribution">
            {/* Horizontal Stacked Bar */}
            <div className="dayflow-task-distribution__bar" role="progressbar" aria-label="Task distribution breakdown">
              {completedPct > 0 && (
                <div
                  className="dayflow-task-distribution__segment dayflow-task-distribution__segment--completed"
                  style={{ width: `${completedPct}%` }}
                  title={`Completed: ${completedTasks} (${completedPct}%)`}
                />
              )}
              {pendingPct > 0 && (
                <div
                  className="dayflow-task-distribution__segment dayflow-task-distribution__segment--pending"
                  style={{ width: `${pendingPct}%` }}
                  title={`Pending: ${pendingTasks} (${pendingPct}%)`}
                />
              )}
              {skippedPct > 0 && (
                <div
                  className="dayflow-task-distribution__segment dayflow-task-distribution__segment--skipped"
                  style={{ width: `${skippedPct}%` }}
                  title={`Skipped: ${skippedTasks} (${skippedPct}%)`}
                />
              )}
            </div>

            {/* Legend with explicit counts and percentages */}
            <div className="dayflow-task-distribution__legend">
              <div className="dayflow-task-distribution__legend-item">
                <span className="dayflow-task-distribution__dot dayflow-task-distribution__dot--completed" />
                <span className="dayflow-task-distribution__name">Completed:</span>
                <strong className="dayflow-task-distribution__val">{completedTasks}</strong>
                <span className="dayflow-task-distribution__pct">({completedPct}%)</span>
              </div>
              <div className="dayflow-task-distribution__legend-item">
                <span className="dayflow-task-distribution__dot dayflow-task-distribution__dot--pending" />
                <span className="dayflow-task-distribution__name">Pending:</span>
                <strong className="dayflow-task-distribution__val">{pendingTasks}</strong>
                <span className="dayflow-task-distribution__pct">({pendingPct}%)</span>
              </div>
              <div className="dayflow-task-distribution__legend-item">
                <span className="dayflow-task-distribution__dot dayflow-task-distribution__dot--skipped" />
                <span className="dayflow-task-distribution__name">Skipped:</span>
                <strong className="dayflow-task-distribution__val">{skippedTasks}</strong>
                <span className="dayflow-task-distribution__pct">({skippedPct}%)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Completion Trend Chart */}
      <div className="dayflow-chart-card">
        <div className="dayflow-chart-card__header">
          <div>
            <h3 className="dayflow-chart-card__title">Daily Completion Trend</h3>
            <p className="dayflow-chart-card__subtitle">
              Daily performance across the selected window with best day highlight.
            </p>
          </div>
          {maxRate > 0 && bestDayDate && (
            <div className="chart-best-day-chip" title={`Best performing day: ${formatDateLabel(bestDayDate)} with ${maxRate}%`}>
              <SparklesIcon size={13} />
              <span>Best: {maxRate}% ({formatDateLabel(bestDayDate)})</span>
            </div>
          )}
        </div>

        {trendList.length === 0 ? (
          <div className="dayflow-empty-state dayflow-empty-state--compact">
            <div className="dayflow-empty-state__icon">
              <BarChartIcon size={32} />
            </div>
            <h4 className="dayflow-empty-state__title">No Scheduled Data Recorded</h4>
            <p className="dayflow-empty-state__description">
              No daily schedules were recorded in this date range. Plan upcoming days or apply templates to view trend analytics.
            </p>
          </div>
        ) : (
          <div className="analytics-trend-chart-container">
            {/* Sparse Data Friendly Advisory */}
            {isSparse && (
              <div className="analytics-trend-sparse-note">
                <InfoIcon size={15} />
                <span>Complete more days to see your full performance trend curve.</span>
              </div>
            )}

            {/* Interactive SVG Chart */}
            <div className="analytics-svg-wrapper">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="analytics-trend-svg"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <linearGradient id="primaryBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#33A4FA" />
                    <stop offset="100%" stopColor="#3A4EFB" />
                  </linearGradient>
                  <linearGradient id="limeBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E3FF3B" />
                    <stop offset="100%" stopColor="#C9E623" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Gridlines & Labels (0%, 25%, 50%, 75%, 100%) */}
                {[0, 25, 50, 75, 100].map((pct) => {
                  const y = chartPadTop + plotHeight - (pct / 100) * plotHeight;
                  return (
                    <g key={pct} className="chart-grid-line-group">
                      <line
                        x1={chartPadLeft}
                        y1={y}
                        x2={svgWidth - chartPadRight}
                        y2={y}
                        stroke="#DEE0ED"
                        strokeWidth="1"
                        strokeDasharray={pct === 0 ? 'none' : '3 3'}
                      />
                      <text
                        x={chartPadLeft - 8}
                        y={y + 4}
                        textAnchor="end"
                        fontSize="11"
                        fontWeight="700"
                        fill="#252943"
                      >
                        {pct}%
                      </text>
                    </g>
                  );
                })}

                {/* Bars */}
                {trendList.map((d, idx) => {
                  const rate = d.completionPercentage ?? d.completionRate ?? 0;
                  const isRest = d.status === 'REST_DAY';
                  const isBest = !isRest && d.date === bestDayDate && maxRate > 0;
                  const showLabel = shouldShowDate(idx, trendList.length);

                  // X position
                  const barCenter = isSparse
                    ? chartPadLeft + (plotWidth / 2) + (idx === 0 ? -barWidth - 12 : 12) + (barWidth / 2)
                    : chartPadLeft + idx * slotWidth + slotWidth / 2;
                  const barX = barCenter - barWidth / 2;

                  // Height calculation
                  const effectiveRate = isRest ? 18 : Math.max(4, rate);
                  const barH = (effectiveRate / 100) * plotHeight;
                  const barY = chartPadTop + plotHeight - barH;

                  return (
                    <g
                      key={d.date || idx}
                      className="chart-bar-group"
                      onMouseEnter={() =>
                        setHoveredPoint({
                          ...d,
                          rate,
                          isRest,
                          isBest,
                          x: barCenter,
                          y: barY
                        })
                      }
                      onMouseLeave={() => setHoveredPoint(null)}
                      tabIndex="0"
                      role="img"
                      aria-label={`${formatDateLabel(d.date)}: ${isRest ? 'Rest Day' : `${rate}% completed`}`}
                    >
                      {/* Bar Fill */}
                      <rect
                        x={barX}
                        y={barY}
                        width={barWidth}
                        height={barH}
                        rx="4"
                        ry="4"
                        fill={
                          isRest
                            ? '#DEE0ED'
                            : isBest
                            ? 'url(#limeBarGradient)'
                            : 'url(#primaryBarGradient)'
                        }
                        stroke={isBest ? '#252943' : 'none'}
                        strokeWidth={isBest ? '1.5' : '0'}
                        className="chart-bar-rect"
                      />

                      {/* Best Day Star / Dot Icon */}
                      {isBest && (
                        <circle
                          cx={barCenter}
                          cy={barY - 8}
                          r="3.5"
                          fill="#E3FF3B"
                          stroke="#252943"
                          strokeWidth="1.5"
                        />
                      )}

                      {/* Date Label on X-Axis (thinned out to avoid overlap) */}
                      {showLabel && (
                        <text
                          x={barCenter}
                          y={chartPadTop + plotHeight + 18}
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="600"
                          fill="#252943"
                        >
                          {formatDateLabel(d.date)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Floating Tooltip */}
              {hoveredPoint && (() => {
                const pctX = (hoveredPoint.x / svgWidth) * 100;
                // Dynamically offset horizontally so rightmost candles never clip past card boundary
                const translateX = pctX > 70 ? -85 : pctX < 30 ? -15 : -50;

                return (
                  <div
                    className="chart-floating-tooltip"
                    style={{
                      left: `${pctX}%`,
                      top: `${(hoveredPoint.y / svgHeight) * 100}%`,
                      transform: `translate(${translateX}%, -100%) translateY(-14px)`
                    }}
                  >
                    <p className="chart-floating-tooltip__date">
                      {formatDateLabel(hoveredPoint.date)}
                      {hoveredPoint.isBest && <span className="tooltip-best-tag">★ Best</span>}
                    </p>
                    {hoveredPoint.isRest ? (
                      <p className="chart-floating-tooltip__detail">Rest Day (Protected from penalty)</p>
                    ) : (
                      <>
                        <p className="chart-floating-tooltip__rate">{hoveredPoint.rate}% Completed</p>
                        <p className="chart-floating-tooltip__detail">
                          {hoveredPoint.completedTasks || 0} done · {hoveredPoint.pendingTasks || 0} pending · {hoveredPoint.skippedTasks || 0} skipped
                        </p>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Historical Breakdowns Section: Weekly / Monthly / Templates */}
      <div className="dayflow-chart-card">
        <div className="dayflow-chart-card__header dayflow-chart-card__header--split">
          <div>
            <h3 className="dayflow-chart-card__title">Performance History</h3>
            <p className="dayflow-chart-card__subtitle">
              Detailed breakdown of productivity trends across weeks, months, and templates.
            </p>
          </div>

          {/* Sub-Tabs: Weekly / Monthly / Templates */}
          <div className="dayflow-subtabs" role="tablist" aria-label="Breakdown view selector">
            <button
              type="button"
              role="tab"
              aria-selected={breakdownTab === 'weekly'}
              className={`dayflow-subtabs__pill ${breakdownTab === 'weekly' ? 'dayflow-subtabs__pill--active' : ''}`}
              onClick={() => setBreakdownTab('weekly')}
            >
              Weekly ({weeklyPerformance.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={breakdownTab === 'monthly'}
              className={`dayflow-subtabs__pill ${breakdownTab === 'monthly' ? 'dayflow-subtabs__pill--active' : ''}`}
              onClick={() => setBreakdownTab('monthly')}
            >
              Monthly ({monthlyPerformance.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={breakdownTab === 'templates'}
              className={`dayflow-subtabs__pill ${breakdownTab === 'templates' ? 'dayflow-subtabs__pill--active' : ''}`}
              onClick={() => setBreakdownTab('templates')}
            >
              Templates ({sortedTemplates.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Weekly Breakdown */}
        {breakdownTab === 'weekly' && (
          weeklyPerformance.length === 0 ? (
            <div className="dayflow-empty-state dayflow-empty-state--compact">
              <div className="dayflow-empty-state__icon">
                <CalendarIcon size={32} />
              </div>
              <h4 className="dayflow-empty-state__title">No Weekly Records</h4>
              <p className="dayflow-empty-state__description">
                Schedule days to view weekly aggregated completion rates and locked schedule trends.
              </p>
            </div>
          ) : (
            <div className="template-performance-list">
              {weeklyPerformance.map((wp) => (
                <div key={wp.weekKey} className="template-performance-row">
                  <div className="template-performance-row__info">
                    <span className="template-performance-row__name">
                      {wp.weekLabel}
                    </span>
                    <span className="template-performance-row__meta">
                      {wp.scheduledDays} {wp.scheduledDays === 1 ? 'day scheduled' : 'days scheduled'} · {wp.finishedDays} locked ({wp.finishRate}% locked) · {wp.completedTasks} of {wp.totalTasks} tasks done
                      {wp.restDays > 0 && ` · ${wp.restDays} rest ${wp.restDays === 1 ? 'day' : 'days'}`}
                    </span>
                  </div>

                  <div className="template-performance-row__progress-group">
                    <div className="template-performance-row__track">
                      <div
                        className="template-performance-row__fill"
                        style={{ width: `${Math.min(100, Math.max(0, wp.completionRate))}%` }}
                        title={`${wp.weekLabel}: ${wp.completionRate}% completion`}
                      />
                    </div>
                    <span className="template-performance-row__percent">
                      {wp.completionRate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Tab 2: Monthly Breakdown */}
        {breakdownTab === 'monthly' && (
          monthlyPerformance.length === 0 ? (
            <div className="dayflow-empty-state dayflow-empty-state--compact">
              <div className="dayflow-empty-state__icon">
                <CalendarIcon size={32} />
              </div>
              <h4 className="dayflow-empty-state__title">No Monthly Records</h4>
              <p className="dayflow-empty-state__description">
                Schedule days across calendar months to view aggregated monthly completion metrics.
              </p>
            </div>
          ) : (
            <div className="template-performance-list">
              {monthlyPerformance.map((mp) => (
                <div key={mp.monthKey} className="template-performance-row">
                  <div className="template-performance-row__info">
                    <span className="template-performance-row__name">
                      {mp.monthLabel}
                    </span>
                    <span className="template-performance-row__meta">
                      {mp.scheduledDays} {mp.scheduledDays === 1 ? 'day scheduled' : 'days scheduled'} · {mp.finishedDays} locked ({mp.finishRate}% locked) · {mp.completedTasks} of {mp.totalTasks} tasks done
                      {mp.restDays > 0 && ` · ${mp.restDays} rest ${mp.restDays === 1 ? 'day' : 'days'}`}
                    </span>
                  </div>

                  <div className="template-performance-row__progress-group">
                    <div className="template-performance-row__track">
                      <div
                        className="template-performance-row__fill"
                        style={{ width: `${Math.min(100, Math.max(0, mp.completionRate))}%` }}
                        title={`${mp.monthLabel}: ${mp.completionRate}% completion`}
                      />
                    </div>
                    <span className="template-performance-row__percent">
                      {mp.completionRate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Tab 3: Template Breakdown */}
        {breakdownTab === 'templates' && (
          sortedTemplates.length === 0 ? (
            <div className="dayflow-empty-state dayflow-empty-state--compact">
              <div className="dayflow-empty-state__icon">
                <LayoutTemplateIcon size={32} />
              </div>
              <h4 className="dayflow-empty-state__title">No Routine Templates Applied Yet</h4>
              <p className="dayflow-empty-state__description">
                Apply templates to upcoming dates from the Templates tab to track routine-specific performance.
              </p>
            </div>
          ) : (
            <div className="template-performance-list">
              {sortedTemplates.map((tpl) => {
                const daysCount = tpl.daysApplied ?? tpl.daysCount ?? 0;
                const rate = tpl.completionPercentage ?? tpl.completionRate ?? 0;
                const tasksCount = tpl.totalTasks ?? 0;

                return (
                  <div key={tpl.templateName} className="template-performance-row">
                    <div className="template-performance-row__info">
                      <span className="template-performance-row__name">
                        {tpl.templateName}
                      </span>
                      <span className="template-performance-row__meta">
                        {daysCount} {daysCount === 1 ? 'day applied' : 'days applied'} &bull; {tasksCount} {tasksCount === 1 ? 'task' : 'tasks'}
                      </span>
                    </div>

                    <div className="template-performance-row__progress-group">
                      <div className="template-performance-row__track">
                        <div
                          className="template-performance-row__fill"
                          style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
                          title={`${tpl.templateName}: ${rate}% completion`}
                        />
                      </div>
                      <span className="template-performance-row__percent">
                        {rate}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}

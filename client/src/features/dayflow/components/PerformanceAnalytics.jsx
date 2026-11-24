import { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  SkipForwardIcon,
  MoonIcon,
  BarChartIcon,
  SparklesIcon,
  LayoutTemplateIcon,
  InfoIcon
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
      // easeOutExpo
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

export function PerformanceAnalytics({
  analytics,
  onRefresh,
  isLoading = false
}) {
  const [selectedRange, setSelectedRange] = useState('30d');
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
  const completionPercentage =
    rawSummary.completionPercentage ??
    rawSummary.overallCompletionRate ??
    (totalTasks > 0 ? Number(((completedTasks / totalTasks) * 100).toFixed(1)) : 0);

  const totalSchedules = rawSummary.totalSchedules ?? rawSummary.scheduledDaysCount ?? 0;
  const finishedDays = rawSummary.finishedDays ?? rawSummary.finishedDaysCount ?? 0;
  const restDays = rawSummary.restDays ?? rawSummary.restDaysCount ?? 0;

  const trendList = analytics?.weeklyTrend || analytics?.dailyTrend || [];
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

      {/* 4-Up Desktop / 2x2 Mobile KPI Grid */}
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
              <svg width="56" height="56" viewBox="0 0 64 64" className="kpi-card--hero__ring-svg">
                <circle
                  cx="32"
                  cy="32"
                  r={ringRadius}
                  stroke="rgba(255, 255, 255, 0.22)"
                  strokeWidth="5"
                  fill="transparent"
                />
                <circle
                  cx="32"
                  cy="32"
                  r={ringRadius}
                  stroke="#E3FF3B"
                  strokeWidth="5"
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
            {completedTasks} of {totalTasks} tasks done
          </p>
        </div>

        {/* Card 2: Finished Days Locked (Lime accent icon) */}
        <div className="kpi-card">
          <div className="kpi-card__icon-circle kpi-card__icon-circle--lime">
            <CheckCircleIcon size={20} />
          </div>
          <div className="kpi-card__value">
            <AnimatedNumber value={finishedDays} />
          </div>
          <div className="kpi-card__label">
            <span className="kpi-card__label--desktop">Finished Days Locked</span>
            <span className="kpi-card__label--mobile">Days Locked</span>
          </div>
          <div className="kpi-card__subtext">
            Out of {totalSchedules} scheduled {totalSchedules === 1 ? 'day' : 'days'}
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
          <div className="kpi-card__subtext">Excluded from completion rate</div>
        </div>

        {/* Card 4: Rest Days Taken (Neutral tint with Moon icon) */}
        <div className="kpi-card">
          <div className="kpi-card__icon-circle kpi-card__icon-circle--neutral">
            <MoonIcon size={20} />
          </div>
          <div className="kpi-card__value">
            <AnimatedNumber value={restDays} />
          </div>
          <div className="kpi-card__label">Rest Days Taken</div>
          <div className="kpi-card__subtext">Protected from score dilution</div>
        </div>
      </div>

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
                        fontWeight="600"
                        fill="#7E849E"
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

                      {/* Date Label on X-Axis */}
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
                    </g>
                  );
                })}
              </svg>

              {/* Floating Tooltip */}
              {hoveredPoint && (
                <div
                  className="chart-floating-tooltip"
                  style={{
                    left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                    top: `${(hoveredPoint.y / svgHeight) * 100}%`
                  }}
                >
                  <p className="chart-floating-tooltip__date">
                    {formatDateLabel(hoveredPoint.date)}
                    {hoveredPoint.isBest && <span className="tooltip-best-tag">★ Best</span>}
                  </p>
                  {hoveredPoint.isRest ? (
                    <p className="chart-floating-tooltip__detail">Rest Day (Protected)</p>
                  ) : (
                    <>
                      <p className="chart-floating-tooltip__rate">{hoveredPoint.rate}% Completed</p>
                      <p className="chart-floating-tooltip__detail">
                        {hoveredPoint.completedTasks || 0} of {hoveredPoint.totalTasks || 0} tasks done
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Template Historical Performance */}
      <div className="dayflow-chart-card">
        <div className="dayflow-chart-card__header">
          <div>
            <h3 className="dayflow-chart-card__title">Template Historical Performance</h3>
            <p className="dayflow-chart-card__subtitle">
              Effectiveness breakdown sorted by highest routine completion rate.
            </p>
          </div>
        </div>

        {sortedTemplates.length === 0 ? (
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
                      {daysCount} {daysCount === 1 ? 'day applied' : 'days applied'}, {tasksCount} {tasksCount === 1 ? 'task' : 'tasks'}
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
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { CalendarIcon, LayoutTemplateIcon, BarChartIcon, DumbbellIcon } from '../../../../components/common/Icons.jsx';

/**
 * GymTabs - Segmented tab navigation
 * Mobile: 5 equal columns with small icon above the label (11-12px label, nowrap, no truncation)
 * Short mobile-only labels ("Workout", "History", "Plans", "Week", "Stats"), full names via aria-label.
 * Template count as a small square badge on the icon.
 * Active = Lime with Navy text, 2px border and hard shadow.
 */
export function GymTabs({ activeTab, onChangeTab, templateCount = 0 }) {
  const tabs = [
    { id: 'workout', label: 'Workout', shortLabel: 'Workout', fullName: 'Workout', icon: <DumbbellIcon size={16} /> },
    { id: 'history', label: 'History', shortLabel: 'History', fullName: 'History', icon: <CalendarIcon size={16} /> },
    { id: 'templates', label: 'Templates', shortLabel: 'Plans', fullName: 'Workout Templates', icon: <LayoutTemplateIcon size={16} />, badge: templateCount },
    { id: 'schedule', label: 'Schedule', shortLabel: 'Week', fullName: 'Weekly Schedule', icon: <CalendarIcon size={16} /> },
    { id: 'analytics', label: 'Analytics', shortLabel: 'Stats', fullName: 'Analytics & Performance', icon: <BarChartIcon size={16} /> }
  ];

  return (
    <nav className="gymflow-tabs" role="tablist" aria-label="GymFlow Navigation Views">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`gymflow-tabs__tab ${isActive ? 'gymflow-tabs__tab--active' : ''}`}
            onClick={() => onChangeTab(tab.id)}
            role="tab"
            aria-selected={isActive}
            aria-label={tab.fullName}
            aria-controls={`gymflow-panel-${tab.id}`}
          >
            <div className="gymflow-tabs__icon-box">
              {tab.icon}
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span className={`gymflow-tabs__dot-badge ${isActive ? 'gymflow-tabs__dot-badge--active' : ''}`}>
                  {tab.badge}
                </span>
              )}
            </div>
            <span className="gymflow-tabs__label">
              <span className="gymflow-tabs__label-desktop">{tab.label}</span>
              <span className="gymflow-tabs__label-mobile">{tab.shortLabel}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

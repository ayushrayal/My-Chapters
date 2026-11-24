import React from 'react';
import { CalendarIcon, LayoutTemplateIcon, BarChartIcon, DumbbellIcon } from '../../../../components/common/Icons.jsx';

/**
 * GymTabs - Segmented tab navigation
 * Mobile: 4 equal columns with small icon above the label (12px label, nowrap, no ellipsis)
 * and template count as a small superscript dot badge on the icon.
 * Desktop: horizontal aligned items with label & icon.
 */
export function GymTabs({ activeTab, onChangeTab, templateCount = 0 }) {
  const tabs = [
    { id: 'workout', label: 'Workout', icon: <DumbbellIcon size={16} /> },
    { id: 'templates', label: 'Templates', icon: <LayoutTemplateIcon size={16} />, badge: templateCount },
    { id: 'schedule', label: 'Schedule', icon: <CalendarIcon size={16} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChartIcon size={16} /> }
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
            <span className="gymflow-tabs__label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

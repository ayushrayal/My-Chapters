import { useState } from 'react';
import { useDayflow } from '../hooks/useDayflow.js';
import { PageContainer } from '../../../components/common/PageContainer.jsx';
import { DailyTimeline } from '../components/DailyTimeline.jsx';
import { TemplateList } from '../components/TemplateList.jsx';
import { CalendarView } from '../components/CalendarView.jsx';
import { PerformanceAnalytics } from '../components/PerformanceAnalytics.jsx';
import { DayProgressCard } from '../components/DayProgressCard.jsx';
import { MobileWeekStrip } from '../components/MobileWeekStrip.jsx';
import { TemplateEditorModal } from '../components/TemplateEditorModal.jsx';
import { ApplyTemplateModal } from '../components/ApplyTemplateModal.jsx';
import { TaskModal } from '../components/TaskModal.jsx';
import { SkipTaskModal } from '../components/SkipTaskModal.jsx';
import { FinishDayModal } from '../components/FinishDayModal.jsx';
import { MoveScheduleModal } from '../components/MoveScheduleModal.jsx';
import {
  CalendarIcon,
  LayoutTemplateIcon,
  BarChartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  MoreHorizontalIcon,
  CloseIcon
} from '../../../components/common/Icons.jsx';

export function Dayflow() {
  const {
    currentDate,
    selectedDate,
    schedule,
    templates,
    analytics,
    calendarOverview,
    isLoadingSchedule,
    isLoadingTemplates,
    error,
    goToDate,
    goToToday,
    goToPreviousDay,
    goToNextDay,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplate,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    setRestDay,
    finishDay,
    moveSchedule,
    fetchCalendarOverview,
    fetchAnalytics,
    setActiveTab: setHookActiveTab
  } = useDayflow();

  // Active top tab: 'timeline', 'templates', 'analytics'
  const [activeTab, setActiveTab] = useState('timeline');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (setHookActiveTab) {
      setHookActiveTab(tab);
    }
    if (tab === 'analytics' && !analytics) {
      fetchAnalytics();
    }
  };

  // Modals state
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskTargetBlockId, setTaskTargetBlockId] = useState(null);

  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const [skippingTask, setSkippingTask] = useState(null);

  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

  // Mobile overflow menu & bottom sheets
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMonthSheetOpen, setIsMonthSheetOpen] = useState(false);
  const [isQuickApplySheetOpen, setIsQuickApplySheetOpen] = useState(false);

  // Template Modal handlers
  const handleOpenCreateTemplate = () => {
    setEditingTemplate(null);
    setIsTemplateEditorOpen(true);
  };

  const handleOpenEditTemplate = (tpl) => {
    setEditingTemplate(tpl);
    setIsTemplateEditorOpen(true);
  };

  const handleSaveTemplate = async (payload, templateId) => {
    if (templateId) {
      await updateTemplate(templateId, payload);
    } else {
      await createTemplate(payload);
    }
  };

  const handleOpenApplyTemplate = (tpl) => {
    setApplyingTemplate(tpl);
    setIsApplyModalOpen(true);
    setIsQuickApplySheetOpen(false);
  };

  // Task Modal handlers
  const handleOpenTaskModal = (task = null, blockId = null) => {
    setEditingTask(task);
    setTaskTargetBlockId(blockId);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (payload, taskId) => {
    if (taskId) {
      await updateTask(taskId, payload);
    } else {
      await createTask(payload);
    }
  };

  const handleQuickCreateTask = async ({ blockId, title }) => {
    await createTask({ blockId, title, description: '', notes: '' });
  };

  const handleOpenSkipModal = (task) => {
    setSkippingTask(task);
    setIsSkipModalOpen(true);
  };

  const handleConfirmSkip = async (taskId, reason) => {
    await updateTaskStatus(taskId, 'SKIPPED', reason);
  };

  const handleCompleteTask = async (taskId) => {
    await updateTaskStatus(taskId, 'COMPLETED');
  };

  const handleToggleRestDay = async () => {
    const isCurrentlyRest = schedule?.isRestDay;
    if (!isCurrentlyRest) {
      const confirm = window.confirm(
        'Mark this day as a Rest Day? Any existing blocks and tasks will be cleared for this date.'
      );
      if (!confirm) return;
    }
    await setRestDay(!isCurrentlyRest);
    setIsMobileMenuOpen(false);
  };

  const isToday = selectedDate === currentDate;
  const isFinished = Boolean(schedule?.isFinished);
  const isRestDay = Boolean(schedule?.isRestDay);

  const formattedDisplayDate = new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Calendar overview map helper for mobile week strip
  const overviewMap = {};
  if (Array.isArray(calendarOverview)) {
    calendarOverview.forEach((item) => {
      overviewMap[item.date] = item;
    });
  }

  return (
    <PageContainer>
      <div className="dayflow-page">
        {/* Main Page Header */}
        <header className="dayflow-header">
          <div className="dayflow-header__titles">
            <h1 className="dayflow-header__title">Dayflow</h1>
            <p className="dayflow-header__subtitle">
              Personal daily scheduling, time execution & accountability.
            </p>
          </div>

          {/* Segmented Control Tabs */}
          <nav className="dayflow-segmented-tabs" role="tablist" aria-label="Dayflow Views">
            <button
              type="button"
              className={`dayflow-segmented-tabs__tab ${activeTab === 'timeline' ? 'dayflow-segmented-tabs__tab--active' : ''}`}
              onClick={() => handleTabChange('timeline')}
              role="tab"
              aria-selected={activeTab === 'timeline'}
            >
              <span className="dayflow-segmented-tabs__icon">
                <CalendarIcon size={16} />
              </span>
              <span className="dayflow-segmented-tabs__label dayflow-segmented-tabs__label--full">Daily Schedule</span>
              <span className="dayflow-segmented-tabs__label dayflow-segmented-tabs__label--short">Schedule</span>
            </button>
            <button
              type="button"
              className={`dayflow-segmented-tabs__tab ${activeTab === 'templates' ? 'dayflow-segmented-tabs__tab--active' : ''}`}
              onClick={() => handleTabChange('templates')}
              role="tab"
              aria-selected={activeTab === 'templates'}
            >
              <span className="dayflow-segmented-tabs__icon">
                <LayoutTemplateIcon size={16} />
              </span>
              <span className="dayflow-segmented-tabs__label dayflow-segmented-tabs__label--full">Templates ({templates.length})</span>
              <span className="dayflow-segmented-tabs__label dayflow-segmented-tabs__label--short">Templates</span>
            </button>
            <button
              type="button"
              className={`dayflow-segmented-tabs__tab ${activeTab === 'analytics' ? 'dayflow-segmented-tabs__tab--active' : ''}`}
              onClick={() => handleTabChange('analytics')}
              role="tab"
              aria-selected={activeTab === 'analytics'}
            >
              <span className="dayflow-segmented-tabs__icon">
                <BarChartIcon size={16} />
              </span>
              <span className="dayflow-segmented-tabs__label">Analytics</span>
            </button>
          </nav>
        </header>

        {/* TIMELINE TAB VIEW */}
        {activeTab === 'timeline' && (
          <div className="dayflow-timeline-layout">
            {/* Left Column (about 2/3): Day Header & Timeline of Blocks */}
            <main className="dayflow-timeline-layout__main">
              {/* MOBILE ONLY: 7-day horizontal week strip + Month button */}
              <div className="mobile-week-strip-container">
                <MobileWeekStrip
                  selectedDate={selectedDate}
                  onSelectDate={goToDate}
                  overviewMap={overviewMap}
                  onOpenMonthSheet={() => setIsMonthSheetOpen(true)}
                />
              </div>

              {/* DAY HEADER: Icon chevrons, heading font date, Today chip, actions */}
              <div className="dayflow-day-header">
                {/* Row 1: Chevron Left (44px target) | Date centered on one line | Chevron Right (44px target) */}
                <div className="dayflow-day-header__row-top">
                  <button
                    type="button"
                    className="btn-icon btn-icon--touch"
                    onClick={goToPreviousDay}
                    aria-label="Previous day"
                    title="Previous Day"
                  >
                    <ChevronLeftIcon size={18} />
                  </button>

                  <div className="dayflow-day-header__date-center">
                    <h2 className="dayflow-day-header__date-text">
                      {formattedDisplayDate}
                    </h2>
                    {isToday ? (
                      <span className="badge-today-lime">Today</span>
                    ) : (
                      <button
                        type="button"
                        className="btn-jump-today"
                        onClick={goToToday}
                        aria-label="Jump to today"
                      >
                        Jump to today
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn-icon btn-icon--touch"
                    onClick={goToNextDay}
                    aria-label="Next day"
                    title="Next Day"
                  >
                    <ChevronRightIcon size={18} />
                  </button>
                </div>

                {/* Status Badges if locked or rest */}
                {(isFinished || isRestDay) && (
                  <div className="dayflow-day-header__status-row">
                    {isFinished && (
                      <span className="dayflow-badge dayflow-badge--locked" title="Day locked and immutable">
                        🔒 Locked
                      </span>
                    )}
                    {isRestDay && (
                      <span className="dayflow-badge dayflow-badge--rest">
                        Rest Day
                      </span>
                    )}
                  </div>
                )}

                {/* Row 2: Desktop inline actions vs Mobile Finish Day + Overflow menu */}
                <div className="dayflow-day-header__actions">
                  {/* Desktop actions */}
                  <div className="dayflow-day-header__actions-desktop">
                    {!isFinished && !isRestDay && schedule?.blocks?.length > 0 && (
                      <>
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={() => setIsMoveModalOpen(true)}
                          title="Shift unfinished schedule to another date"
                        >
                          Move Schedule
                        </button>
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          onClick={() => setIsFinishModalOpen(true)}
                          title="Lock this day permanently"
                        >
                          Finish Day
                        </button>
                      </>
                    )}

                    {!isFinished && (
                      <button
                        type="button"
                        className={`btn btn--sm ${isRestDay ? 'btn--primary' : 'btn--outline'}`}
                        onClick={handleToggleRestDay}
                      >
                        {isRestDay ? 'Resume Scheduling' : 'Mark Rest Day'}
                      </button>
                    )}
                  </div>

                  {/* Mobile Actions: Row with Finish Day (full width gradient) + "..." menu button */}
                  <div className="dayflow-day-header__actions-mobile">
                    {!isFinished && !isRestDay && schedule?.blocks?.length > 0 && (
                      <button
                        type="button"
                        className="btn btn--primary dayflow-day-header__finish-mobile-btn"
                        onClick={() => setIsFinishModalOpen(true)}
                        title="Lock this day permanently"
                      >
                        Finish Day
                      </button>
                    )}

                    {!isFinished && (
                      <div className="dayflow-day-header__overflow-wrap">
                        <button
                          type="button"
                          className="btn-icon btn-icon--touch dayflow-day-header__overflow-btn"
                          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                          aria-label="More day actions"
                          aria-expanded={isMobileMenuOpen}
                        >
                          <MoreHorizontalIcon size={20} />
                        </button>

                        {isMobileMenuOpen && (
                          <div className="dayflow-day-header__overflow-dropdown">
                            {!isRestDay && schedule?.blocks?.length > 0 && (
                              <button
                                type="button"
                                className="dayflow-day-header__overflow-item"
                                onClick={() => {
                                  setIsMobileMenuOpen(false);
                                  setIsMoveModalOpen(true);
                                }}
                              >
                                <span>Move Schedule</span>
                              </button>
                            )}
                            <button
                              type="button"
                              className="dayflow-day-header__overflow-item"
                              onClick={handleToggleRestDay}
                            >
                              <span>{isRestDay ? 'Resume Scheduling' : 'Mark Rest Day'}</span>
                            </button>
                            <button
                              type="button"
                              className="dayflow-day-header__overflow-item"
                              onClick={() => {
                                setIsMobileMenuOpen(false);
                                setIsQuickApplySheetOpen(true);
                              }}
                            >
                              <span>Quick Apply Template</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* MOBILE ONLY: Day Progress Card directly under Date Header */}
              <div className="dayflow-mobile-progress-wrap">
                <DayProgressCard schedule={schedule} />
              </div>

              {/* Error Banner */}
              {error && (
                <div className="dayflow-banner dayflow-banner--error" role="alert">
                  {error}
                </div>
              )}

              {/* SKELETON LOADER or Schedule Content */}
              {isLoadingSchedule ? (
                <div className="dayflow-skeleton-list">
                  <div className="dayflow-skeleton-row" />
                  <div className="dayflow-skeleton-card" />
                  <div className="dayflow-skeleton-card" />
                </div>
              ) : isRestDay ? (
                <div className="dayflow-empty-state dayflow-empty-state--rest">
                  <div className="dayflow-empty-state__icon">
                    <CalendarIcon size={36} />
                  </div>
                  <h3 className="dayflow-empty-state__title">Rest Day</h3>
                  <p className="dayflow-empty-state__description">
                    Take time to recharge. This day is intentionally excluded from performance calculations so your metrics remain untarnished.
                  </p>
                  {!isFinished && (
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={handleToggleRestDay}
                    >
                      Change to Active Day
                    </button>
                  )}
                </div>
              ) : (
                <DailyTimeline
                  schedule={schedule}
                  onOpenTaskModal={handleOpenTaskModal}
                  onOpenSkipModal={handleOpenSkipModal}
                  onCompleteTask={handleCompleteTask}
                  onDeleteTask={deleteTask}
                  onCreateTaskQuick={handleQuickCreateTask}
                />
              )}
            </main>

            {/* Right Column (about 1/3, sticky on desktop): Day Progress, Month Calendar, Quick Apply */}
            <aside className="dayflow-timeline-layout__aside">
              {/* 1. Day Progress Card (Desktop only, mobile renders above) */}
              <div className="dayflow-desktop-progress-wrap">
                <DayProgressCard schedule={schedule} />
              </div>

              {/* 2. Month Calendar (Desktop) */}
              <div className="desktop-calendar-card-wrap">
                <CalendarView
                  selectedDate={selectedDate}
                  onSelectDate={goToDate}
                  fetchOverview={fetchCalendarOverview}
                />
              </div>

              {/* 3. Quick Apply Template */}
              <div className="dayflow-sidebar-card">
                <div className="dayflow-sidebar-card__header">
                  <h3 className="dayflow-sidebar-card__title">Quick Apply</h3>
                  <button
                    type="button"
                    className="btn-ghost-sm"
                    onClick={handleOpenCreateTemplate}
                    aria-label="+ New Template"
                  >
                    <PlusIcon size={14} />
                    <span>New</span>
                  </button>
                </div>

                {templates.length === 0 ? (
                  <p className="dayflow-sidebar-card__empty">
                    No templates saved yet. Create a reusable template to schedule routines in one click.
                  </p>
                ) : (
                  <div className="dayflow-sidebar-card__template-list">
                    {templates.slice(0, 4).map((tpl) => (
                      <div
                        key={tpl._id || tpl.id}
                        className="quick-apply-row"
                      >
                        <div className="quick-apply-row__info">
                          <span className="quick-apply-row__name">{tpl.name}</span>
                          <span className="quick-apply-row__count">{tpl.blocks?.length || 0} blocks</span>
                        </div>
                        <button
                          type="button"
                          className="btn btn--primary btn--sm quick-apply-row__apply-btn"
                          onClick={() => handleOpenApplyTemplate(tpl)}
                        >
                          Apply
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}

        {/* TEMPLATES TAB VIEW */}
        {activeTab === 'templates' && (
          <TemplateList
            templates={templates}
            isLoading={isLoadingTemplates}
            onOpenCreateModal={handleOpenCreateTemplate}
            onOpenEditModal={handleOpenEditTemplate}
            onOpenApplyModal={handleOpenApplyTemplate}
            onDeleteTemplate={deleteTemplate}
          />
        )}

        {/* ANALYTICS TAB VIEW */}
        {activeTab === 'analytics' && (
          <PerformanceAnalytics
            analytics={analytics}
            onRefresh={fetchAnalytics}
          />
        )}

        {/* MOBILE FLOATING ACTION BUTTON (FAB) */}
        {!isFinished && activeTab === 'timeline' && schedule?.blocks?.length > 0 && (
          <button
            type="button"
            className="dayflow-mobile-fab"
            onClick={() => handleOpenTaskModal(null, schedule?.blocks?.[0]?._id || schedule?.blocks?.[0]?.id)}
            aria-label="Add new task"
            title="Add Task"
          >
            <PlusIcon size={24} />
          </button>
        )}

        {/* MOBILE BOTTOM SHEET: Full Month Calendar */}
        {isMonthSheetOpen && (
          <div className="bottom-sheet-overlay" onClick={() => setIsMonthSheetOpen(false)}>
            <div className="bottom-sheet-card" onClick={(e) => e.stopPropagation()}>
              <div className="bottom-sheet-card__header">
                <h3 className="bottom-sheet-card__title">Month Calendar</h3>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setIsMonthSheetOpen(false)}
                  aria-label="Close calendar sheet"
                >
                  <CloseIcon size={18} />
                </button>
              </div>
              <div className="bottom-sheet-card__body">
                <CalendarView
                  selectedDate={selectedDate}
                  onSelectDate={(date) => {
                    goToDate(date);
                    setIsMonthSheetOpen(false);
                  }}
                  fetchOverview={fetchCalendarOverview}
                />
              </div>
            </div>
          </div>
        )}

        {/* MOBILE BOTTOM SHEET: Quick Apply */}
        {isQuickApplySheetOpen && (
          <div className="bottom-sheet-overlay" onClick={() => setIsQuickApplySheetOpen(false)}>
            <div className="bottom-sheet-card" onClick={(e) => e.stopPropagation()}>
              <div className="bottom-sheet-card__header">
                <h3 className="bottom-sheet-card__title">Quick Apply Template</h3>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setIsQuickApplySheetOpen(false)}
                  aria-label="Close template sheet"
                >
                  <CloseIcon size={18} />
                </button>
              </div>
              <div className="bottom-sheet-card__body">
                <button
                  type="button"
                  className="btn btn--outline btn--full quick-apply-sheet-new-btn"
                  onClick={() => {
                    setIsQuickApplySheetOpen(false);
                    handleOpenCreateTemplate();
                  }}
                >
                  <PlusIcon size={16} />
                  <span>New Template</span>
                </button>

                {templates.length === 0 ? (
                  <p className="dayflow-sidebar-card__empty" style={{ marginTop: '16px' }}>
                    No templates created yet.
                  </p>
                ) : (
                  <div className="dayflow-sidebar-card__template-list" style={{ marginTop: '16px' }}>
                    {templates.map((tpl) => (
                      <div key={tpl._id || tpl.id} className="quick-apply-row">
                        <div className="quick-apply-row__info">
                          <span className="quick-apply-row__name">{tpl.name}</span>
                          <span className="quick-apply-row__count">{tpl.blocks?.length || 0} blocks</span>
                        </div>
                        <button
                          type="button"
                          className="btn btn--primary btn--sm quick-apply-row__apply-btn"
                          onClick={() => handleOpenApplyTemplate(tpl)}
                        >
                          Apply
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODALS */}
        <TemplateEditorModal
          isOpen={isTemplateEditorOpen}
          template={editingTemplate}
          onClose={() => setIsTemplateEditorOpen(false)}
          onSave={handleSaveTemplate}
        />

        <ApplyTemplateModal
          isOpen={isApplyModalOpen}
          template={applyingTemplate}
          currentDate={selectedDate}
          onClose={() => setIsApplyModalOpen(false)}
          onApply={applyTemplate}
        />

        <TaskModal
          isOpen={isTaskModalOpen}
          task={editingTask}
          initialBlockId={taskTargetBlockId}
          blocks={schedule?.blocks || []}
          onClose={() => setIsTaskModalOpen(false)}
          onSave={handleSaveTask}
        />

        <SkipTaskModal
          isOpen={isSkipModalOpen}
          task={skippingTask}
          onClose={() => setIsSkipModalOpen(false)}
          onConfirmSkip={handleConfirmSkip}
        />

        <FinishDayModal
          isOpen={isFinishModalOpen}
          schedule={schedule}
          onClose={() => setIsFinishModalOpen(false)}
          onConfirmFinish={finishDay}
        />

        <MoveScheduleModal
          isOpen={isMoveModalOpen}
          currentDate={selectedDate}
          onClose={() => setIsMoveModalOpen(false)}
          onConfirmMove={moveSchedule}
        />
      </div>
    </PageContainer>
  );
}

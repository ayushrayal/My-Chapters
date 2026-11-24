import { useState } from 'react';
import { useGymflow } from '../hooks/useGymflow.js';
import { PageContainer } from '../../../components/common/PageContainer.jsx';
import { ActiveWorkoutView } from '../components/ActiveWorkoutView.jsx';
import { GymTemplateModal } from '../components/GymTemplateModal.jsx';
import { DeleteGymTemplateModal } from '../components/DeleteGymTemplateModal.jsx';
import { DiscardWorkoutModal } from '../components/DiscardWorkoutModal.jsx';
import { WeeklyAssignmentModal } from '../components/WeeklyAssignmentModal.jsx';
import { RestDayModal } from '../components/RestDayModal.jsx';
import { FinishWorkoutModal } from '../components/FinishWorkoutModal.jsx';
import { GymAnalyticsView } from '../components/GymAnalyticsView.jsx';
import { GymTabs } from '../components/common/GymTabs.jsx';
import { DateNavigator } from '../components/common/DateNavigator.jsx';
import { Chip } from '../components/common/Chip.jsx';
import { FilterSelect } from '../../../components/common/FilterControl/FilterSelect.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import {
  CalendarIcon,
  LayoutTemplateIcon,
  PlusIcon,
  TrashIcon,
  EditIcon,
  MoonIcon,
  DumbbellIcon,
  MoreHorizontalIcon
} from '../../../components/common/Icons.jsx';

export function GymFlow() {
  const {
    currentDate,
    selectedDate,
    session,
    dayAssignment,
    templates,
    weeklySchedule,
    comparisons,
    analytics,
    isLoadingSession,
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
    fetchAnalytics
  } = useGymflow();

  const [activeTab, setActiveTab] = useState('workout'); // 'workout', 'templates', 'schedule', 'analytics'
  const [selectedTemplateToStart, setSelectedTemplateToStart] = useState('');

  // Modals
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [isWeeklyModalOpen, setIsWeeklyModalOpen] = useState(false);
  const [isRestModalOpen, setIsRestModalOpen] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);

  const isToday = selectedDate === currentDate;
  const isRestDay = Boolean(session?.isRestDay);
  const isFinished = Boolean(session?.isFinished);

  const formattedDisplayDate = new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const handleStartWorkout = async () => {
    await startWorkout(selectedTemplateToStart || undefined);
  };

  const currentDayOfWeek = new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <PageContainer>
      <div className="gymflow-page">
        {/* Header with Title and Segmented Tabs */}
        <header className="gymflow-header">
          <div className="gymflow-header__titles">
            <h1 className="gymflow-header__title">GymFlow</h1>
            <p className="gymflow-header__subtitle">
              Workout planning, set execution, treadmill tracking & performance analytics.
            </p>
          </div>

          <GymTabs
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            templateCount={templates.length}
          />
        </header>

        {/* WORKOUT TAB */}
        {activeTab === 'workout' && (
          <div className="gymflow-tab-content" id="gymflow-panel-workout" role="tabpanel">
            {/* Date Navigator Card */}
            <DateNavigator
              displayDate={formattedDisplayDate}
              isToday={isToday}
              onPreviousDay={goToPreviousDay}
              onNextDay={goToNextDay}
              onJumpToday={goToToday}
              actions={
                session && !isRestDay ? (
                  isFinished ? (
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => finishWorkout(false)}
                    >
                      Re-open Workout
                    </button>
                  ) : (
                    <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn--secondary"
                        style={{ color: '#D32F2F', borderColor: '#FFCDD2' }}
                        onClick={() => setIsDiscardModalOpen(true)}
                      >
                        Discard Workout
                      </button>
                      <button
                        type="button"
                        className="btn btn--primary"
                        onClick={() => setIsFinishModalOpen(true)}
                      >
                        Finish Workout
                      </button>
                    </div>
                  )
                ) : isRestDay ? (
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={removeRestDay}
                  >
                    Resume Workout
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn--outline"
                    onClick={() => setIsRestModalOpen(true)}
                  >
                    Mark Rest Day
                  </button>
                )
              }
              secondaryActions={
                !isRestDay
                  ? [
                      ...(session && !isFinished
                        ? [
                            {
                              label: 'Discard Workout',
                              icon: <TrashIcon size={14} />,
                              onClick: () => setIsDiscardModalOpen(true)
                            }
                          ]
                        : []),
                      {
                        label: 'Mark Rest Day',
                        icon: <MoonIcon size={14} />,
                        onClick: () => setIsRestModalOpen(true)
                      }
                    ]
                  : [
                      {
                        label: 'Resume Workout',
                        icon: <DumbbellIcon size={14} />,
                        onClick: removeRestDay
                      }
                    ]
              }
            />

            {/* Status indicator row if rest day */}
            {isRestDay && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Chip variant="muted" icon={<MoonIcon size={13} />}>
                  Rest Day: {session?.restDayReason || 'Planned recovery'}
                </Chip>
              </div>
            )}

            {/* Main Content Area */}
            {isLoadingSession ? (
              <div className="gymflow-skeleton-list">
                <div className="dayflow-skeleton-card" style={{ height: '140px' }} />
                <div className="dayflow-skeleton-card" style={{ height: '220px' }} />
              </div>
            ) : isRestDay ? (
              <EmptyState
                variant="rest"
                icon={<MoonIcon size={32} />}
                title="Rest Day Logged"
                description={`Rest day reason: "${session?.restDayReason || 'Planned recovery'}". This day is preserved against completion scoring dilution.`}
                actionLabel="Train Anyway"
                onAction={removeRestDay}
              />
            ) : !session ? (
              /* Pre-workout Hero Card */
              <div className="gymflow-start-card">
                <div className="gymflow-start-card__header">
                  <div className="gymflow-start-card__badge-row">
                    {dayAssignment?.templateId ? (
                      <Chip variant="gradient-tint">
                        Assigned: {dayAssignment.templateId.name}
                      </Chip>
                    ) : (
                      <Chip variant="muted">No Routine Scheduled</Chip>
                    )}
                    <Chip variant="outline">{currentDayOfWeek}</Chip>
                  </div>
                  <h3 className="gymflow-start-card__title">
                    Start Workout for {formattedDisplayDate}
                  </h3>
                  <p className="gymflow-start-card__desc">
                    {dayAssignment?.templateId
                      ? `Follow your scheduled "${dayAssignment.templateId.name}" routine or pick a custom template to begin.`
                      : 'Choose a workout template or start an open session to track sets and cardio.'}
                  </p>
                </div>

                <div className="gymflow-start-card__form">
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <FilterSelect
                      value={selectedTemplateToStart}
                      onChange={setSelectedTemplateToStart}
                      placeholder="Start Empty / Custom Workout"
                      options={templates.map((tpl) => ({
                        value: tpl._id || tpl.id,
                        label: `${tpl.name} (${tpl.bodyParts?.length || 0} body parts)`
                      }))}
                      ariaLabel="Select workout template"
                    />
                  </div>

                  <button
                    type="button"
                    className="btn btn--primary gymflow-start-card__btn"
                    onClick={handleStartWorkout}
                  >
                    Start Workout
                  </button>
                </div>
              </div>
            ) : (
              /* Active Workout Logger */
              <ActiveWorkoutView
                session={session}
                comparisons={comparisons}
                onSave={saveWorkoutProgress}
                onFinish={() => setIsFinishModalOpen(true)}
                onDiscard={() => setIsDiscardModalOpen(true)}
                isFinished={isFinished}
              />
            )}
          </div>
        )}

        {/* TEMPLATES TAB */}
        {activeTab === 'templates' && (
          <div className="gymflow-tab-content" id="gymflow-panel-templates" role="tabpanel">
            <div className="gymflow-tab-header">
              <div>
                <h2 className="gymflow-tab-title">Workout Templates</h2>
                <p className="gymflow-tab-sub">
                  Create reusable routines (e.g. Push, Pull, Legs) with body parts and exercises.
                </p>
              </div>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  setEditingTemplate(null);
                  setIsTemplateModalOpen(true);
                }}
              >
                <PlusIcon size={16} />
                <span>Create Template</span>
              </button>
            </div>

            {templates.length === 0 ? (
              <EmptyState
                icon={<DumbbellIcon size={32} />}
                title="Create your first template"
                description="Create your first workout template (e.g., Push, Pull, Legs) to quickly start workouts and log sets."
                actionLabel="Create Template"
                onAction={() => {
                  setEditingTemplate(null);
                  setIsTemplateModalOpen(true);
                }}
              />
            ) : (
              <div className="gymflow-templates-grid">
                {templates.map((tpl) => {
                  const tplId = tpl._id || tpl.id;
                  const totalExercises = (tpl.bodyParts || []).reduce(
                    (acc, bp) => acc + (bp.exercises?.length || 0),
                    0
                  );

                  return (
                    <div key={tplId} className="gymflow-template-card">
                      <div>
                        <div className="gymflow-template-card__top">
                          <h3 className="gymflow-template-card__title">{tpl.name}</h3>
                          <div className="gymflow-template-card__tools">
                            <button
                              type="button"
                              className="btn-icon btn-icon--sm"
                              onClick={() => {
                                setEditingTemplate(tpl);
                                setIsTemplateModalOpen(true);
                              }}
                              aria-label={`Edit ${tpl.name}`}
                              title="Edit Template"
                            >
                              <EditIcon size={15} />
                            </button>
                            <button
                              type="button"
                              className="btn-icon btn-icon--sm btn-icon--danger"
                              onClick={() => setTemplateToDelete(tpl)}
                              aria-label={`Delete ${tpl.name}`}
                              title="Delete Template"
                            >
                              <TrashIcon size={15} />
                            </button>
                          </div>
                        </div>

                        {tpl.description && (
                          <p className="gymflow-template-card__desc">{tpl.description}</p>
                        )}

                        <div className="gymflow-template-card__meta-chips" style={{ margin: '10px 0' }}>
                          <Chip variant="muted">{tpl.bodyParts?.length || 0} Body Parts</Chip>
                          <Chip variant="muted">{totalExercises} Exercises</Chip>
                        </div>

                        <div className="gymflow-template-card__body-parts">
                          {(tpl.bodyParts || []).map((bp, i) => (
                            <div key={i} className="gymflow-template-card__bp-row">
                              <strong>{bp.name}: </strong>
                              {bp.exercises?.length > 0 ? (
                                bp.exercises.map((e) => e.name).join(', ')
                              ) : (
                                <em>No exercises yet</em>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn--primary gymflow-template-card__start-btn"
                        onClick={async () => {
                          await startWorkout(tplId);
                          setActiveTab('workout');
                        }}
                      >
                        Start This Workout
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SCHEDULE TAB */}
        {activeTab === 'schedule' && (
          <div className="gymflow-tab-content" id="gymflow-panel-schedule" role="tabpanel">
            <div className="gymflow-tab-header">
              <div>
                <h2 className="gymflow-tab-title">Weekly Workout Assignment</h2>
                <p className="gymflow-tab-sub">
                  Configure your recurring workout routine and scheduled rest days.
                </p>
              </div>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setIsWeeklyModalOpen(true)}
              >
                Edit Schedule
              </button>
            </div>

            <div className="gymflow-schedule-list">
              {(weeklySchedule?.days || []).map((d) => {
                const isScheduleToday = d.weekday === currentDayOfWeek;
                const shortDay = d.weekday.slice(0, 3);

                return (
                  <div
                    key={d.weekday}
                    className={`gymflow-schedule-card ${isScheduleToday ? 'gymflow-schedule-card--today' : ''}`}
                    onClick={() => setIsWeeklyModalOpen(true)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Configure ${d.weekday}`}
                  >
                    <div className="gymflow-schedule-card__left">
                      <span className="gymflow-schedule-card__day-tile">{shortDay}</span>
                      <span className="gymflow-schedule-card__day-name">{d.weekday}</span>
                      {isScheduleToday && <Chip variant="lime">Today</Chip>}
                    </div>

                    <div className="gymflow-schedule-card__status">
                      {d.isRestDay ? (
                        <Chip variant="outline" icon={<MoonIcon size={12} />}>
                          Rest Day
                        </Chip>
                      ) : d.templateId ? (
                        <Chip variant="gradient-tint">
                          {d.templateId.name || 'Assigned Template'}
                        </Chip>
                      ) : (
                        <Chip variant="muted">Not assigned</Chip>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="gymflow-tab-content" id="gymflow-panel-analytics" role="tabpanel">
            <GymAnalyticsView analytics={analytics} onRefresh={fetchAnalytics} />
          </div>
        )}

        {/* MODALS */}
        <GymTemplateModal
          key={isTemplateModalOpen ? (editingTemplate?._id || editingTemplate?.id || 'new-template') : 'closed'}
          isOpen={isTemplateModalOpen}
          template={editingTemplate}
          onClose={() => {
            setIsTemplateModalOpen(false);
            setEditingTemplate(null);
          }}
          onSave={(data) => saveTemplate(data, editingTemplate?._id || editingTemplate?.id)}
        />

        <DeleteGymTemplateModal
          isOpen={Boolean(templateToDelete)}
          template={templateToDelete}
          onClose={() => setTemplateToDelete(null)}
          onConfirmDelete={deleteTemplate}
        />

        <DiscardWorkoutModal
          isOpen={isDiscardModalOpen}
          date={selectedDate}
          onClose={() => setIsDiscardModalOpen(false)}
          onConfirm={discardWorkout}
        />

        <WeeklyAssignmentModal
          isOpen={isWeeklyModalOpen}
          weeklySchedule={weeklySchedule}
          templates={templates}
          onClose={() => setIsWeeklyModalOpen(false)}
          onSave={updateWeeklyScheduleDays}
        />

        <RestDayModal
          isOpen={isRestModalOpen}
          onClose={() => setIsRestModalOpen(false)}
          onConfirm={markRestDay}
        />

        <FinishWorkoutModal
          isOpen={isFinishModalOpen}
          session={session}
          onClose={() => setIsFinishModalOpen(false)}
          onConfirm={finishWorkout}
        />
      </div>
    </PageContainer>
  );
}

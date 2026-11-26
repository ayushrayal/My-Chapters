import { useState } from 'react';
import { useGymflow } from '../hooks/useGymflow.js';
import { PageContainer } from '../../../components/common/PageContainer.jsx';
import { WindowCard } from '../../../components/common/WindowCard.jsx';
import { ActiveWorkoutView } from '../components/ActiveWorkoutView.jsx';
import { GymTemplateModal } from '../components/GymTemplateModal.jsx';
import { DeleteGymTemplateModal } from '../components/DeleteGymTemplateModal.jsx';
import { DiscardWorkoutModal } from '../components/DiscardWorkoutModal.jsx';
import { WeeklyAssignmentModal } from '../components/WeeklyAssignmentModal.jsx';
import { RestDayModal } from '../components/RestDayModal.jsx';
import { FinishWorkoutModal } from '../components/FinishWorkoutModal.jsx';
import { GymAnalyticsView } from '../components/GymAnalyticsView.jsx';
import { GymMonthHistoryView } from '../components/GymMonthHistoryView.jsx';
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
    spaceId,
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
                isRestDay ? (
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
                    className="btn btn--secondary"
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

            {/* Primary Full-width Action: Finish Workout / Re-open Workout with 16px gaps above and below */}
            {session && !isRestDay && (
              <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                {isFinished ? (
                  <button
                    type="button"
                    className="btn btn--secondary btn--lg"
                    style={{ width: '100%', minHeight: '48px', height: '48px' }}
                    onClick={() => finishWorkout(false)}
                  >
                    Re-open Workout
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn--primary btn--lg"
                    style={{ width: '100%', minHeight: '48px', height: '48px' }}
                    onClick={() => setIsFinishModalOpen(true)}
                    aria-label="Finish workout"
                  >
                    Finish Workout
                  </button>
                )}
              </div>
            )}

            {/* Status indicator row if rest day */}
            {isRestDay && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
                <span className="neo-tag neo-tag--lime" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <MoonIcon size={13} />
                  <span>Rest Day: {session?.restDayReason || 'Planned recovery'}</span>
                </span>
              </div>
            )}

            {/* Main Content Area */}
            {isLoadingSession ? (
              <div className="gymflow-skeleton-list" style={{ marginTop: '16px' }}>
                <div className="dayflow-skeleton-card" style={{ height: '140px' }} />
                <div className="dayflow-skeleton-card" style={{ height: '220px' }} />
              </div>
            ) : isRestDay ? (
              <div style={{ marginTop: '16px' }}>
                <EmptyState
                  variant="rest"
                  icon={<MoonIcon size={32} />}
                  title="Rest Day Logged"
                  description={`Rest day reason: "${session?.restDayReason || 'Planned recovery'}". This day is preserved against completion scoring dilution.`}
                  actionLabel="Train Anyway"
                  onAction={removeRestDay}
                />
              </div>
            ) : !session ? (
              /* Pre-workout Hero Card: WindowCard START WORKOUT with 16px gap to date card */
              <div style={{ marginTop: '16px' }}>
                <WindowCard
                  title="START WORKOUT"
                  headerBg="canvas"
                  action={<span className="neo-tag neo-tag--lime">{currentDayOfWeek}</span>}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {dayAssignment?.templateId ? (
                        <span className="neo-tag neo-tag--primary">
                          Assigned: {dayAssignment.templateId.name}
                        </span>
                      ) : (
                        <span className="neo-tag neo-tag--subtle">
                          No Routine Scheduled
                        </span>
                      )}
                      <span className="neo-tag neo-tag--lime">
                        {currentDayOfWeek}
                      </span>
                    </div>

                    <p style={{ fontSize: '13px', color: 'rgba(37, 41, 67, 0.7)', margin: 0 }}>
                      {dayAssignment?.templateId
                        ? `Follow your scheduled "${dayAssignment.templateId.name}" routine or pick a custom template to begin.`
                        : 'Choose a workout template or start an open session to track sets and cardio.'}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

                      <button
                        type="button"
                        className="btn btn--primary btn--lg"
                        style={{ width: '100%', minHeight: '48px', height: '48px' }}
                        onClick={handleStartWorkout}
                      >
                        Start Workout
                      </button>
                    </div>
                  </div>
                </WindowCard>
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

        {/* MONTHLY HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="gymflow-tab-content" id="gymflow-panel-history" role="tabpanel">
            <GymMonthHistoryView
              spaceId={spaceId}
              currentDate={currentDate}
              onSelectDateAndTab={(date, tab) => {
                goToDate(date);
                setActiveTab(tab);
              }}
            />
          </div>
        )}

        {/* TEMPLATES TAB */}
        {activeTab === 'templates' && (
          <div className="gymflow-tab-content" id="gymflow-panel-templates" role="tabpanel">
            <div className="gymflow-tab-header" style={{ marginBottom: '16px' }}>
              <div>
                <h2 className="gymflow-tab-title">Workout Templates</h2>
                <p className="gymflow-tab-sub">
                  Create reusable routines (e.g. Push, Pull, Legs) with body parts and exercises.
                </p>
              </div>
              <button
                type="button"
                className="btn btn--primary gymflow-tab-header__btn"
                style={{ height: '44px' }}
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
              <div
                className="gymflow-templates-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '16px'
                }}
              >
                {templates.map((tpl) => {
                  const tplId = tpl._id || tpl.id;
                  const totalExercises = (tpl.bodyParts || []).reduce(
                    (acc, bp) => acc + (bp.exercises?.length || 0),
                    0
                  );

                  return (
                    <WindowCard
                      key={tplId}
                      title={tpl.name}
                      headerBg="canvas"
                      action={
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn-icon btn-icon--sm"
                            style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px', padding: 0 }}
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
                            style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px', padding: 0 }}
                            onClick={() => setTemplateToDelete(tpl)}
                            aria-label={`Delete ${tpl.name}`}
                            title="Delete Template"
                          >
                            <TrashIcon size={15} />
                          </button>
                        </div>
                      }
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {tpl.description && (
                          <p
                            style={{
                              fontSize: '13px',
                              color: 'rgba(37,41,67,0.7)',
                              margin: 0,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {tpl.description}
                          </p>
                        )}

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span className="neo-tag neo-tag--lime">
                            {tpl.bodyParts?.length || 0} Body Parts
                          </span>
                          <span className="neo-tag neo-tag--primary">
                            {totalExercises} Exercises
                          </span>
                        </div>

                        {/* Body Part rows as small bordered rows */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {(tpl.bodyParts || []).map((bp, i) => (
                            <div
                              key={i}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 8px',
                                backgroundColor: '#F5F7FB',
                                border: '1.5px solid #252943',
                                borderRadius: '6px',
                                fontSize: '12px'
                              }}
                            >
                              <span className="neo-tag neo-tag--lime" style={{ fontSize: '10px', padding: '2px 6px' }}>
                                {bp.name}
                              </span>
                              <span style={{ color: '#252943', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {bp.exercises?.length > 0
                                  ? bp.exercises.map((e) => e.name).join(', ')
                                  : 'No exercises'}
                              </span>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          className="btn btn--primary"
                          style={{ width: '100%', height: '44px', marginTop: '4px' }}
                          onClick={async () => {
                            await startWorkout(tplId);
                            setActiveTab('workout');
                          }}
                        >
                          Start This Workout
                        </button>
                      </div>
                    </WindowCard>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SCHEDULE TAB */}
        {activeTab === 'schedule' && (
          <div className="gymflow-tab-content" id="gymflow-panel-schedule" role="tabpanel">
            <div className="gymflow-tab-header" style={{ marginBottom: '16px' }}>
              <div>
                <h2 className="gymflow-tab-title">Weekly Workout Assignment</h2>
                <p className="gymflow-tab-sub">
                  Configure your recurring workout routine and scheduled rest days.
                </p>
              </div>
              <button
                type="button"
                className="btn btn--primary gymflow-tab-header__btn"
                style={{ height: '44px' }}
                onClick={() => setIsWeeklyModalOpen(true)}
              >
                Edit Schedule
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(weeklySchedule?.days || []).map((d) => {
                const isScheduleToday = d.weekday === currentDayOfWeek;
                const shortDay = d.weekday.slice(0, 3).toUpperCase();

                return (
                  <div
                    key={d.weekday}
                    className={`gymflow-schedule-row ${isScheduleToday ? 'gymflow-schedule-row--today' : ''}`}
                    onClick={() => setIsWeeklyModalOpen(true)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Configure ${d.weekday}`}
                  >
                    {/* Left Column: Square Day Tile */}
                    <div className="gymflow-schedule-row__tile">
                      {shortDay}
                    </div>

                    {/* Right Column: Weekday Name + Today Chip on Line 1, Assignment Chip on Line 2 */}
                    <div className="gymflow-schedule-row__details">
                      <div className="gymflow-schedule-row__name-wrap">
                        <span className="gymflow-schedule-row__name">{d.weekday}</span>
                        {isScheduleToday && (
                          <span className="gymflow-schedule-row__today-sticker">
                            TODAY
                          </span>
                        )}
                      </div>

                      <div className="gymflow-schedule-row__assignment">
                        {d.isRestDay ? (
                          <span className="gymflow-chip gymflow-chip--lime">
                            <MoonIcon size={12} />
                            <span>Rest Day</span>
                          </span>
                        ) : d.templateId ? (
                          <span className="gymflow-chip gymflow-chip--primary">
                            {d.templateId.name || 'Assigned Template'}
                          </span>
                        ) : (
                          <span className="gymflow-chip gymflow-chip--dashed">
                            Not assigned
                          </span>
                        )}
                      </div>
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
            <GymAnalyticsView analytics={analytics} templates={templates} onRefresh={fetchAnalytics} />
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

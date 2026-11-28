import { useGoodBits } from '../hooks/useGoodBits.js';
import { GoodBitsCalendar } from '../components/GoodBitsCalendar.jsx';
import { DateDetailsView } from '../components/DateDetailsView.jsx';
import { GoodBitModal } from '../components/GoodBitModal.jsx';
import { DeleteGoodBitModal } from '../components/DeleteGoodBitModal.jsx';
import { MemoryReminderModal } from '../components/MemoryReminderModal.jsx';
import { PlusIcon } from '../../../components/common/Icons.jsx';

export function GoodBits() {
  const {
    todayStr,
    currentYearMonth,
    selectedDate,
    dayCounts,
    dateEntries,
    historicalMemories,
    isLoadingDate,
    isEntryModalOpen,
    editingEntry,
    entryToDelete,
    isReminderOpen,
    setEntryToDelete,
    handlePrevMonth,
    handleNextMonth,
    handleJumpToday,
    handleSelectDate,
    handleOpenAddModal,
    handleOpenEditModal,
    handleCloseModal,
    handleDismissReminder,
    createEntry,
    isCreating,
    updateEntry,
    isUpdating,
    deleteEntry,
    isDeleting
  } = useGoodBits();

  const handleSaveEntry = async (entryData) => {
    if (editingEntry) {
      await updateEntry({
        id: editingEntry._id || editingEntry.id,
        data: {
          title: entryData.title,
          description: entryData.description
        }
      });
    } else {
      await createEntry(entryData);
    }
  };

  const handleDeleteConfirm = async (id) => {
    await deleteEntry(id);
  };

  const isSelectedDateFuture = selectedDate > todayStr;

  return (
    <div className="goodbits-page">
      {/* Page Header */}
      <div className="goodbits-page-header">
        <div className="goodbits-page-header__left">
          <h1 className="goodbits-page-header__title">Good Bits</h1>
          <p className="goodbits-page-header__subtitle">
            A personal collection of positive daily moments, experiences, achievements, and memories.
          </p>
        </div>

        {!isSelectedDateFuture && (
          <div className="goodbits-page-header__actions">
            <button
              type="button"
              className="btn btn--primary goodbits-page-header__btn"
              onClick={handleOpenAddModal}
            >
              <PlusIcon size={16} />
              <span>Add Good Thing</span>
            </button>
          </div>
        )}
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="goodbits-layout">
        <section className="goodbits-layout__calendar-col" aria-label="Calendar navigation">
          <GoodBitsCalendar
            currentYearMonth={currentYearMonth}
            selectedDate={selectedDate}
            todayStr={todayStr}
            dayCounts={dayCounts}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onJumpToday={handleJumpToday}
            onSelectDate={handleSelectDate}
          />
        </section>

        <section className="goodbits-layout__details-col" aria-label="Selected date details">
          <DateDetailsView
            selectedDate={selectedDate}
            todayStr={todayStr}
            entries={dateEntries}
            isLoading={isLoadingDate}
            onAddClick={handleOpenAddModal}
            onEditClick={handleOpenEditModal}
            onDeleteClick={(entry) => setEntryToDelete(entry)}
          />
        </section>
      </div>

      {/* Add / Edit Entry Modal */}
      <GoodBitModal
        isOpen={isEntryModalOpen}
        entry={editingEntry}
        initialDate={selectedDate}
        todayStr={todayStr}
        onClose={handleCloseModal}
        onSave={handleSaveEntry}
        isSaving={isCreating || isUpdating}
      />

      {/* Delete Confirmation Modal */}
      <DeleteGoodBitModal
        isOpen={Boolean(entryToDelete)}
        entry={entryToDelete}
        onClose={() => setEntryToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />

      {/* Historical Memory Reminder Modal */}
      <MemoryReminderModal
        isOpen={isReminderOpen}
        memories={historicalMemories}
        targetDate={todayStr}
        onClose={handleDismissReminder}
      />
    </div>
  );
}

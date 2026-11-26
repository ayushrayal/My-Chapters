import { useState } from 'react';
import { useSomeday } from '../hooks/useSomeday.js';
import { SomedayStats } from '../components/SomedayStats.jsx';
import { ItemCard } from '../components/ItemCard.jsx';
import { ItemDetailsModal } from '../components/ItemDetailsModal.jsx';
import { ItemFormModal } from '../components/ItemFormModal.jsx';
import { CategoryManagementModal } from '../components/CategoryManagementModal.jsx';
import { StatusChangeModal } from '../components/StatusChangeModal.jsx';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal.jsx';
import { Button } from '../../../components/common/Button.jsx';
import { EmptyState } from '../../../components/common/EmptyState.jsx';
import { PageContainer } from '../../../components/common/PageContainer.jsx';
import { BottomSheet } from '../../../components/common/BottomSheet.jsx';
import { FilterChips } from '../../../components/common/FilterControl/FilterChips.jsx';
import { SegmentedFilter } from '../../../components/common/FilterControl/SegmentedFilter.jsx';
import { FilterIcon, CloseIcon } from '../../../components/common/Icons.jsx';

export function Someday() {
  const {
    categories,
    items,
    stats,
    categoryIdFilter,
    statusFilter,
    setCategoryIdFilter,
    setStatusFilter,
    isLoading,
    isRefreshing,
    error,
    setError,
    successMessage,
    setSuccessMessage,
    createItem,
    updateItem,
    deleteItem,
    changeStatus,
    createCategory,
    updateCategory,
    deleteCategory
  } = useSomeday();

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [purchasingItem, setPurchasingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);

  // Filter Sheet State
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [tempCategoryFilter, setTempCategoryFilter] = useState(categoryIdFilter);
  const [tempStatusFilter, setTempStatusFilter] = useState(statusFilter);

  const handleOpenFilterSheet = () => {
    setTempCategoryFilter(categoryIdFilter);
    setTempStatusFilter(statusFilter);
    setIsFilterSheetOpen(true);
  };

  const handleApplySheetFilters = () => {
    setCategoryIdFilter(tempCategoryFilter);
    setStatusFilter(tempStatusFilter);
    setIsFilterSheetOpen(false);
  };

  const handleClearSheetFilters = () => {
    setTempCategoryFilter('ALL');
    setTempStatusFilter('ALL');
    setCategoryIdFilter('ALL');
    setStatusFilter('ALL');
    setIsFilterSheetOpen(false);
  };

  const activeFiltersCount = (categoryIdFilter !== 'ALL' ? 1 : 0) + (statusFilter !== 'ALL' ? 1 : 0);
  const activeCategory = categories.find((c) => c.id === categoryIdFilter);

  // Status toggle handler
  const handleToggleStatus = (item) => {
    if (item.status === 'PLANNED') {
      setPurchasingItem(item);
    } else {
      changeStatus(item.id, 'PLANNED').catch((err) => {
        setError(err?.message || 'Failed to update item status');
      });
    }
  };

  // Determine contextual empty state message
  const getEmptyStateDetails = () => {
    if (stats.total === 0) {
      return {
        title: 'Nothing here yet.',
        subtitle: 'Add your first item to Someday.',
        showAddAction: true
      };
    }
    if (statusFilter === 'PLANNED') {
      return {
        title: 'No planned items.',
        subtitle: 'You currently have no items marked as planned in your collection.',
        showAddAction: true
      };
    }
    if (statusFilter === 'PURCHASED') {
      return {
        title: 'No purchased items.',
        subtitle: "You haven't marked any items as purchased yet.",
        showAddAction: false
      };
    }
    if (categoryIdFilter !== 'ALL') {
      const activeCat = categories.find((c) => c.id === categoryIdFilter);
      return {
        title: `No items in ${activeCat?.name || 'this category'}.`,
        subtitle: 'Add an item to this category or select another filter.',
        showAddAction: true
      };
    }
    return {
      title: 'No items match your filters.',
      subtitle: 'Try selecting a different category or status filter.',
      showAddAction: false
    };
  };

  const emptyState = getEmptyStateDetails();

  return (
    <PageContainer className="someday-page-container">
      <div className="someday-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* 1. Page Header with Title, Subtitle & Add Item Button */}
        <header className="someday-header">
          <div className="someday-header__content">
            <h1 className="someday-header__title">Someday</h1>
            <p className="someday-header__subtitle">Things you want. Things you&apos;ve got.</p>
          </div>

          {/* Desktop Add Item Button */}
          <div className="someday-desktop-add">
            <button
              type="button"
              className="btn btn--accent"
              onClick={() => setIsAddModalOpen(true)}
              aria-label="Add new item to Someday"
            >
              + Add Item
            </button>
          </div>

          {/* Mobile Full-Width Add Item Button */}
          <button
            type="button"
            className="btn btn--accent btn--full someday-mobile-add"
            onClick={() => setIsAddModalOpen(true)}
            aria-label="Add new item to Someday"
          >
            + Add Item
          </button>
        </header>

        {/* 2. Stat Cards: 3 compact tiles in one row (Total, Planned, Purchased) */}
        <SomedayStats stats={stats} />

        {/* Global Alerts */}
        {successMessage && (
          <div className="alert alert--success" role="status">
            <div className="alert__content">
              <p>{successMessage}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert--error" role="alert">
            <div className="alert__content">
              <p>{error}</p>
            </div>
            <button
              type="button"
              className="alert-dismiss-btn"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
            >
              &times;
            </button>
          </div>
        )}

        {/* 3. Filters Section (Neo-Brutalist: Category Tabs + Manage on Row 1, Independent Status Row 2) */}
        <div className="someday-filter-section">
          {/* ROW 1: Category Filter Tabs (Horizontal Scrollable) + Manage Button */}
          <div className="someday-filter-section__category-row">
            <div className="someday-filter-section__chips-wrap">
              <FilterChips
                options={[
                  { value: 'ALL', label: 'All' },
                  ...categories.map((cat) => ({
                    value: cat.id,
                    label: cat.name,
                    badge: cat.itemCount || 0
                  }))
                ]}
                value={categoryIdFilter}
                onChange={setCategoryIdFilter}
                ariaLabel="Filter by category"
              />
            </div>

            <button
              type="button"
              className="btn btn--secondary btn--sm someday-filter-section__manage-btn"
              onClick={() => setIsCategoryModalOpen(true)}
              aria-label="Manage categories"
            >
              Manage
            </button>
          </div>

          {/* ROW 2: Independent Status Filter Row */}
          <div className="someday-filter-section__status-row">
            <SegmentedFilter
              options={[
                { value: 'ALL', label: 'All' },
                { value: 'PLANNED', label: `Planned (${stats.planned})` },
                { value: 'PURCHASED', label: `Purchased (${stats.purchased})` }
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              ariaLabel="Filter items by purchase status"
              className="someday-filter-section__status-segmented"
            />
          </div>
        </div>

        {/* MOBILE APPLIED FILTERS CHIPS (Wrap, left-aligned) */}
        {activeFiltersCount > 0 && (
          <div className="filter-applied-row">
            {categoryIdFilter !== 'ALL' && (
              <span className="filter-applied-chip">
                <span>{activeCategory?.name || 'Category'}</span>
                <button
                  type="button"
                  className="filter-applied-chip__remove"
                  onClick={() => setCategoryIdFilter('ALL')}
                  aria-label="Remove category filter"
                >
                  <CloseIcon size={12} />
                </button>
              </span>
            )}
            {statusFilter !== 'ALL' && (
              <span className="filter-applied-chip">
                <span>{statusFilter === 'PLANNED' ? 'Planned' : 'Purchased'}</span>
                <button
                  type="button"
                  className="filter-applied-chip__remove"
                  onClick={() => setStatusFilter('ALL')}
                  aria-label="Remove status filter"
                >
                  <CloseIcon size={12} />
                </button>
              </span>
            )}
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setCategoryIdFilter('ALL');
                setStatusFilter('ALL');
              }}
              style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px' }}
            >
              Clear all
            </button>
          </div>
        )}

      {/* 4. Main Collection Grid: 1 col mobile, 2 tablet, 3 desktop */}
      <section className="someday-content" aria-label="Someday collection">
        {isLoading ? (
          <div className="someday-skeleton-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {[1, 2, 3].map((key) => (
              <div key={key} className="card" style={{ height: '180px' }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title={emptyState.title}
            subtitle={emptyState.subtitle}
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#252943" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            }
            action={
              emptyState.showAddAction ? (
                <button
                  type="button"
                  className="btn btn--accent"
                  onClick={() => setIsAddModalOpen(true)}
                >
                  + Add Item to Someday
                </button>
              ) : null
            }
          />
        ) : (
          <div
            className={`someday-grid ${isRefreshing ? 'someday-grid--refreshing' : ''}`}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px'
            }}
          >
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onViewDetails={(it) => setViewingItem(it)}
                onEdit={(it) => setEditingItem(it)}
                onChangeStatus={handleToggleStatus}
                onDelete={(it) => setDeletingItem(it)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modals */}
      <ItemFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={createItem}
        categories={categories}
        onOpenAddCategory={() => {
          setIsAddModalOpen(false);
          setIsCategoryModalOpen(true);
        }}
      />

      <ItemFormModal
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        itemToEdit={editingItem}
        onSubmit={(payload) => updateItem(editingItem.id, payload)}
        categories={categories}
        onOpenAddCategory={() => {
          setEditingItem(null);
          setIsCategoryModalOpen(true);
        }}
      />

      <ItemDetailsModal
        isOpen={Boolean(viewingItem)}
        item={viewingItem}
        onClose={() => setViewingItem(null)}
        onEdit={(it) => {
          setViewingItem(null);
          setEditingItem(it);
        }}
      />

      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onCreateCategory={createCategory}
        onUpdateCategory={updateCategory}
        onDeleteCategory={deleteCategory}
      />

      <StatusChangeModal
        isOpen={Boolean(purchasingItem)}
        item={purchasingItem}
        onClose={() => setPurchasingItem(null)}
        onConfirm={changeStatus}
      />

      <DeleteConfirmModal
        isOpen={Boolean(deletingItem)}
        title="Delete Item"
        message="Are you sure you want to delete this item from Someday? This action cannot be undone."
        itemName={deletingItem?.name}
        onClose={() => setDeletingItem(null)}
        onConfirm={() => deleteItem(deletingItem.id, deletingItem.name)}
      />

      {/* 5. Mobile & Desktop Filter Overlay (BottomSheet on mobile, Window modal on desktop) */}
      <BottomSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title="FILTERS"
        className="modal-container--md"
        footer={
          <div className="filter-sheet__footer">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={handleClearSheetFilters}
            >
              Clear
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleApplySheetFilters}
            >
              Apply Filters
            </button>
          </div>
        }
      >
        <div className="filter-sheet">
          {/* Section 1: Category */}
          <div className="filter-sheet__section">
            <p className="filter-sheet__label">CATEGORY</p>
            <div className="filter-sheet__chips-wrap">
              <button
                type="button"
                className={`filter-chip ${tempCategoryFilter === 'ALL' ? 'filter-chip--active' : ''}`}
                onClick={() => setTempCategoryFilter('ALL')}
              >
                <span className="filter-chip__label">All</span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`filter-chip ${tempCategoryFilter === cat.id ? 'filter-chip--active' : ''}`}
                  onClick={() => setTempCategoryFilter(cat.id)}
                >
                  <span className="filter-chip__label">{cat.name}</span>
                  {typeof cat.itemCount === 'number' && (
                    <span className="filter-chip__badge">{cat.itemCount}</span>
                  )}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn btn--secondary btn--full"
              onClick={() => {
                setIsFilterSheetOpen(false);
                setIsCategoryModalOpen(true);
              }}
              style={{ marginTop: '12px', height: '44px' }}
            >
              Manage categories
            </button>
          </div>

          {/* Section 2: Status */}
          <div className="filter-sheet__section" style={{ marginTop: '16px' }}>
            <p className="filter-sheet__label">STATUS</p>
            <div style={{ width: '100%' }}>
              <SegmentedFilter
                options={[
                  { value: 'ALL', label: 'All' },
                  { value: 'PLANNED', label: `Planned (${stats.planned})` },
                  { value: 'PURCHASED', label: `Purchased (${stats.purchased})` }
                ]}
                value={tempStatusFilter}
                onChange={setTempStatusFilter}
                className="segmented-filter--full"
              />
            </div>
          </div>
        </div>
      </BottomSheet>
    </div>
  </PageContainer>
);
}

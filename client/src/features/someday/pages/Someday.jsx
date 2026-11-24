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
import { FilterSelect, FilterChips } from '../../../components/common/FilterControl/index.js';

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

  // Status toggle handler
  const handleToggleStatus = (item) => {
    if (item.status === 'PLANNED') {
      // Opening status change modal to prompt for purchase date (defaults to today)
      setPurchasingItem(item);
    } else {
      // Revert to PLANNED directly (backend clears purchaseDate)
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
    <div className="someday-page">
      {/* 1. Page Header with Title, Subtitle & Gradient Desktop Add Button */}
      <header className="someday-header">
        <div className="someday-header__content">
          <h1 className="someday-header__title">Someday</h1>
          <p className="someday-header__subtitle">
            Things you want. Things you've got.
          </p>
        </div>

        <div className="someday-header__actions">
          <button
            type="button"
            className="someday-header__add-btn"
            onClick={() => setIsAddModalOpen(true)}
            aria-label="Add new item to Someday"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add Item</span>
          </button>
        </div>
      </header>

      {/* 2. Stat Cards (Total, Planned, Purchased with Icons & Accent Bars) */}
      <SomedayStats stats={stats} />

      {/* Global Alerts */}
      {successMessage && (
        <div className="someday-alert" role="status">
          <div className="alert alert--success">
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="someday-alert" role="alert">
          <div className="alert alert--error">
            <p>{error}</p>
            <button
              type="button"
              className="alert-dismiss-btn"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* 3. Filters Toolbar: Category & Segmented Status Controls */}
      <section className="someday-controls" aria-label="Someday item filters">
        {/* Desktop Category Dropdown & Manage */}
        <div className="someday-controls__category-group">
          <div className="someday-controls__desktop-category">
            <label className="someday-controls__label">
              Category
            </label>
            <div className="someday-controls__select-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <FilterSelect
                  value={categoryIdFilter}
                  onChange={setCategoryIdFilter}
                  options={[
                    { value: 'ALL', label: 'All Categories' },
                    ...categories.map((cat) => ({
                      value: cat.id,
                      label: `${cat.name} ${cat.isSystem ? '(Default)' : ''} (${cat.itemCount || 0})`
                    }))
                  ]}
                  placeholder="All Categories"
                  allowClear={false}
                  ariaLabel="Filter items by category"
                />
              </div>

              <button
                type="button"
                className="someday-controls__manage-btn"
                onClick={() => setIsCategoryModalOpen(true)}
                title="Manage categories"
                aria-label="Open category management"
              >
                Manage
              </button>
            </div>
          </div>

          {/* Mobile Horizontally Scrollable Chips */}
          <div className="someday-controls__mobile-chips" role="tablist" aria-label="Category filter chips">
            <button
              type="button"
              className={`category-chip ${categoryIdFilter === 'ALL' ? 'category-chip--active' : ''}`}
              onClick={() => setCategoryIdFilter('ALL')}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`category-chip ${categoryIdFilter === cat.id ? 'category-chip--active' : ''}`}
                onClick={() => setCategoryIdFilter(cat.id)}
              >
                <span>{cat.name}</span>
                <span className="category-chip__count">{cat.itemCount || 0}</span>
              </button>
            ))}
            <button
              type="button"
              className="category-chip category-chip--manage"
              onClick={() => setIsCategoryModalOpen(true)}
              aria-label="Manage categories"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Manage</span>
            </button>
          </div>
        </div>

        {/* Status Segmented Control with Counts in Small Badges */}
        <div className="someday-controls__status-group">
          <span className="someday-controls__label">Status</span>
          <div className="status-segmented-control" role="radiogroup" aria-label="Status filter">
            <button
              type="button"
              className={`status-segmented-btn ${statusFilter === 'ALL' ? 'status-segmented-btn--active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
              aria-checked={statusFilter === 'ALL'}
              role="radio"
            >
              <span>All</span>
            </button>
            <button
              type="button"
              className={`status-segmented-btn ${statusFilter === 'PLANNED' ? 'status-segmented-btn--active' : ''}`}
              onClick={() => setStatusFilter('PLANNED')}
              aria-checked={statusFilter === 'PLANNED'}
              role="radio"
            >
              Planned ({stats.planned})
            </button>
            <button
              type="button"
              className={`status-segmented-btn ${statusFilter === 'PURCHASED' ? 'status-segmented-btn--active' : ''}`}
              onClick={() => setStatusFilter('PURCHASED')}
              aria-checked={statusFilter === 'PURCHASED'}
              role="radio"
            >
              Purchased ({stats.purchased})
            </button>
          </div>
        </div>
      </section>

      {/* 4. Main Collection Grid (1 col mobile, 2 tablet, 3 desktop) */}
      <section className="someday-content" aria-label="Someday collection">
        {isLoading ? (
          /* Skeleton Loader Placeholder Grid */
          <div className="someday-skeleton-grid" aria-label="Loading someday items">
            {[1, 2, 3, 4, 5, 6].map((key) => (
              <div key={key} className="someday-skeleton-card">
                <div className="someday-skeleton-header">
                  <div className="skeleton-box skeleton-box--badge" />
                  <div className="skeleton-box skeleton-box--badge" />
                </div>
                <div className="skeleton-box skeleton-box--title" />
                <div className="skeleton-box skeleton-box--text" />
                <div className="skeleton-box skeleton-box--text skeleton-box--short" />
                <div className="someday-skeleton-actions">
                  <div className="skeleton-box skeleton-box--btn" />
                  <div className="skeleton-box skeleton-box--btn" />
                  <div className="skeleton-box skeleton-box--btn" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          /* 5. Designed Empty State with Illustration-Style Icon */
          <div className="someday-empty-state">
            <div className="someday-empty-state__icon-box" aria-hidden="true">
              <svg
                width="56"
                height="56"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="someday-empty-state__svg"
              >
                <path d="M19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 className="someday-empty-state__title">{emptyState.title}</h3>
            <p className="someday-empty-state__subtitle">{emptyState.subtitle}</p>
            {emptyState.showAddAction && (
              <button
                type="button"
                className="someday-empty-state__action-btn"
                onClick={() => setIsAddModalOpen(true)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Add Item to Someday</span>
              </button>
            )}
          </div>
        ) : (
          <div className={`someday-grid ${isRefreshing ? 'someday-grid--refreshing' : ''}`}>
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

      {/* Mobile Floating Action Button (FAB) at Bottom-Right above the tab bar */}
      <button
        type="button"
        className="someday-mobile-fab"
        onClick={() => setIsAddModalOpen(true)}
        aria-label="Add new item"
        title="Add item"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* --- Modals --- */}

      {/* 1. Add Item Modal */}
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

      {/* 2. Edit Item Modal */}
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

      {/* 3. Item Details Modal */}
      <ItemDetailsModal
        isOpen={Boolean(viewingItem)}
        item={viewingItem}
        onClose={() => setViewingItem(null)}
        onEdit={(it) => {
          setViewingItem(null);
          setEditingItem(it);
        }}
      />

      {/* 4. Category Management Modal */}
      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onCreateCategory={createCategory}
        onUpdateCategory={updateCategory}
        onDeleteCategory={deleteCategory}
      />

      {/* 5. Status Change Modal (for Purchased with date picker) */}
      <StatusChangeModal
        isOpen={Boolean(purchasingItem)}
        item={purchasingItem}
        onClose={() => setPurchasingItem(null)}
        onConfirm={changeStatus}
      />

      {/* 6. Delete Item Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingItem)}
        title="Delete Item"
        message="Are you sure you want to delete this item from Someday? This action cannot be undone."
        itemName={deletingItem?.name}
        onClose={() => setDeletingItem(null)}
        onConfirm={() => deleteItem(deletingItem.id, deletingItem.name)}
      />
    </div>
  );
}


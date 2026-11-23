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
import { Loader } from '../../../components/common/Loader.jsx';

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
      {/* Page Header */}
      <header className="someday-header">
        <div className="someday-header__content">
          <h1 className="someday-header__title">Someday</h1>
          <p className="someday-header__subtitle">
            Things you want. Things you've got.
          </p>
        </div>

        <div className="someday-header__actions">
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAddModalOpen(true)}
            aria-label="Add new item to Someday"
          >
            + Add Item
          </Button>
        </div>
      </header>

      {/* Real Statistics Calculated from Actual API Data */}
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

      {/* Filters Bar: Category & Status Controls */}
      <section className="someday-controls" aria-label="Someday item filters">
        {/* Category Dropdown & Management trigger */}
        <div className="someday-controls__category-group">
          <label htmlFor="someday-category-filter" className="someday-controls__label">
            Category
          </label>
          <div className="someday-controls__select-wrapper">
            <select
              id="someday-category-filter"
              value={categoryIdFilter}
              onChange={(e) => setCategoryIdFilter(e.target.value)}
              className="form-input someday-controls__select"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} {cat.isSystem ? '(Default)' : ''} ({cat.itemCount || 0})
                </option>
              ))}
            </select>

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

        {/* Status Filter Tabs (All, Planned, Purchased) */}
        <div className="someday-controls__status-group">
          <span className="someday-controls__label">Status</span>
          <div className="status-filter-pills" role="radiogroup" aria-label="Status filter">
            <button
              type="button"
              className={`status-filter-pill ${statusFilter === 'ALL' ? 'status-filter-pill--active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
              aria-checked={statusFilter === 'ALL'}
              role="radio"
            >
              All
            </button>
            <button
              type="button"
              className={`status-filter-pill ${statusFilter === 'PLANNED' ? 'status-filter-pill--active' : ''}`}
              onClick={() => setStatusFilter('PLANNED')}
              aria-checked={statusFilter === 'PLANNED'}
              role="radio"
            >
              Planned ({stats.planned})
            </button>
            <button
              type="button"
              className={`status-filter-pill ${statusFilter === 'PURCHASED' ? 'status-filter-pill--active' : ''}`}
              onClick={() => setStatusFilter('PURCHASED')}
              aria-checked={statusFilter === 'PURCHASED'}
              role="radio"
            >
              Purchased ({stats.purchased})
            </button>
          </div>
        </div>
      </section>

      {/* Main Collection Grid or Empty State */}
      <section className="someday-content" aria-label="Someday collection">
        {isLoading ? (
          <div className="someday-loading" aria-live="polite">
            <Loader message="Loading your Someday collection..." />
          </div>
        ) : items.length === 0 ? (
          <div className="someday-empty-state">
            <div className="someday-empty-state__icon" aria-hidden="true">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
              </svg>
            </div>
            <h3 className="someday-empty-state__title">{emptyState.title}</h3>
            <p className="someday-empty-state__subtitle">{emptyState.subtitle}</p>
            {emptyState.showAddAction && (
              <Button
                variant="primary"
                onClick={() => setIsAddModalOpen(true)}
                className="someday-empty-state__action"
              >
                + Add Item
              </Button>
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


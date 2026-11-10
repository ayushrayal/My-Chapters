import { useState } from 'react';
import { Button } from '../../../components/common/Button.jsx';
import { Input } from '../../../components/common/Input.jsx';

export function CategoryManagementModal({
  isOpen,
  onClose,
  categories = [],
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory
}) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Inline editing state
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);

  // Deletion confirmation state
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  if (!isOpen) return null;

  // Handle Add Category
  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setCreateError('Category name cannot be empty');
      return;
    }

    setCreateError(null);
    setIsCreating(true);
    try {
      await onCreateCategory(trimmed);
      setNewCategoryName('');
    } catch (err) {
      setCreateError(err?.message || 'Failed to create category');
    } finally {
      setIsCreating(false);
    }
  };

  // Start inline editing
  const handleStartEdit = (category) => {
    if (category.isSystem) return;
    setEditingCategoryId(category.id);
    setEditingName(category.name);
    setUpdateError(null);
  };

  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setEditingName('');
    setUpdateError(null);
  };

  // Submit edit
  const handleSaveEdit = async (categoryId) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setUpdateError('Category name cannot be empty');
      return;
    }

    setUpdateError(null);
    setIsUpdating(true);
    try {
      await onUpdateCategory(categoryId, trimmed);
      setEditingCategoryId(null);
      setEditingName('');
    } catch (err) {
      setUpdateError(err?.message || 'Failed to update category name');
    } finally {
      setIsUpdating(false);
    }
  };

  // Submit deletion
  const handleConfirmDelete = async () => {
    if (!deletingCategory || deletingCategory.isSystem) return;

    setDeleteError(null);
    setIsDeleting(true);
    try {
      await onDeleteCategory(deletingCategory.id, deletingCategory.name);
      setDeletingCategory(null);
    } catch (err) {
      setDeleteError(err?.message || 'Failed to delete category');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-management-title"
      onClick={onClose}
    >
      <div
        className="modal-container modal-container--md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="category-management-title" className="modal-title">
            Manage Categories
          </h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          {/* Add Category Section */}
          <form onSubmit={handleCreate} className="category-add-form">
            <h3 className="category-section-subtitle">Create New Category</h3>
            {createError && (
              <div className="alert alert--error" role="alert" style={{ marginBottom: '12px' }}>
                <p>{createError}</p>
              </div>
            )}
            <div className="category-add-row">
              <Input
                name="newCategoryName"
                placeholder="e.g. Watches, Books, Tech"
                value={newCategoryName}
                onChange={(e) => {
                  setNewCategoryName(e.target.value);
                  if (createError) setCreateError(null);
                }}
                maxLength={60}
                className="category-add-input"
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isCreating}
                disabled={!newCategoryName.trim()}
              >
                Add
              </Button>
            </div>
          </form>

          {/* Deletion Warning Dialog (inline modal step) */}
          {deletingCategory && (
            <div className="category-delete-warning" role="alertdialog">
              <div className="alert alert--warning">
                <div className="alert__content">
                  <h4 className="alert__title">Delete "{deletingCategory.name}"?</h4>
                  <p>
                    Items in this category will be moved to <strong>Other</strong>.
                  </p>
                  {deleteError && (
                    <p style={{ marginTop: '8px', color: '#DEE0ED' }}>{deleteError}</p>
                  )}
                  <div className="category-delete-actions">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingCategory(null)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleConfirmDelete}
                      isLoading={isDeleting}
                    >
                      Confirm Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Category List */}
          <div className="category-list-section">
            <h3 className="category-section-subtitle">
              Existing Categories ({categories.length})
            </h3>

            {updateError && (
              <div className="alert alert--error" role="alert" style={{ marginBottom: '12px' }}>
                <p>{updateError}</p>
              </div>
            )}

            <ul className="category-items-list">
              {categories.map((cat) => {
                const isEditingThis = editingCategoryId === cat.id;

                return (
                  <li key={cat.id} className="category-list-item">
                    {isEditingThis ? (
                      <div className="category-edit-row">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="form-input category-edit-input"
                          maxLength={60}
                          autoFocus
                        />
                        <div className="category-edit-buttons">
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => handleSaveEdit(cat.id)}
                            isLoading={isUpdating}
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelEdit}
                            disabled={isUpdating}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="category-list-item__info">
                          <span className="category-list-item__name">
                            {cat.name}
                          </span>
                          {cat.isSystem ? (
                            <span className="category-list-item__system-badge" title="Predefined system fallback category">
                              System Default
                            </span>
                          ) : (
                            <span className="category-list-item__count">
                              {cat.itemCount || 0} item{cat.itemCount === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>

                        {!cat.isSystem && (
                          <div className="category-list-item__actions">
                            <button
                              type="button"
                              className="category-action-link"
                              onClick={() => handleStartEdit(cat)}
                              aria-label={`Rename category ${cat.name}`}
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              className="category-action-link category-action-link--delete"
                              onClick={() => setDeletingCategory(cat)}
                              aria-label={`Delete category ${cat.name}`}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

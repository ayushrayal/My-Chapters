import { useState, useEffect, useCallback, useMemo } from 'react';
import { somedayApi } from '../services/someday.api.js';
import { parseApiError } from '../../../utils/error-handler.js';

export function useSomeday() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [allItemsForStats, setAllItemsForStats] = useState([]);
  const [categoryIdFilter, setCategoryIdFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Auto-dismiss success notifications after 4 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Load all categories
  const loadCategories = useCallback(async () => {
    try {
      const data = await somedayApi.getCategories();
      setCategories(data);
      return data;
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
      return [];
    }
  }, []);

  // Load items based on active filters
  const loadItems = useCallback(async (catFilter = categoryIdFilter, statFilter = statusFilter) => {
    try {
      const filterParams = {};
      if (catFilter !== 'ALL') filterParams.categoryId = catFilter;
      if (statFilter !== 'ALL') filterParams.status = statFilter;

      const [filteredData, allData] = await Promise.all([
        somedayApi.getItems(filterParams),
        somedayApi.getItems({}) // Unfiltered to compute exact overall Space statistics
      ]);

      setItems(filteredData);
      setAllItemsForStats(allData);
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
    }
  }, [categoryIdFilter, statusFilter]);

  // Initial load
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([loadCategories(), loadItems('ALL', 'ALL')]);
    } finally {
      setIsLoading(false);
    }
  }, [loadCategories, loadItems]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // When filters change, reload items
  const handleCategoryFilterChange = useCallback((newCatId) => {
    setCategoryIdFilter(newCatId);
    setIsRefreshing(true);
    loadItems(newCatId, statusFilter).finally(() => setIsRefreshing(false));
  }, [loadItems, statusFilter]);

  const handleStatusFilterChange = useCallback((newStatus) => {
    setStatusFilter(newStatus);
    setIsRefreshing(true);
    loadItems(categoryIdFilter, newStatus).finally(() => setIsRefreshing(false));
  }, [loadItems, categoryIdFilter]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([loadCategories(), loadItems(categoryIdFilter, statusFilter)]);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadCategories, loadItems, categoryIdFilter, statusFilter]);

  // Calculate real statistics from all items in Space
  const stats = useMemo(() => {
    const total = allItemsForStats.length;
    const planned = allItemsForStats.filter((item) => item.status === 'PLANNED').length;
    const purchased = allItemsForStats.filter((item) => item.status === 'PURCHASED').length;
    return { total, planned, purchased };
  }, [allItemsForStats]);

  // --- Item Actions ---

  const createItem = async (payload) => {
    setError(null);
    try {
      const newItem = await somedayApi.createItem(payload);
      setSuccessMessage(`"${newItem.name}" added to Someday.`);
      await refreshAll();
      return newItem;
    } catch (err) {
      const parsed = parseApiError(err);
      throw parsed;
    }
  };

  const updateItem = async (itemId, payload) => {
    setError(null);
    try {
      const updated = await somedayApi.updateItem(itemId, payload);
      setSuccessMessage(`"${updated.name}" updated successfully.`);
      await refreshAll();
      return updated;
    } catch (err) {
      const parsed = parseApiError(err);
      throw parsed;
    }
  };

  const deleteItem = async (itemId, itemName = 'Item') => {
    setError(null);
    try {
      await somedayApi.deleteItem(itemId);
      setSuccessMessage(`"${itemName}" deleted from Someday.`);
      await refreshAll();
      return true;
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
      throw parsed;
    }
  };

  const changeStatus = async (itemId, newStatus, purchaseDate = null) => {
    setError(null);
    try {
      const payload = { status: newStatus };
      if (newStatus === 'PURCHASED') {
        if (purchaseDate) {
          payload.purchaseDate = purchaseDate;
        }
      }
      const updated = await somedayApi.updateItem(itemId, payload);
      setSuccessMessage(
        newStatus === 'PURCHASED'
          ? `Marked "${updated.name}" as Purchased.`
          : `Moved "${updated.name}" back to Planned.`
      );
      await refreshAll();
      return updated;
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
      throw parsed;
    }
  };

  // --- Category Actions ---

  const createCategory = async (name) => {
    setError(null);
    try {
      const newCat = await somedayApi.createCategory(name);
      setSuccessMessage(`Category "${newCat.name}" created.`);
      await refreshAll();
      return newCat;
    } catch (err) {
      const parsed = parseApiError(err);
      throw parsed;
    }
  };

  const updateCategory = async (categoryId, name) => {
    setError(null);
    try {
      const updated = await somedayApi.updateCategory(categoryId, name);
      setSuccessMessage(`Category renamed to "${updated.name}".`);
      await refreshAll();
      return updated;
    } catch (err) {
      const parsed = parseApiError(err);
      throw parsed;
    }
  };

  const deleteCategory = async (categoryId, categoryName = 'Category') => {
    setError(null);
    try {
      const result = await somedayApi.deleteCategory(categoryId);
      const moved = result.movedItems || 0;
      setSuccessMessage(
        `Category "${categoryName}" deleted. ${moved} item${moved === 1 ? '' : 's'} moved to Other.`
      );
      // If active filter was the deleted category, reset to ALL
      if (categoryIdFilter === categoryId) {
        setCategoryIdFilter('ALL');
      }
      await refreshAll();
      return result;
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
      throw parsed;
    }
  };

  return {
    categories,
    items,
    stats,
    categoryIdFilter,
    statusFilter,
    setCategoryIdFilter: handleCategoryFilterChange,
    setStatusFilter: handleStatusFilterChange,
    isLoading,
    isRefreshing,
    error,
    setError,
    successMessage,
    setSuccessMessage,
    refreshAll,
    createItem,
    updateItem,
    deleteItem,
    changeStatus,
    createCategory,
    updateCategory,
    deleteCategory
  };
}


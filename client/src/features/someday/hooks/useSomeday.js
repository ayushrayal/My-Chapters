import { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { somedayApi } from '../services/someday.api.js';
import { queryClient } from '../../../lib/queryClient.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { AuthContext } from '../../auth/context/AuthContext.jsx';
import { parseApiError } from '../../../utils/error-handler.js';
import { useToast } from '../../../context/ToastContext.jsx';

export function useSomeday() {
  const auth = useContext(AuthContext);
  const spaceId = auth?.space?.id;
  const { toast } = useToast();

  const [categoryIdFilter, setCategoryIdFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
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

  // 1. Categories Query (5-minute stale time)
  const {
    data: categories = [],
    isLoading: isLoadingCategories
  } = useQuery(
    {
      queryKey: queryKeys.someday.categories(spaceId),
      queryFn: async () => {
        try {
          return await somedayApi.getCategories();
        } catch (err) {
          const parsed = parseApiError(err);
          setError(parsed.message);
          return [];
        }
      },
      staleTime: 5 * 60 * 1000
    },
    queryClient
  );

  // 2. All Items Query (for overall Space statistics computation)
  const {
    data: allItemsForStats = [],
    isLoading: isLoadingAllItems
  } = useQuery(
    {
      queryKey: queryKeys.someday.allItems(spaceId),
      queryFn: async () => {
        try {
          return await somedayApi.getItems({});
        } catch {
          return [];
        }
      },
      staleTime: 60 * 1000
    },
    queryClient
  );

  // Derived filter parameters for active item list
  const activeFilters = useMemo(() => {
    const p = {};
    if (categoryIdFilter !== 'ALL') p.categoryId = categoryIdFilter;
    if (statusFilter !== 'ALL') p.status = statusFilter;
    return p;
  }, [categoryIdFilter, statusFilter]);

  // 3. Filtered Items Query (1-minute stale time)
  const {
    data: items = [],
    isLoading: isLoadingItems,
    isFetching: isFetchingItems
  } = useQuery(
    {
      queryKey: queryKeys.someday.items(spaceId, activeFilters),
      queryFn: async () => {
        try {
          return await somedayApi.getItems(activeFilters);
        } catch (err) {
          const parsed = parseApiError(err);
          setError(parsed.message);
          return [];
        }
      },
      staleTime: 60 * 1000
    },
    queryClient
  );

  const isLoading = isLoadingCategories || isLoadingItems || isLoadingAllItems;
  const isRefreshing = isFetchingItems;

  // Filter change handlers
  const handleCategoryFilterChange = useCallback((newCatId) => {
    setCategoryIdFilter(newCatId);
  }, []);

  const handleStatusFilterChange = useCallback((newStatus) => {
    setStatusFilter(newStatus);
  }, []);

  // Compute exact statistics from all items in Space
  const stats = useMemo(() => {
    const total = allItemsForStats.length;
    const planned = allItemsForStats.filter((item) => item.status === 'PLANNED').length;
    const purchased = allItemsForStats.filter((item) => item.status === 'PURCHASED').length;
    return { total, planned, purchased };
  }, [allItemsForStats]);

  // Refresh all Someday data manually
  const refreshAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.someday.all(spaceId) });
  }, [spaceId]);

  // --- Item Actions ---

  const createItem = async (payload) => {
    setError(null);
    try {
      const newItem = await somedayApi.createItem(payload);
      const msg = `"${newItem.name}" added to Someday.`;
      setSuccessMessage(msg);
      toast?.success?.(msg);
      await refreshAll();
      return newItem;
    } catch (err) {
      const parsed = parseApiError(err);
      toast?.error?.(parsed.message || 'Failed to create item');
      throw parsed;
    }
  };

  const updateItem = async (itemId, payload) => {
    setError(null);
    try {
      const updated = await somedayApi.updateItem(itemId, payload);
      const msg = `"${updated.name}" updated successfully.`;
      setSuccessMessage(msg);
      toast?.success?.(msg);
      await refreshAll();
      return updated;
    } catch (err) {
      const parsed = parseApiError(err);
      toast?.error?.(parsed.message || 'Failed to update item');
      throw parsed;
    }
  };

  const deleteItem = async (itemId, itemName = 'Item') => {
    setError(null);
    try {
      await somedayApi.deleteItem(itemId);
      const msg = `"${itemName}" deleted from Someday.`;
      setSuccessMessage(msg);
      toast?.success?.(msg);
      await refreshAll();
      return true;
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
      toast?.error?.(parsed.message || 'Failed to delete item');
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
      const msg =
        newStatus === 'PURCHASED'
          ? `Marked "${updated.name}" as Purchased.`
          : `Moved "${updated.name}" back to Planned.`;
      setSuccessMessage(msg);
      toast?.success?.(msg);
      await refreshAll();
      return updated;
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
      toast?.error?.(parsed.message || 'Failed to update item status');
      throw parsed;
    }
  };

  // --- Category Actions ---

  const createCategory = async (name) => {
    setError(null);
    try {
      const newCat = await somedayApi.createCategory(name);
      const msg = `Category "${newCat.name}" created.`;
      setSuccessMessage(msg);
      toast?.success?.(msg);
      await refreshAll();
      return newCat;
    } catch (err) {
      const parsed = parseApiError(err);
      toast?.error?.(parsed.message || 'Failed to create category');
      throw parsed;
    }
  };

  const updateCategory = async (categoryId, name) => {
    setError(null);
    try {
      const updated = await somedayApi.updateCategory(categoryId, name);
      const msg = `Category renamed to "${updated.name}".`;
      setSuccessMessage(msg);
      toast?.success?.(msg);
      await refreshAll();
      return updated;
    } catch (err) {
      const parsed = parseApiError(err);
      toast?.error?.(parsed.message || 'Failed to rename category');
      throw parsed;
    }
  };

  const deleteCategory = async (categoryId, categoryName = 'Category') => {
    setError(null);
    try {
      const result = await somedayApi.deleteCategory(categoryId);
      const moved = result.movedItems || 0;
      const msg = `Category "${categoryName}" deleted. ${moved} item${moved === 1 ? '' : 's'} moved to Other.`;
      setSuccessMessage(msg);
      toast?.success?.(msg);
      if (categoryIdFilter === categoryId) {
        setCategoryIdFilter('ALL');
      }
      await refreshAll();
      return result;
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
      toast?.error?.(parsed.message || 'Failed to delete category');
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

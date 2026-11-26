/**
 * Central Space-Aware Query Key Factory
 *
 * Ensures all server queries are scoped to the authenticated Space ID,
 * preventing cross-user and cross-tenant cache bleed.
 */
export const queryKeys = {
  auth: {
    me: () => ['auth', 'me']
  },

  gymflow: {
    all: (spaceId) => ['gymflow', spaceId || 'anonymous'],
    templates: (spaceId) => ['gymflow', spaceId || 'anonymous', 'templates'],
    template: (spaceId, id) => ['gymflow', spaceId || 'anonymous', 'template', id],
    schedule: (spaceId) => ['gymflow', spaceId || 'anonymous', 'schedule'],
    session: (spaceId, date) => ['gymflow', spaceId || 'anonymous', 'session', date],
    overview: (spaceId, month) => ['gymflow', spaceId || 'anonymous', 'overview', month],
    comparisons: (spaceId, date) => ['gymflow', spaceId || 'anonymous', 'comparisons', date],
    analytics: (spaceId, params) => ['gymflow', spaceId || 'anonymous', 'analytics', params || {}]
  },

  someday: {
    all: (spaceId) => ['someday', spaceId || 'anonymous'],
    categories: (spaceId) => ['someday', spaceId || 'anonymous', 'categories'],
    items: (spaceId, filters) => ['someday', spaceId || 'anonymous', 'items', filters || {}],
    allItems: (spaceId) => ['someday', spaceId || 'anonymous', 'items', 'ALL_STATS']
  },

  dayflow: {
    all: (spaceId) => ['dayflow', spaceId || 'anonymous'],
    templates: (spaceId) => ['dayflow', spaceId || 'anonymous', 'templates'],
    schedule: (spaceId, date) => ['dayflow', spaceId || 'anonymous', 'schedule', date],
    overview: (spaceId, month) => ['dayflow', spaceId || 'anonymous', 'overview', month],
    analytics: (spaceId, filters) => ['dayflow', spaceId || 'anonymous', 'analytics', filters || {}]
  },

  dashboard: {
    all: (spaceId) => ['dashboard', spaceId || 'anonymous'],
    overview: (spaceId, params) => ['dashboard', spaceId || 'anonymous', 'overview', params || {}]
  }
};

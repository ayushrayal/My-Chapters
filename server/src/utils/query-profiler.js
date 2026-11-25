import { env } from '../config/env.js';

/**
 * Lightweight, Production-Safe MongoDB Query Profiler
 *
 * Tracks query durations, operation counts, and identifies slow queries
 * without logging sensitive user parameters, credentials, or PII.
 */
class QueryProfiler {
  constructor() {
    this.enabled = env.ENABLE_QUERY_PROFILING === 'true';
    this.slowQueryThresholdMs = env.SLOW_QUERY_THRESHOLD_MS || 100;
    this.totalQueries = 0;
    this.slowQueries = 0;
    this.totalDurationMs = 0;

    /** @type {Record<string, { count: number, totalMs: number, slowCount: number }>} */
    this.modelStats = {};

    /** @type {Array<{ model: string, op: string, durationMs: number, timestamp: string }>} */
    this.recentSlowQueries = [];
    this.maxSlowQueryLogSize = 50;

    // Recent durations for percentiles (bounded rolling window of 500 queries)
    this.recentDurations = [];
    this.maxDurationSampleSize = 500;
  }

  /**
   * Record a completed query.
   * @param {object} info
   * @param {string} info.model - Mongoose model name
   * @param {string} info.op - Query operation (find, findOne, save, etc.)
   * @param {number} info.durationMs - Duration in milliseconds
   */
  recordQuery({ model = 'Unknown', op = 'op', durationMs = 0 }) {
    if (!this.enabled) return;

    this.totalQueries++;
    this.totalDurationMs += durationMs;

    // Maintain recent durations sample
    if (this.recentDurations.length >= this.maxDurationSampleSize) {
      this.recentDurations.shift();
    }
    this.recentDurations.push(durationMs);

    // Track per-model stats
    if (!this.modelStats[model]) {
      this.modelStats[model] = { count: 0, totalMs: 0, slowCount: 0 };
    }
    this.modelStats[model].count++;
    this.modelStats[model].totalMs += durationMs;

    // Check slow query threshold
    if (durationMs >= this.slowQueryThresholdMs) {
      this.slowQueries++;
      this.modelStats[model].slowCount++;

      // Log warning in console without logging query filters or sensitive data
      console.warn(
        `[Database Profiler] SLOW QUERY: ${model}.${op} took ${durationMs}ms (threshold: ${this.slowQueryThresholdMs}ms)`
      );

      // Record in bounded ring buffer
      if (this.recentSlowQueries.length >= this.maxSlowQueryLogSize) {
        this.recentSlowQueries.shift();
      }
      this.recentSlowQueries.push({
        model,
        op,
        durationMs,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Calculate percentile from sampled durations.
   * @param {number} p - Percentile (e.g. 50, 95, 99)
   * @returns {number}
   */
  getPercentile(p) {
    if (this.recentDurations.length === 0) return 0;
    const sorted = [...this.recentDurations].sort((a, b) => a - b);
    const index = Math.min(
      sorted.length - 1,
      Math.max(0, Math.floor((p / 100) * sorted.length))
    );
    return sorted[index];
  }

  /**
   * Returns sanitized diagnostic statistics.
   * @returns {object}
   */
  getStats() {
    const avgDurationMs =
      this.totalQueries > 0
        ? Number((this.totalDurationMs / this.totalQueries).toFixed(2))
        : 0;

    return {
      enabled: this.enabled,
      slowQueryThresholdMs: this.slowQueryThresholdMs,
      totalQueries: this.totalQueries,
      slowQueries: this.slowQueries,
      avgDurationMs,
      p50DurationMs: this.getPercentile(50),
      p95DurationMs: this.getPercentile(95),
      p99DurationMs: this.getPercentile(99),
      modelStats: this.modelStats,
      recentSlowQueries: [...this.recentSlowQueries]
    };
  }

  /**
   * Reset stats (useful for benchmarks and isolated test suites).
   */
  reset() {
    this.totalQueries = 0;
    this.slowQueries = 0;
    this.totalDurationMs = 0;
    this.modelStats = {};
    this.recentSlowQueries = [];
    this.recentDurations = [];
  }
}

export const queryProfiler = new QueryProfiler();

/**
 * Mongoose Plugin to seamlessly record query times across models.
 * @param {import('mongoose').Schema} schema
 */
export function queryProfilerPlugin(schema) {
  const ops = [
    'find',
    'findOne',
    'findOneAndUpdate',
    'findOneAndDelete',
    'countDocuments',
    'updateMany',
    'deleteMany'
  ];

  schema.pre(ops, function () {
    this._profileStartTime = Date.now();
  });

  schema.post(ops, function () {
    if (this._profileStartTime) {
      const durationMs = Date.now() - this._profileStartTime;
      const modelName = this.model?.modelName || 'UnknownModel';
      queryProfiler.recordQuery({
        model: modelName,
        op: this.op,
        durationMs
      });
    }
  });

  // Also profile save operations
  schema.pre('save', function () {
    this._profileStartTime = Date.now();
  });

  schema.post('save', function () {
    if (this._profileStartTime) {
      const durationMs = Date.now() - this._profileStartTime;
      const modelName = this.constructor?.modelName || 'UnknownModel';
      queryProfiler.recordQuery({
        model: modelName,
        op: 'save',
        durationMs
      });
    }
  });
}

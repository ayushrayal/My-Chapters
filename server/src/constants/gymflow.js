/**
 * GymFlow Constants
 * Status enums and points system configuration for the Gym Tracker feature.
 */

export const GYM_SET_STATUS = Object.freeze({
  COMPLETED: 'COMPLETED',
  INCOMPLETE: 'INCOMPLETE',
  SKIPPED: 'SKIPPED'
});

export const GYM_SET_STATUS_VALUES = Object.values(GYM_SET_STATUS);

export const GYM_TREADMILL_STATUS = Object.freeze({
  COMPLETED: 'COMPLETED',
  PARTIAL: 'PARTIAL',
  SKIPPED: 'SKIPPED'
});

export const GYM_TREADMILL_STATUS_VALUES = Object.values(GYM_TREADMILL_STATUS);

export const WEEKDAY_VALUES = Object.freeze([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
]);

export const GYM_DEFAULT_TREADMILL_MINUTES = 10;
export const GYM_MINIMUM_TREADMILL_MINUTES = 10;
export const GYM_DEFAULT_SETS_PER_EXERCISE = 3;

export const GYM_MEASUREMENT_TYPE = Object.freeze({
  WEIGHT_REPS: 'WEIGHT_REPS',
  BODYWEIGHT_REPS: 'BODYWEIGHT_REPS',
  DURATION: 'DURATION'
});

export const GYM_MEASUREMENT_TYPE_VALUES = Object.values(GYM_MEASUREMENT_TYPE);

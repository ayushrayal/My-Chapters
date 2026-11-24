import { z } from 'zod';
import { DAYFLOW_TASK_STATUS } from '../constants/dayflow.js';

export const objectIdRegex = /^[0-9a-fA-F]{24}$/;
export const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
export const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Converts HH:MM string to total minutes from 00:00.
 */
export function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Validates that blocks do not overlap in time.
 * Adjacent blocks (e.g., 09:00-10:00 and 10:00-11:00) are permitted.
 */
export function validateBlockTimeRanges(blocks) {
  if (!Array.isArray(blocks) || blocks.length <= 1) {
    return true;
  }

  // Sort copy by start time in minutes
  const sorted = [...blocks].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const startM = timeToMinutes(current.startTime);
    const endM = timeToMinutes(current.endTime);

    if (startM >= endM) {
      return false; // Start time must be strictly before end time
    }

    if (i > 0) {
      const prev = sorted[i - 1];
      const prevEndM = timeToMinutes(prev.endTime);
      if (startM < prevEndM) {
        return false; // Overlap detected
      }
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Block Schemas
// ---------------------------------------------------------------------------
export const blockInputSchema = z
  .object({
    id: z.string().optional(),
    _id: z.string().optional(),
    name: z
      .string({ required_error: 'Block name is required' })
      .trim()
      .min(1, 'Block name cannot be empty')
      .max(100, 'Block name cannot exceed 100 characters'),
    startTime: z
      .string({ required_error: 'Start time is required' })
      .trim()
      .regex(timeRegex, 'Start time must be in HH:MM 24-hour format (e.g. 09:00)'),
    endTime: z
      .string({ required_error: 'End time is required' })
      .trim()
      .regex(timeRegex, 'End time must be in HH:MM 24-hour format (e.g. 17:00)'),
    description: z
      .string()
      .trim()
      .max(500, 'Description cannot exceed 500 characters')
      .optional()
      .default(''),
    notes: z
      .string()
      .trim()
      .max(1000, 'Notes cannot exceed 1000 characters')
      .optional()
      .default(''),
    order: z.number().int().optional().default(0),
    tasksRequired: z.boolean().optional().default(false)
  })
  .refine((data) => timeToMinutes(data.startTime) < timeToMinutes(data.endTime), {
    message: 'Start time must be before end time',
    path: ['endTime']
  });

// ---------------------------------------------------------------------------
// Task Schemas
// ---------------------------------------------------------------------------
export const taskInputSchema = z.object({
  id: z.string().optional(),
  _id: z.string().optional(),
  blockId: z
    .string({ required_error: 'Block ID is required for each task' })
    .trim()
    .min(1, 'Block ID cannot be empty'),
  title: z
    .string({ required_error: 'Task title is required' })
    .trim()
    .min(1, 'Task title cannot be empty')
    .max(200, 'Task title cannot exceed 200 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Task description cannot exceed 500 characters')
    .optional()
    .default(''),
  notes: z
    .string()
    .trim()
    .max(1000, 'Task notes cannot exceed 1000 characters')
    .optional()
    .default(''),
  status: z
    .enum(
      [
        DAYFLOW_TASK_STATUS.UPCOMING,
        DAYFLOW_TASK_STATUS.CURRENT,
        DAYFLOW_TASK_STATUS.PENDING,
        DAYFLOW_TASK_STATUS.COMPLETED,
        DAYFLOW_TASK_STATUS.SKIPPED
      ],
      {
        errorMap: () => ({ message: 'Invalid task status' })
      }
    )
    .optional()
    .default(DAYFLOW_TASK_STATUS.UPCOMING),
  skippedReason: z
    .string()
    .trim()
    .max(500, 'Skipped reason cannot exceed 500 characters')
    .nullable()
    .optional()
});

// ---------------------------------------------------------------------------
// Template Validators
// ---------------------------------------------------------------------------
export const createTemplateSchema = z
  .object({
    name: z
      .string({ required_error: 'Template name is required' })
      .trim()
      .min(1, 'Template name cannot be empty')
      .max(100, 'Template name cannot exceed 100 characters'),
    description: z
      .string()
      .trim()
      .max(500, 'Template description cannot exceed 500 characters')
      .optional()
      .default(''),
    blocks: z.array(blockInputSchema).optional().default([])
  })
  .refine((data) => validateBlockTimeRanges(data.blocks), {
    message: 'Time blocks cannot overlap and start time must be before end time',
    path: ['blocks']
  });

export const updateTemplateSchema = z
  .object({
    name: z
      .string({ required_error: 'Template name is required' })
      .trim()
      .min(1, 'Template name cannot be empty')
      .max(100, 'Template name cannot exceed 100 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, 'Template description cannot exceed 500 characters')
      .optional(),
    blocks: z.array(blockInputSchema).optional()
  })
  .refine(
    (data) => {
      if (data.blocks) {
        return validateBlockTimeRanges(data.blocks);
      }
      return true;
    },
    {
      message: 'Time blocks cannot overlap and start time must be before end time',
      path: ['blocks']
    }
  );

export const templateIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid template ID format')
});

// ---------------------------------------------------------------------------
// Daily Schedule Validators
// ---------------------------------------------------------------------------
export const saveScheduleSchema = z
  .object({
    date: z
      .string({ required_error: 'Date is required' })
      .trim()
      .regex(dateRegex, 'Date must be formatted as YYYY-MM-DD'),
    blocks: z.array(blockInputSchema).optional().default([]),
    tasks: z.array(taskInputSchema).optional().default([])
  })
  .refine((data) => validateBlockTimeRanges(data.blocks), {
    message: 'Time blocks cannot overlap and start time must be before end time',
    path: ['blocks']
  });

export const applyTemplateSchema = z.object({
  templateId: z
    .string({ required_error: 'Template ID is required' })
    .regex(objectIdRegex, 'Invalid template ID format'),
  targetDate: z
    .string({ required_error: 'Target date is required' })
    .trim()
    .regex(dateRegex, 'Date must be formatted as YYYY-MM-DD'),
  targetDates: z.array(z.string().regex(dateRegex, 'Invalid date in targetDates')).optional(),
  overwrite: z.boolean().optional().default(false),
  tasks: z.array(taskInputSchema).optional().default([])
});

export const moveScheduleSchema = z.object({
  sourceDate: z
    .string({ required_error: 'Source date is required' })
    .trim()
    .regex(dateRegex, 'Source date must be formatted as YYYY-MM-DD'),
  targetDate: z
    .string({ required_error: 'Target date is required' })
    .trim()
    .regex(dateRegex, 'Target date must be formatted as YYYY-MM-DD'),
  overwrite: z.boolean().optional().default(false)
});

export const restDaySchema = z.object({
  date: z
    .string({ required_error: 'Date is required' })
    .trim()
    .regex(dateRegex, 'Date must be formatted as YYYY-MM-DD'),
  isRestDay: z.boolean().optional().default(true),
  overwrite: z.boolean().optional().default(false)
});

export const finishDaySchema = z.object({
  date: z
    .string({ required_error: 'Date is required' })
    .trim()
    .regex(dateRegex, 'Date must be formatted as YYYY-MM-DD')
});

export const updateTaskStatusSchema = z
  .object({
    date: z
      .string({ required_error: 'Date is required' })
      .trim()
      .regex(dateRegex, 'Date must be formatted as YYYY-MM-DD'),
    status: z.enum([
      DAYFLOW_TASK_STATUS.UPCOMING,
      DAYFLOW_TASK_STATUS.CURRENT,
      DAYFLOW_TASK_STATUS.PENDING,
      DAYFLOW_TASK_STATUS.COMPLETED,
      DAYFLOW_TASK_STATUS.SKIPPED
    ]),
    skippedReason: z
      .string()
      .trim()
      .max(500, 'Skipped reason cannot exceed 500 characters')
      .optional()
      .nullable()
  })
  .refine(
    (data) => {
      if (data.status === DAYFLOW_TASK_STATUS.SKIPPED) {
        return Boolean(data.skippedReason && data.skippedReason.trim().length > 0);
      }
      return true;
    },
    {
      message: 'A mandatory reason or note is required when skipping a task',
      path: ['skippedReason']
    }
  );

export const taskParamSchema = z.object({
  taskId: z.string().regex(objectIdRegex, 'Invalid task ID format')
});

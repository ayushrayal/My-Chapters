import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// Helper to validate date-only string and ensure it is a real calendar date
function isValidCalendarDate(dateStr) {
  if (!dateRegex.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (month < 1 || month > 12) return false;
  const dateObj = new Date(year, month - 1, day);
  return (
    dateObj.getFullYear() === year &&
    dateObj.getMonth() === month - 1 &&
    dateObj.getDate() === day
  );
}

// Helper to get local date string YYYY-MM-DD for today
function getTodayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const createGoodBitSchema = z.object({
  date: z
    .string({ required_error: 'Date is required' })
    .regex(dateRegex, 'Date must be formatted as YYYY-MM-DD')
    .refine(isValidCalendarDate, { message: 'Date must be a valid calendar date' })
    .refine(
      (val) => {
        const today = getTodayDateString();
        return val <= today;
      },
      { message: 'Future-dated entries are not allowed' }
    ),
  title: z
    .string()
    .trim()
    .max(200, 'Title cannot exceed 200 characters')
    .optional()
    .default(''),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(1, 'Description cannot be empty')
    .max(5000, 'Description cannot exceed 5000 characters')
});

export const updateGoodBitSchema = z.object({
  title: z
    .string()
    .trim()
    .max(200, 'Title cannot exceed 200 characters')
    .optional(),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(1, 'Description cannot be empty')
    .max(5000, 'Description cannot exceed 5000 characters')
});

export const goodBitIdParamSchema = z.object({
  id: z
    .string({ required_error: 'ID is required' })
    .regex(objectIdRegex, 'Invalid ID format')
});

export const dateParamSchema = z.object({
  date: z
    .string({ required_error: 'Date is required' })
    .regex(dateRegex, 'Date must be formatted as YYYY-MM-DD')
    .refine(isValidCalendarDate, { message: 'Date must be a valid calendar date' })
});

export const monthQuerySchema = z.object({
  monthKey: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'monthKey must be formatted as YYYY-MM')
    .optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  date: z.string().regex(dateRegex, 'Date must be formatted as YYYY-MM-DD').optional()
});

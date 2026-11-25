import { z } from 'zod';
import { SOMEDAY_STATUS } from '../constants/someday.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const linkSchema = z.object({
  label: z
    .string()
    .trim()
    .max(100, 'Link label cannot exceed 100 characters')
    .optional()
    .default(''),
  url: z
    .string({ required_error: 'Link URL is required' })
    .trim()
    .url('Link must be a valid URL')
    .refine((url) => /^https?:\/\/.+/i.test(url), {
      message: 'Link URL must start with http:// or https://'
    })
});

// Category Validators
export const createCategorySchema = z.object({
  name: z
    .string({ required_error: 'Category name is required' })
    .trim()
    .min(1, 'Category name cannot be empty')
    .max(60, 'Category name cannot exceed 60 characters')
});

export const updateCategorySchema = z.object({
  name: z
    .string({ required_error: 'Category name is required' })
    .trim()
    .min(1, 'Category name cannot be empty')
    .max(60, 'Category name cannot exceed 60 characters')
});

export const categoryIdParamSchema = z.object({
  categoryId: z
    .string({ required_error: 'Category ID is required' })
    .regex(objectIdRegex, 'Invalid category ID format')
});

// Item Validators
export const createItemSchema = z.object({
  name: z
    .string({ required_error: 'Item name is required' })
    .trim()
    .min(1, 'Item name cannot be empty')
    .max(120, 'Item name cannot exceed 120 characters'),
  categoryId: z
    .string({ required_error: 'Category ID is required' })
    .regex(objectIdRegex, 'Invalid category ID format'),
  links: z
    .array(linkSchema)
    .max(3, 'An item cannot have more than 3 links')
    .optional()
    .default([]),
  note: z
    .string()
    .trim()
    .max(2000, 'Note cannot exceed 2000 characters')
    .optional()
    .default(''),
  status: z
    .enum([SOMEDAY_STATUS.PLANNED, SOMEDAY_STATUS.PURCHASED], {
      errorMap: () => ({ message: 'Status must be either PLANNED or PURCHASED' })
    })
    .optional()
    .default(SOMEDAY_STATUS.PLANNED),
  purchaseDate: z
    .union([
      z.string().datetime({ offset: true }),
      z.string().regex(/^\d{4}-\d{2}-\d{2}(?:T.*)?$/, 'Invalid date format'),
      z.date(),
      z.null()
    ])
    .optional()
    .nullable()
});

export const updateItemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Item name cannot be empty')
    .max(120, 'Item name cannot exceed 120 characters')
    .optional(),
  categoryId: z
    .string()
    .regex(objectIdRegex, 'Invalid category ID format')
    .optional(),
  links: z
    .array(linkSchema)
    .max(3, 'An item cannot have more than 3 links')
    .optional(),
  note: z
    .string()
    .trim()
    .max(2000, 'Note cannot exceed 2000 characters')
    .optional()
    .nullable(),
  status: z
    .enum([SOMEDAY_STATUS.PLANNED, SOMEDAY_STATUS.PURCHASED], {
      errorMap: () => ({ message: 'Status must be either PLANNED or PURCHASED' })
    })
    .optional(),
  purchaseDate: z
    .union([
      z.string().datetime({ offset: true }),
      z.string().regex(/^\d{4}-\d{2}-\d{2}(?:T.*)?$/, 'Invalid date format'),
      z.date(),
      z.null()
    ])
    .optional()
    .nullable()
});

export const itemIdParamSchema = z.object({
  itemId: z
    .string({ required_error: 'Item ID is required' })
    .regex(objectIdRegex, 'Invalid item ID format')
});

export const getItemsQuerySchema = z.object({
  categoryId: z
    .string()
    .regex(objectIdRegex, 'Invalid category ID format')
    .optional(),
  status: z
    .enum([SOMEDAY_STATUS.PLANNED, SOMEDAY_STATUS.PURCHASED], {
      errorMap: () => ({ message: 'Status filter must be either PLANNED or PURCHASED' })
    })
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional()
});


import { z } from 'zod';

export const createProfileSchema = z.object({
    displayName: z.string().min(1, 'Display name is required'),
    legalName: z.string().optional(),
    dob: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
        message: 'Invalid date format',
    }),
    relationship: z.enum(['self', 'mother', 'father', 'child', 'spouse', 'other']).optional(),
});

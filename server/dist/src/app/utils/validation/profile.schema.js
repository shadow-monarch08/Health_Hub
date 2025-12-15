"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProfileSchema = void 0;
const zod_1 = require("zod");
exports.createProfileSchema = zod_1.z.object({
    displayName: zod_1.z.string().min(1, 'Display name is required'),
    legalName: zod_1.z.string().optional(),
    dob: zod_1.z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
        message: 'Invalid date format',
    }),
    relationship: zod_1.z.enum(['self', 'mother', 'father', 'child', 'spouse', 'other']).optional(),
});

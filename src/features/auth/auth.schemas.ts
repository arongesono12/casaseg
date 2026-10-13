import { z } from 'zod';

import { authMessage } from '@/features/auth/auth-messages';
import { isValidProfilePhone, normalizeProfilePhone } from '@/features/auth/profile-phone';

// Los mensajes son funciones: zod las evalúa al validar, así salen en el idioma activo.

const emailSchema = z.string().trim().toLowerCase().pipe(z.email({ error: () => authMessage('invalidEmail') }));

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(8, { error: () => authMessage('passwordMin') }) });
export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2, { error: () => authMessage('nameRequired') }),
  phone: z.string().trim().min(1, { error: () => authMessage('phoneRequired') })
    .refine(isValidProfilePhone, { error: () => authMessage('invalidPhone') })
    .transform((value) => normalizeProfilePhone(value) ?? ''),
  role: z.enum(['client', 'owner']),
  acceptedTerms: z.boolean().refine((accepted) => accepted, { error: () => authMessage('termsRequired') }),
});
export const otpSchema = z.object({
  email: emailSchema,
  token: z.string().trim().regex(/^\d{6}$/, { error: () => authMessage('otpFormat') }),
});
export const resetSchema = z.object({ password: z.string().min(8), confirmPassword: z.string().min(8) }).refine((value) => value.password === value.confirmPassword, { path: ['confirmPassword'], error: () => authMessage('passwordsDontMatch') });

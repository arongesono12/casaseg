import { z } from 'zod';

import { authMessage } from '@/features/auth/auth-messages';

// Los mensajes son funciones: zod las evalúa al validar, así salen en el idioma activo.

const emailSchema = z.string().trim().toLowerCase().pipe(z.email({ error: () => authMessage('invalidEmail') }));

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(8, { error: () => authMessage('passwordMin') }) });
export const registerSchema = loginSchema.extend({ name: z.string().trim().min(2, { error: () => authMessage('nameRequired') }), role: z.enum(['client', 'owner']) });
export const otpSchema = z.object({
  email: emailSchema,
  token: z.string().trim().regex(/^\d{6}$/, { error: () => authMessage('otpFormat') }),
});
export const resetSchema = z.object({ password: z.string().min(8), confirmPassword: z.string().min(8) }).refine((value) => value.password === value.confirmPassword, { path: ['confirmPassword'], error: () => authMessage('passwordsDontMatch') });

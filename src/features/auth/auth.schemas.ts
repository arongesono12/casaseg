import { z } from 'zod';

const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Correo no válido'));

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(8, 'Mínimo 8 caracteres') });
export const registerSchema = loginSchema.extend({ name: z.string().trim().min(2, 'Introduce tu nombre'), role: z.enum(['client', 'owner']) });
export const otpSchema = z.object({
  email: emailSchema,
  token: z.string().trim().regex(/^\d{6}$/, 'Introduce el código de 6 dígitos'),
});
export const resetSchema = z.object({ password: z.string().min(8), confirmPassword: z.string().min(8) }).refine((value) => value.password === value.confirmPassword, { path: ['confirmPassword'], message: 'Las contraseñas no coinciden' });

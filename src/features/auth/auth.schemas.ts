import { z } from 'zod';

export const loginSchema = z.object({ email: z.email('Correo no válido'), password: z.string().min(8, 'Mínimo 8 caracteres') });
export const registerSchema = loginSchema.extend({ name: z.string().trim().min(2, 'Introduce tu nombre'), role: z.enum(['client', 'owner']) });
export const otpSchema = z.object({ email: z.email(), token: z.string().trim().min(6, 'Introduce el código completo') });
export const resetSchema = z.object({ password: z.string().min(8), confirmPassword: z.string().min(8) }).refine((value) => value.password === value.confirmPassword, { path: ['confirmPassword'], message: 'Las contraseñas no coinciden' });

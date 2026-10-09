import { FunctionsHttpError } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export async function submitContactForm(input: { name: string; email: string; message: string }) {
  if (!isSupabaseConfigured) throw new Error('El formulario de contacto requiere conexión con el servidor.');
  const name = input.name.trim();
  const email = input.email.trim();
  const message = input.message.trim();
  if (name.length < 2 || name.length > 120) throw new Error('Introduce un nombre de 2 a 120 caracteres.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Introduce un correo válido.');
  if (message.length < 10 || message.length > 5000) throw new Error('El mensaje debe tener entre 10 y 5000 caracteres.');
  const { error } = await supabase.functions.invoke('contact-form', { body: { name, email, message } });
  if (!error) return;
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (typeof body?.error === 'string') throw new Error(body.error);
    } catch (cause) { if (cause instanceof Error && cause !== error) throw cause; }
  }
  throw error;
}

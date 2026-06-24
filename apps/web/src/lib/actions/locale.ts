'use server';

import { cookies } from 'next/headers';

const VALID_LOCALES = new Set(['en', 'cs']);

export async function setLocale(locale: string): Promise<void> {
  if (!VALID_LOCALES.has(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set('locale', locale, { path: '/', maxAge: 60 * 60 * 24 * 365 });
}

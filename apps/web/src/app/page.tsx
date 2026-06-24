import { getLocale, getTranslations } from 'next-intl/server';
import LocaleSwitcher from '@/components/LocaleSwitcher';

export default async function Home(): Promise<React.JSX.Element> {
  const t = await getTranslations('home');
  const locale = await getLocale();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold text-foreground">{t('title')}</h1>
      <LocaleSwitcher current={locale} />
    </main>
  );
}

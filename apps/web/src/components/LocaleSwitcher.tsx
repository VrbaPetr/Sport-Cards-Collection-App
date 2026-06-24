'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { setLocale } from '@/lib/actions/locale';

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'cs', label: 'Čeština' },
];

export default function LocaleSwitcher({ current }: { current: string }): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSwitch(locale: string): void {
    startTransition(async () => {
      await setLocale(locale);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2 mt-4">
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          disabled={current === code || isPending}
          onClick={() => handleSwitch(code)}
          className={`px-3 py-1 rounded-md border text-sm ${
            current === code
              ? 'bg-primary text-primary-foreground border-primary font-semibold'
              : 'border-border hover:bg-muted'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

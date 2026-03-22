"use client";

import {useLocale} from 'next-intl';
import {usePathname, useRouter} from 'next/navigation';
import {ChangeEvent, useTransition} from 'react';
import {locales} from '@/i18n';

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  function onSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value;
    
    // Construct the new path by replacing the locale segment
    const segments = pathname.split('/');
    // First segment after leading slash is the locale
    if (segments[1] && locales.includes(segments[1] as typeof locales[number])) {
      segments[1] = nextLocale;
    } else {
      // If no locale, add it
      // If, add it
      segments.splice(1, 0, nextLocale);
    }
    
    const newPath = segments.join('/');
    
    startTransition(() => {
      router.push(newPath);
    });
  }

  return (
    <label className="relative inline-flex items-center gap-2">
      <span className="sr-only">Switch language</span>
      <select
        defaultValue={locale}
        disabled={isPending}
        onChange={onSelectChange}
        className="appearance-none bg-terminal-black border border-terminal-green/30 text-terminal-green px-3 py-1 pr-8 rounded text-sm focus:outline-none focus:border-terminal-green cursor-pointer hover:bg-terminal-green/10 transition-colors"
      >
        <option value="en">English</option>
        <option value="es">Español</option>
      </select>
      <svg
        className="absolute right-2 w-4 h-4 text-terminal-green pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </label>
  );
}

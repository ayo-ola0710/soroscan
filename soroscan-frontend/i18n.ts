import {notFound} from 'next/navigation';
import {getRequestConfig} from 'next-intl/server';

export const locales = ['en', 'es'] as const;
export const defaultLocale = 'en';

// Re-export routing for use in other modules
export const routing = {
  locales,
  defaultLocale,
};

export default getRequestConfig(async ({requestLocale}) => {
  // This will be the locale from the URL or the default
  let locale = await requestLocale;

  // Validate that the locale is supported
  if (!locale || !locales.includes(locale as typeof locales[number])) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});

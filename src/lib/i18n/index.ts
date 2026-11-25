import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en';
import es from './es';

export type AppLanguage = 'en' | 'es';

const i18n = createInstance();

// The onboarding store switches to the user's saved choice once it rehydrates.
i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: getLocales()[0].languageCode === 'es' ? 'es' : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;

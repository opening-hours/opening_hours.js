import i18next from 'i18next';
export default i18next;

import opening_hours_resources from './opening_hours_resources.yaml';

if (!i18next.isInitialized) {
    i18next.init({
        fallbackLng: 'en',
        // lngWhitelist: ['en', 'de'],
        resources: opening_hours_resources,
        getAsync: true,
        useCookie: true,
        // debug: true,
    });
} else {
    // compat with an app that already initializes i18n
    for (const lang in opening_hours_resources) {
        i18next.addResourceBundle(lang, 'opening_hours', opening_hours_resources[lang]['opening_hours'], true);
    }
}

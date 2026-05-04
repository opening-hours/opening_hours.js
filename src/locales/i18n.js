/**
 * SPDX-FileCopyrightText: © 2025 Kristjan ESPERANTO <https://github.com/KristjanESPERANTO>
 *
 * SPDX-License-Identifier: LGPL-3.0-only
 */
import opening_hours_resources from './opening_hours_resources.yaml';

const resources = opening_hours_resources;

// Simple i18n object compatible with the minimal features used in src/index.js
const i18n = {
    language: 'en',
    isInitialized: true,

    t: function(key, variables) {
        return this._translate(this.language, key, variables);
    },

    getFixedT: function(locale) {
        const self = this;
        return function(key, variables) {
            return self._translate(locale, key, variables);
        };
    },

    _translate: function(locale, key, variables) {
        // Handle array of keys (fallback mechanism)
        const keys = Array.isArray(key) ? key : [key];

        for (const k of keys) {
            // Parse namespace:path notation (e.g., "opening_hours:pretty.off")
            const parts = k.split(':');
            const namespace = parts.length > 1 ? parts[0] : 'opening_hours';
            const path = parts.length > 1 ? parts[1] : parts[0];

            // Try to get translation
            const translation = this._getNestedValue(resources, [locale, namespace, ...path.split('.')]);

            if (translation !== undefined) {
                // Replace variables like {{variable}} or {{-variable}}
                // The minus prefix means "don't escape HTML" (compatibility feature)
                if (typeof translation === 'string' && variables) {
                    return translation.replace(/{{-?([^{}]*)}}/g, function (match, varName) {
                        const trimmed = varName.trim();
                        return typeof variables[trimmed] !== 'undefined' ? variables[trimmed] : match;
                    });
                }
                return translation;
            }
        }

        // Fallback: return the last key if no translation found
        const lastKey = keys[keys.length - 1];
        return lastKey.includes(':') ? lastKey.split(':')[1] : lastKey;
    },

    _getNestedValue: function(obj, path) {
        let current = obj;
        for (const key of path) {
            if (current === undefined || current === null) return undefined;
            current = current[key];
        }
        return current;
    }
};

export default i18n;

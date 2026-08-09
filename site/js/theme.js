/*
 * SPDX-FileCopyrightText: © 2025 Kristjan ESPERANTO <https://github.com/KristjanESPERANTO>
 *
 * SPDX-License-Identifier: LGPL-3.0-only
 */

// Theme management: explicit preference or browser preference in auto mode
(function() {
    'use strict';

    const STORAGE_KEY = 'theme-preference';
    const THEMES = ['auto', 'light', 'dark'];
    const THEME_ICONS = { auto: '🌗', light: '☀️', dark: '🌙' };

    function getThemePreference() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') {
            return stored;
        }
        if (stored !== null) {
            localStorage.removeItem(STORAGE_KEY);
        }
        return 'auto';
    }

    const themeToggle = document.getElementById('theme-toggle');

    function applyTheme(theme) {
        if (theme === 'auto') {
            document.body.removeAttribute('data-theme');
        } else {
            document.body.setAttribute('data-theme', theme);
        }

        const currentIcon = document.getElementById('theme-current-icon');
        if (currentIcon) {
            currentIcon.textContent = THEME_ICONS[theme];
        }

        if (themeToggle) {
            themeToggle.dataset.theme = theme;
            themeToggle.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
        }
    }

    function setTheme(theme) {
        const selectedTheme = THEMES.includes(theme) ? theme : 'auto';
        applyTheme(selectedTheme);

        if (selectedTheme === 'auto') {
            localStorage.removeItem(STORAGE_KEY);
        } else {
            localStorage.setItem(STORAGE_KEY, selectedTheme);
        }
    }

    applyTheme(getThemePreference());

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = getThemePreference();
            const nextTheme = THEMES[(THEMES.indexOf(currentTheme) + 1) % THEMES.length];
            setTheme(nextTheme);
        });
    }

    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeQuery.addEventListener('change', () => {
        if (getThemePreference() === 'auto') {
            applyTheme('auto');
        }
    });
})();

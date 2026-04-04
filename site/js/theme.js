/*
 * SPDX-FileCopyrightText: © 2025 Kristjan ESPERANTO <https://github.com/KristjanESPERANTO>
 *
 * SPDX-License-Identifier: LGPL-3.0-only
 */

// Theme management: localStorage -> browser preference -> fallback (light)
(function() {
    'use strict';

    const STORAGE_KEY = 'theme-preference';

    function getThemePreference() {
        // 1. Check localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return stored;
        }

        // 2. Check browser preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }

        // 3. Fallback to light
        return 'light';
    }

    function setTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem(STORAGE_KEY, theme);
    }

    function toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme') || getThemePreference();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    }

    // Initialize theme immediately to avoid FOUC
    const theme = getThemePreference();
    setTheme(theme);

    // Set up toggle button (script loads with defer, so DOM is ready)
    initToggleButton();

    function initToggleButton() {
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleTheme);
        }

        // Listen for system theme changes (only if no localStorage preference)
        if (!localStorage.getItem(STORAGE_KEY)) {
            const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            darkModeQuery.addEventListener('change', (e) => {
                if (!localStorage.getItem(STORAGE_KEY)) {
                    setTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }
})();

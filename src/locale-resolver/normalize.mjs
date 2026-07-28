/*
 * SPDX-FileCopyrightText: © 2026 opening_hours.js contributors
 *
 * SPDX-License-Identifier: LGPL-3.0-only
 */

/**
 * Shared token normalization for the locale resolver.
 *
 * Lower-cases, trims and strips trailing abbreviation dots (e.g. German "Mo.")
 * so that generated layer keys and runtime lookups use the same shape.
 * @param {string} value - Token value to normalize.
 * @returns {string} Normalized token value.
 */
export function normalizeToken(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/\.+$/, '');
}

/*
 * SPDX-FileCopyrightText: © 2025 Kristjan ESPERANTO <https://github.com/KristjanESPERANTO>
 *
 * SPDX-License-Identifier: LGPL-3.0-only
 */

/**
 * Translation Checker Script
 *
 * This script checks:
 * 1. If all translation keys in i18n-resources.js are complete across all languages
 * 2. If all translation keys used in the code are defined
 *
 * Usage: node scripts/check_translations.mjs
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteDir = join(__dirname, '..', 'site');
const jsDir = join(siteDir, 'js');
const REFERENCE_LANGUAGE = 'en';
const MAX_DISPLAYED_ITEMS = 5;
const OUTPUT_INDENT = '  ';
const CHECK_START = '--- TRANSLATION CHECK START ---';
const CHECK_END = '--- TRANSLATION CHECK END ---';
const SUCCESS = '✓';
const WARNING = '⚠';
const ERROR = '✗';

/**
 * Set of fully qualified translation keys.
 * @typedef {Set<string>} TranslationKeys
 */

/**
 * Translation keys grouped by language code.
 * @typedef {Record<string, TranslationKeys>} KeysByLanguage
 */

/**
 * Read the translation resource and list its language blocks.
 * @returns {{content: string, languages: string[]}} Resource content and languages.
 */
function parseI18nResources() {
  const content = readFileSync(join(jsDir, 'i18n-resources.js'), 'utf-8');

  // Find language blocks without evaluating the resource file.
  const languagePattern = /^\s{4}(\w+):\s*\{\s*\n\s*translation:\s*\{/gm;
  const languages = Array.from(
    content.matchAll(languagePattern),
    (match) => match[1]
  );

  return { content, languages };
}

/**
 * Extract all translation keys from one language section.
 * @param {string} content - Translation resource source.
 * @param {string} language - Language code to inspect.
 * @returns {TranslationKeys} Extracted translation keys.
 */
function extractKeysFromLanguage(content, language) {
  const keys = new Set();
  const langStartRegex = new RegExp(
    String.raw`^\s{4}${language}:\s*\{\s*\n\s*translation:\s*\{`,
    'm'
  );
  const startMatch = content.match(langStartRegex);
  if (!startMatch) return keys;

  const matchIndex = startMatch.index;
  if (matchIndex === undefined) return keys;
  const startIndex = matchIndex + startMatch[0].length;

  // Track nested objects so keys such as "texts.filter.open" keep their path.
  let depth = 1;
  let currentKey = '';
  let inString = false;
  let stringChar = '';
  const keyPath = [];
  let i = startIndex;

  while (depth > 0 && i < content.length) {
    const char = content[i];

    if (inString) {
      if (char === stringChar && content[i - 1] !== '\\') {
        inString = false;
      }
    } else {
      if (char === '"' || char === '\'') {
        inString = true;
        stringChar = char;
      } else if (char === '{') {
        if (currentKey) {
          keyPath.push(currentKey);
          currentKey = '';
        }
        depth++;
      } else if (char === '}') {
        depth--;
        if (keyPath.length > 0 && depth > 0) {
          keyPath.pop();
        }
      } else if (char === ':') {
        // A key followed by an object starts a nested path; otherwise it is a leaf key.
        const beforeColon = content.substring(i - 50, i).trim();
        const keyMatch = beforeColon.match(/['"]([^'"]+)['"]$/);
        if (keyMatch) {
          currentKey = keyMatch[1];
          let j = i + 1;
          while (j < content.length && /\s/.test(content[j])) j++;
          if (content[j] !== '{') {
            const fullKey = [...keyPath, currentKey].join('.');
            keys.add(fullKey);
            currentKey = '';
          }
        }
      }
    }
    i++;
  }

  return keys;
}

/**
 * Extract literal keys and dynamic key prefixes from all JavaScript files.
 * @returns {TranslationKeys} Translation keys used in source files.
 */
function extractUsedKeys() {
  const usedKeys = new Set();
  const dynamicPrefixes = new Set();
  const javascriptFiles = readdirSync(jsDir).filter((file) =>
    file.endsWith('.js')
  );

  for (const file of javascriptFiles) {
    const content = readFileSync(join(jsDir, file), 'utf-8');

    const scanContent = getScannableContent(file, content);
    if (scanContent === null) continue;

    // Match concatenation such as i18next.t('words.' + name).
    const concatMatches = scanContent.matchAll(/i18next\.t\(['"]([^'"]+)['"]\s*\+/g);
    for (const match of concatMatches) {
      const prefix = match[1];
      dynamicPrefixes.add(prefix);
      usedKeys.add(prefix + '*');
    }

    // Match ordinary string keys and ignore interpolated template literals here.
    const matches = scanContent.matchAll(/i18next\.t\(['"`]([^'"`]+)['"`]/g);
    for (const match of matches) {
      const key = match[1];
      if (dynamicPrefixes.has(key)) continue;
      if (!key.includes('${')) {
        usedKeys.add(key);
      }
    }

    // Match template literals such as i18next.t(`texts.mode ${mode}`).
    const templateMatches = scanContent.matchAll(/i18next\.t\(`([^`]+)`/g);
    for (const match of templateMatches) {
      const staticPart = match[1].split('${')[0];
      if (staticPart) {
        usedKeys.add(staticPart + '*');
      }
    }
  }

  return usedKeys;
}

/**
 * Select the part of a JavaScript file that contains translation usage.
 * @param {string} file - JavaScript file name.
 * @param {string} content - File contents.
 * @returns {string|null} Content that should be scanned, if available.
 */
function getScannableContent(file, content) {
  if (file !== 'i18n-resources.js') return content;

  // Do not treat the resource definitions themselves as translation usage.
  const functionsStart = content.indexOf(
    'function getUserSelectTranslateHTMLCode'
  );
  return functionsStart > 0 ? content.substring(functionsStart) : null;
}

/**
 * Find reference keys missing from a language.
 * @param {TranslationKeys} referenceKeys - Reference language keys.
 * @param {TranslationKeys} languageKeys - Keys for one language.
 * @returns {string[]} Keys missing from the language.
 */
function getMissingKeys(referenceKeys, languageKeys) {
  return [...referenceKeys].filter((key) => !languageKeys.has(key));
}

/**
 * Extract literal translation keys from the detected keys.
 * @param {TranslationKeys} usedKeys - Keys found in source files.
 * @returns {string[]} Literal translation keys.
 */
function getLiteralKeys(usedKeys) {
  return [...usedKeys].filter((key) => {
    if (key.endsWith('*') || key.endsWith('.')) return false;
    return !key.split('.').some((part) => part === '');
  });
}

/**
 * Extract dynamic translation patterns from the detected keys.
 * @param {TranslationKeys} usedKeys - Keys found in source files.
 * @returns {string[]} Dynamic translation patterns.
 */
function getDynamicPatterns(usedKeys) {
  return [...usedKeys].filter(
    (key) => key.endsWith('*') || key.endsWith('.')
  );
}

/**
 * Find reference keys that are not used literally or through a dynamic prefix.
 * A key matching a dynamic prefix is considered used even without a literal call.
 * @param {TranslationKeys} referenceKeys - Reference language keys.
 * @param {TranslationKeys} usedKeys - Keys found in source files.
 * @returns {string[]} Reference keys that appear unused.
 */
function getUnusedKeys(referenceKeys, usedKeys) {
  const literalKeys = getLiteralKeys(usedKeys);
  const dynamicPrefixes = getDynamicPatterns(usedKeys)
    .filter((pattern) => pattern.endsWith('*'))
    .map((pattern) => pattern.slice(0, -1));

  return [...referenceKeys].filter((key) => {
    if (literalKeys.includes(key)) return false;
    return !dynamicPrefixes.some((prefix) => key.startsWith(prefix));
  });
}

/**
 * Find a reference-language fallback for a dynamic key prefix.
 * @param {string} prefix - Dynamic key prefix.
 * @param {TranslationKeys} referenceKeys - Reference language keys.
 * @returns {string|undefined} Matching fallback key.
 */
function getFallbackKey(prefix, referenceKeys) {
  // Some languages use a plural or language-specific prefix with a generic fallback.
  const normalizedPrefix = prefix.replace(/\.$/, '').replace(/\s+$/, '');
  const possibleFallbacks = [
    normalizedPrefix,
    normalizedPrefix.replace(/days/, 'day'),
    normalizedPrefix.replace(/s /, ' '),
  ];

  return possibleFallbacks.find((key) => referenceKeys.has(key));
}

/**
 * Print a list of keys, truncating long lists for readability.
 * @param {string} label - List label.
 * @param {string[]} keys - Items to print.
 * @param {string} [marker] - Item marker.
 * @param {number} [limit] - Maximum number of items to print.
 */
function printList(label, keys, marker = '-', limit = MAX_DISPLAYED_ITEMS) {
  if (keys.length === 0) return;

  console.log(`${OUTPUT_INDENT}  ${label} ${keys.length}:`);
  keys.slice(0, limit).forEach((key) => {
    console.log(`${OUTPUT_INDENT}    ${marker} ${key}`);
  });
  if (keys.length > limit) {
    console.log(`${OUTPUT_INDENT}    ... and ${keys.length - limit} more`);
  }
}

/**
 * Find dynamic patterns without reference keys or a known fallback.
 * @param {string[]} patterns - Dynamic translation patterns.
 * @param {TranslationKeys} referenceKeys - Reference language keys.
 * @returns {string[]} Patterns that require attention.
 */
function getInvalidDynamicPatterns(patterns, referenceKeys) {
  return patterns.filter((pattern) => {
    const prefix = pattern.endsWith('*') ? pattern.slice(0, -1) : pattern;
    const hasMatchingKey = [...referenceKeys].some((key) =>
      key.startsWith(prefix)
    );
    return !hasMatchingKey && !getFallbackKey(prefix, referenceKeys);
  });
}

/** Run the translation checks and set the process exit code. */
function main() {
  console.log(CHECK_START);

  const { content, languages } = parseI18nResources();
  const keysByLanguage = Object.fromEntries(languages.map((language) => [
    language,
    extractKeysFromLanguage(content, language),
  ]));
  const referenceKeys = keysByLanguage[REFERENCE_LANGUAGE] || new Set();
  let coverageComplete = true;
  let coverageReported = false;

  for (const language of languages) {
    if (language === REFERENCE_LANGUAGE) continue;
    const languageKeys = keysByLanguage[language];
    const missingKeys = getMissingKeys(referenceKeys, languageKeys);
    if (missingKeys.length === 0) continue;

    coverageComplete = false;
    if (!coverageReported) {
      console.log(`${OUTPUT_INDENT}[TRANSLATION COVERAGE]`);
      coverageReported = true;
    }
    console.log(`${OUTPUT_INDENT}${WARNING} ${language}: ${languageKeys.size}/${referenceKeys.size} keys`);
    printList('Missing keys', missingKeys);
  }

  const usedKeys = extractUsedKeys();
  const undefinedKeys = getLiteralKeys(usedKeys).filter(
    (key) => !referenceKeys.has(key)
  );
  const invalidDynamicPatterns = getInvalidDynamicPatterns(
    getDynamicPatterns(usedKeys),
    referenceKeys
  );
  const unusedKeys = getUnusedKeys(referenceKeys, usedKeys);
  const usageHasIssues =
    undefinedKeys.length > 0 ||
    invalidDynamicPatterns.length > 0 ||
    unusedKeys.length > 0;

  if (usageHasIssues) {
    console.log(`${OUTPUT_INDENT}[TRANSLATION USAGE]`);
    if (undefinedKeys.length > 0) {
      console.log(`${OUTPUT_INDENT}${ERROR} Undefined keys used in code:`);
      printList('Undefined keys', undefinedKeys);
    }
    if (invalidDynamicPatterns.length > 0) {
      console.log(`${OUTPUT_INDENT}${ERROR} Invalid dynamic translation patterns:`);
      for (const pattern of invalidDynamicPatterns) {
        const prefix = pattern.endsWith('*') ? pattern.slice(0, -1) : pattern;
        console.log(`${OUTPUT_INDENT}${OUTPUT_INDENT}${ERROR} ${pattern}`);
        console.log(`${OUTPUT_INDENT}${OUTPUT_INDENT}${OUTPUT_INDENT}No keys found starting with "${prefix}"`);
      }
    }
    if (unusedKeys.length > 0) {
      console.log(`${OUTPUT_INDENT}${WARNING} ${unusedKeys.length} defined keys may be unused:`);
      printList('Possibly unused keys', unusedKeys, '-', 20);
    }
  }

  console.log(`${OUTPUT_INDENT}[SUMMARY]`);
  const success = coverageComplete && !usageHasIssues;
  console.log(
    `${OUTPUT_INDENT}${success ? SUCCESS : WARNING} ${
      success
        ? 'All translations complete; all used keys are defined.'
        : 'Translation problems found.'
    }`
  );
  console.log(CHECK_END);
  process.exitCode = success ? 0 : 1;
}

main();

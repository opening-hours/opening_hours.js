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

// Parse i18n-resources.js to extract translations
function parseI18nResources() {
  const content = readFileSync(join(jsDir, 'i18n-resources.js'), 'utf-8');

  // Extract the resources object using regex
  // This is a simplified parser - for complex cases, consider using an AST parser
  const languages = {};
  const langMatches = content.matchAll(
    /^\s{4}(\w+):\s*\{\s*\n\s*translation:\s*\{/gm
  );

  for (const match of langMatches) {
    languages[match[1]] = new Set();
  }

  return { content, languages: Object.keys(languages) };
}

// Extract all translation keys from a language section
/**
 * @param {string} content Translation resource file content.
 * @param {string} lang Language code to inspect.
 * @returns {Set<string>} Translation keys found for the language.
 */
function extractKeysFromLanguage(content, lang) {
  const keys = new Set();

  // Find the start of the language section
  const langStartRegex = new RegExp(
    `^\\s{4}${lang}:\\s*\\{\\s*\\n\\s*translation:\\s*\\{`,
    'm'
  );
  const startMatch = content.match(langStartRegex);
  if (!startMatch) return keys;

  const startIndex = startMatch.index + startMatch[0].length;

  // Extract keys by tracking nested objects
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
        // Check if this is a key definition
        const beforeColon = content.substring(i - 50, i).trim();
        const keyMatch = beforeColon.match(/['"]([^'"]+)['"]$/);
        if (keyMatch) {
          currentKey = keyMatch[1];
          // Check if the next non-whitespace char is { or a value
          let j = i + 1;
          while (j < content.length && /\s/.test(content[j])) j++;
          if (content[j] !== '{') {
            // This is a leaf key
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

// Extract all i18next.t() calls from JS files
function extractUsedKeys() {
  const usedKeys = new Set();
  const dynamicPrefixes = new Set();
  const jsFiles = readdirSync(jsDir).filter((f) => f.endsWith('.js'));

  for (const file of jsFiles) {
    const content = readFileSync(join(jsDir, file), 'utf-8');

    // For i18n-resources.js, only scan after the resources definition
    let scanContent = content;
    if (file === 'i18n-resources.js') {
      const functionsStart = content.indexOf(
        'function getUserSelectTranslateHTMLCode'
      );
      if (functionsStart > 0) {
        scanContent = content.substring(functionsStart);
      } else {
        continue; // Skip if we can't find the functions section
      }
    }

    // First pass: Match string concatenation like i18next.t('prefix ' + variable)
    const concatMatches = scanContent.matchAll(/i18next\.t\(['"]([^'"]+)['"]\s*\+/g);
    for (const match of concatMatches) {
      const prefix = match[1];
      // Mark as dynamic pattern for concatenation
      dynamicPrefixes.add(prefix);
      usedKeys.add(prefix + '*');
    }

    // Second pass: Match i18next.t('key') and i18next.t("key")
    const matches = scanContent.matchAll(/i18next\.t\(['"`]([^'"`]+)['"`]/g);
    for (const match of matches) {
      const key = match[1];
      // Skip if this is a dynamic prefix we already found
      if (dynamicPrefixes.has(key)) continue;
      // Handle template literals with interpolation
      if (!key.includes('${')) {
        usedKeys.add(key);
      }
    }

    // Match template literal keys like `texts.mode ${i}`
    const templateMatches = scanContent.matchAll(/i18next\.t\(`([^`]+)`/g);
    for (const match of templateMatches) {
      const template = match[1];
      // Extract the static prefix
      const staticPart = template.split('${')[0];
      if (staticPart && !staticPart.includes('`')) {
        // Mark as dynamic key pattern
        usedKeys.add(staticPart + '*');
      }
    }
  }

  return usedKeys;
}

// Main analysis
console.log('🔍 Translation Checker for opening_hours.js\n');
console.log('='.repeat(60) + '\n');

const { content, languages } = parseI18nResources();
console.log(`📚 Found ${languages.length} languages: ${languages.join(', ')}\n`);

// Extract keys for each language
const keysByLang = {};
for (const lang of languages) {
  keysByLang[lang] = extractKeysFromLanguage(content, lang);
}

// Use English as the reference
const referenceKeys = keysByLang['en'] || new Set();
console.log(`📝 Reference language (en) has ${referenceKeys.size} keys\n`);

// Check completeness of each language
console.log('='.repeat(60));
console.log('📊 TRANSLATION COMPLETENESS CHECK');
console.log('='.repeat(60) + '\n');

let allComplete = true;
for (const lang of languages) {
  if (lang === 'en') continue;

  const langKeys = keysByLang[lang];
  const missing = [...referenceKeys].filter((k) => !langKeys.has(k));
  const extra = [...langKeys].filter((k) => !referenceKeys.has(k));

  if (missing.length === 0 && extra.length === 0) {
    console.log(`✅ ${lang}: Complete (${langKeys.size} keys)`);
  } else {
    allComplete = false;
    console.log(`\n⚠️  ${lang}: ${langKeys.size} keys`);
    if (missing.length > 0) {
      console.log(`   Missing ${missing.length} keys:`);
      missing.slice(0, 10).forEach((k) => console.log(`     - ${k}`));
      if (missing.length > 10) {
        console.log(`     ... and ${missing.length - 10} more`);
      }
    }
    if (extra.length > 0) {
      console.log(`   Extra ${extra.length} keys (not in en):`);
      extra.slice(0, 5).forEach((k) => console.log(`     + ${k}`));
      if (extra.length > 5) {
        console.log(`     ... and ${extra.length - 5} more`);
      }
    }
  }
}

// Check used keys
console.log('\n' + '='.repeat(60));
console.log('🔎 USAGE CHECK (Keys used in code vs. defined)');
console.log('='.repeat(60) + '\n');

const usedKeys = extractUsedKeys();
console.log(`Found ${usedKeys.size} unique keys used in JS files\n`);

// Filter out dynamic patterns (ending with * or containing incomplete paths)
const staticKeys = [...usedKeys].filter((k) => {
  if (k.endsWith('*')) return false;
  if (k.endsWith('.')) return false; // incomplete dynamic key
  if (k.split('.').some((part) => part === '')) return false;
  return true;
});

// Check for undefined keys (used but not in en)
const undefinedKeys = staticKeys.filter((k) => !referenceKeys.has(k));

if (undefinedKeys.length > 0) {
  console.log('❌ Static keys used in code but NOT defined in translations:');
  undefinedKeys.forEach((k) => console.log(`   - ${k}`));
  console.log('');
} else {
  console.log('✅ All static keys used are defined in translations\n');
}

// Show dynamic patterns found and validate them
const dynamicPatterns = [...usedKeys].filter(
  (k) => k.endsWith('*') || k.endsWith('.')
);
if (dynamicPatterns.length > 0) {
  console.log(
    `ℹ️  ${dynamicPatterns.length} dynamic key patterns detected:\n`
  );

  for (const pattern of dynamicPatterns) {
    const prefix = pattern.endsWith('*')
      ? pattern.slice(0, -1)
      : pattern;

    const matchingKeys = [...referenceKeys].filter((k) =>
      k.startsWith(prefix)
    );

    // Check if this is an optional pattern with fallback
    // Handle both exact match and close variants (e.g., "days" vs "day")
    const possibleFallbacks = [
      prefix.replace(/\.$/, '').replace(/\s+$/, ''),
      prefix.replace(/\.$/, '').replace(/\s+$/, '').replace(/days/, 'day'),
      prefix.replace(/\.$/, '').replace(/\s+$/, '').replace(/s /, ' '),
    ];

    const fallback = possibleFallbacks.find(k => referenceKeys.has(k));

    if (matchingKeys.length > 0) {
      console.log(`   ✅ ${pattern}`);
      console.log(`      Found ${matchingKeys.length} matching keys:`);
      matchingKeys.slice(0, 5).forEach((k) =>
        console.log(`      - ${k}`)
      );
      if (matchingKeys.length > 5) {
        console.log(`      ... and ${matchingKeys.length - 5} more`);
      }
    } else if (fallback) {
      console.log(`   ⚠️  ${pattern} (optional)`);
      console.log(`      No specific keys in English, but has fallback: "${fallback}"`);
      console.log('      (Some languages use specific keys for grammar variations)');
    } else {
      console.log(`   ❌ ${pattern}`);
      console.log(`      No keys found starting with "${prefix}"`);
    }
    console.log('');
  }
}

// Check for unused keys (defined but not used)
const staticUsedKeys = [...usedKeys].filter((k) => !k.endsWith('*'));
const dynamicPrefixes = [...usedKeys]
  .filter((k) => k.endsWith('*'))
  .map((k) => k.slice(0, -1));

const unusedKeys = [...referenceKeys].filter((k) => {
  if (staticUsedKeys.includes(k)) return false;
  // Check if it matches any dynamic pattern
  if (dynamicPrefixes.some((p) => k.startsWith(p))) return false;
  return true;
});

if (unusedKeys.length > 0) {
  console.log(
    `⚠️  ${unusedKeys.length} keys defined but possibly not used (may be used dynamically):`
  );
  unusedKeys.slice(0, 20).forEach((k) => console.log(`   - ${k}`));
  if (unusedKeys.length > 20) {
    console.log(`   ... and ${unusedKeys.length - 20} more`);
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📋 SUMMARY');
console.log('='.repeat(60) + '\n');

if (allComplete && undefinedKeys.length === 0) {
  console.log('🎉 All translations are complete and all used keys are defined!');
} else {
  if (!allComplete) {
    console.log('⚠️  Some languages have missing translations');
  }
  if (undefinedKeys.length > 0) {
    console.log('❌ Some used keys are not defined');
  }
}
console.log('');

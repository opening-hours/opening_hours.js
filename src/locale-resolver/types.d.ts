// SPDX-FileCopyrightText: © 2026 opening_hours.js contributors
//
// SPDX-License-Identifier: LGPL-3.0-only

export type TokenType = 'weekday' | 'month';
export type Confidence = 'silent' | 'info' | 'warning' | 'error';
export type Candidate = { type: TokenType, meaning: string, lang: string };
export type Layers = {
    canonical: Record<TokenType, Record<string, string>>;
    universal: Record<TokenType, Record<string, string>>;
    crossLocale: Record<string, Candidate[]>;
    regionLangs?: Record<string, string[]>;
};

type TokenBase = { raw: string, token: string, type: TokenType };
type CanonicalToken = TokenBase & {
    kind: 'canonical', meaning: string, lang: null, layer: 0,
    confidence: 'silent', candidates: null, message: null,
};
type UniversalToken = TokenBase & {
    kind: 'universal', meaning: string, lang: null, layer: 2,
    confidence: 'info', candidates: null, message: null,
};
export type ForeignToken = TokenBase & {
    kind: 'foreign', meaning: string | null, lang: string | null, layer: 3 | null,
    confidence: 'info' | 'warning' | 'error', candidates: Candidate[], message: string | null,
    alternatives?: { meaning: string, langs: string[] }[],
};
type UnknownToken = TokenBase & {
    kind: 'unknown', meaning: null, lang: null, layer: null,
    confidence: 'error', candidates: null, message: string,
};

export type ResolvedToken = CanonicalToken | UniversalToken | ForeignToken | UnknownToken;
export type ResolveRangeOptions = {
    locale: string,
    type: TokenType,
    layers: Layers,
    regionLangs?: Set<string>,
};
export type ResolveRangeResult = {
    ok: boolean,
    confidence: Confidence,
    tokens: ResolvedToken[],
};

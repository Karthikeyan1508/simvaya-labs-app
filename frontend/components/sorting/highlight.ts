// Syntax colouring for the read-only code. Good enough for reading, not a full parser.
import type { LanguageId } from './code-samples';

export type TokenType = 'plain' | 'keyword' | 'string' | 'number' | 'comment' | 'fn' | 'meta';

export interface Token {
  type: TokenType;
  text: string;
}

export const TOKEN_CLASS: Record<TokenType, string> = {
  plain: '',
  keyword: 'font-medium text-amber-700 dark:text-amber-300',
  string: 'text-emerald-700 dark:text-emerald-300',
  number: 'text-sky-700 dark:text-sky-300',
  comment: 'italic text-muted-foreground',
  fn: 'text-violet-700 dark:text-violet-300',
  meta: 'text-rose-700 dark:text-rose-300',
};

const WORDS: Record<LanguageId, string> = {
  pseudocode:
    'procedure function if then else elif for each to while repeat until loop forever return end and or not in is do push pop print let true false null empty',
  c: 'if else for while do return void int char long double float static const sizeof struct break continue switch case default unsigned',
  cpp: 'if else for while do return void int bool char long double float static const sizeof class namespace using break continue auto true false new delete nullptr',
  java:
    'public private protected class static void int boolean if else for while return new import package true false null final break continue',
  python:
    'def return if elif else for while in import from as class None True False and or not lambda pass break continue is with try except raise yield',
  javascript:
    'function const let var return if else for while do of new class import export true false null undefined break continue this',
};

const LINE_COMMENT = /\/\/[^\n]*/.source;
const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//.source;
const HASH_COMMENT = /#[^\n]*/.source;
const C_INCLUDE = /#[ \t]*\w+[^\n]*/.source;
const QUOTED = /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/.source;
const TEMPLATE = /`(?:\\.|[^`\\])*`/.source;
const TRIPLE = /"""[\s\S]*?"""|'''[\s\S]*?'''/.source;
const C_LIKE_COMMENT = `${LINE_COMMENT}|${BLOCK_COMMENT}`;

const SYNTAX: Record<LanguageId, { comment: string; string: string; meta?: string }> = {
  pseudocode: { comment: LINE_COMMENT, string: QUOTED },
  c: { comment: C_LIKE_COMMENT, string: QUOTED, meta: C_INCLUDE },
  cpp: { comment: C_LIKE_COMMENT, string: QUOTED, meta: C_INCLUDE },
  java: { comment: C_LIKE_COMMENT, string: QUOTED },
  javascript: { comment: C_LIKE_COMMENT, string: `${TEMPLATE}|${QUOTED}` },
  python: { comment: HASH_COMMENT, string: `${TRIPLE}|${QUOTED}` },
};

// Split the code into coloured tokens. Adjacent plain text is merged.
export function tokenize(code: string, lang: LanguageId): Token[] {
  const syntax = SYNTAX[lang];
  const words = new Set(WORDS[lang].split(' '));
  const parts = [
    `(?<comment>${syntax.comment})`,
    `(?<string>${syntax.string})`,
    ...(syntax.meta ? [`(?<meta>${syntax.meta})`] : []),
    '(?<number>\\b\\d+(?:\\.\\d+)?\\b)',
    '(?<fn>[A-Za-z_]\\w*)(?=\\s*\\()',
    '(?<word>[A-Za-z_]\\w*)',
    '(?<other>[\\s\\S])',
  ];

  const tokens: Token[] = [];
  const push = (type: TokenType, text: string) => {
    const last = tokens[tokens.length - 1];
    if (type === 'plain' && last?.type === 'plain') last.text += text;
    else tokens.push({ type, text });
  };

  for (const m of code.matchAll(new RegExp(parts.join('|'), 'g'))) {
    const g: Record<string, string | undefined> = m.groups ?? {};
    const text = m[0];
    if (g.comment !== undefined) push('comment', text);
    else if (g.string !== undefined) push('string', text);
    else if (g.meta !== undefined) push('meta', text);
    else if (g.number !== undefined) push('number', text);
    else if (g.fn !== undefined) push(words.has(text) ? 'keyword' : 'fn', text);
    else if (g.word !== undefined) push(words.has(text) ? 'keyword' : 'plain', text);
    else push('plain', text);
  }
  return tokens;
}

// Tokens grouped by line, so each code line can carry its own number.
export function splitLines(tokens: Token[]): Token[][] {
  const lines: Token[][] = [[]];
  for (const t of tokens) {
    t.text.split('\n').forEach((part, k) => {
      if (k > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ type: t.type, text: part });
    });
  }
  return lines;
}

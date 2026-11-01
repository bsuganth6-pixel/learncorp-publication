/** Escape a user-supplied string so it is matched literally inside a RegExp (no injection, no ReDoS). */
export const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

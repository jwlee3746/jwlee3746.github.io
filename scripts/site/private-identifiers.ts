import { createHash } from 'node:crypto';

export function identifierFingerprint(value: string): string {
  return createHash('sha256').update(value.toLowerCase()).digest('hex');
}

// Match whole identifiers and filenames, including names inside paths/attributes.
// Never return the matched text: diagnostics must not repeat internal names.
export function containsPrivateIdentifier(source: string, fingerprints: ReadonlySet<string>): boolean {
  const decoded = source
    .replace(/&#(?:x([0-9a-f]+)|(\d+));/gi, (original, hex: string | undefined, decimal: string | undefined) => {
      const code = Number.parseInt(hex ?? decimal ?? '', hex ? 16 : 10);
      return code <= 0x10ffff ? String.fromCodePoint(code) : original;
    })
    .replace(/%([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)));
  const tokens = decoded.match(/[a-z0-9_-]+(?:\.[a-z0-9_-]+)*/gi) ?? [];
  return tokens.some(token => [token, ...token.split('.')].some(part => fingerprints.has(identifierFingerprint(part))));
}

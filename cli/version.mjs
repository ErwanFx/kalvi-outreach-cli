import { readFileSync } from 'node:fs';

export const RELEASE_MANIFEST = JSON.parse(readFileSync(new URL('../contracts/release-manifest.json', import.meta.url), 'utf8'));
export const CLI_VERSION = RELEASE_MANIFEST.cliVersion;

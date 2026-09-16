import { rm } from 'node:fs/promises';
// Keep deleted routes and old assets from surviving into the next deployment.
await rm(new URL('../_site/', import.meta.url), { recursive: true, force: true });

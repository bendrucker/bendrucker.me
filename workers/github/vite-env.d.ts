// The worker imports `SITE` from `src/config.ts`, whose category switch reads
// `import.meta.env`. Only the site's Vite build defines it. The worker never
// calls the switch, so this declaration is for the type checker alone.
/// <reference types="vite/client" />

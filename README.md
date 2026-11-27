# Artist Playground

Artist Playground is being migrated to a unified Next.js application.

## Stack

- Next.js App Router
- React
- TypeScript
- Supabase (dedicated Artist Playground project; integration to follow)

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Production

```bash
npm run build
npm start
```

The application requires a Node.js-capable hosting environment. GitHub Pages is not a supported host for the server-rendered application.

## Migration notes

The existing Astro implementation is retained temporarily as a visual and content reference while the Next.js pages are checked for parity. Do not remove the legacy source until the migrated pages have been verified.

The public website's existing design is the source of truth. Changes to its visual design are out of scope for this migration.

import { defineConfig } from "orval";

/**
 * Regenerate the typed API client (TanStack-Query hooks + fetch wrappers)
 * AND the server-side runtime validators (zod schemas) from a single source
 * of truth: backend/openapi.yaml.
 *
 * Run:
 *   npm run codegen           # one shot
 *   npm run codegen:watch     # rerun on openapi.yaml change
 *
 * Outputs produced:
 *   frontend/src/api/generated/api.ts          (React-Query hooks + fetch fns)
 *   frontend/src/api/generated/api.schemas.ts  (TypeScript types)
 *   backend/src/api-zod/generated/api.js       (zod schemas for runtime validation)
 *
 * Conventions:
 *   - client: react-query
 *   - httpClient: fetch (mutator = src/api/custom-fetch.ts → customFetch)
 *   - mode: split — produces api.ts + api.schemas.ts side-by-side
 *   - orval pinned to 8.5.3 (the version that originally produced the
 *     committed files; later 8.x changed the schemas-as-file behavior)
 *
 * NOTE: the committed generated files are slightly behind openapi.yaml
 * (e.g. they are missing BugBatchInput / DirectConversation* / a few
 * new params). Running `npm run codegen` today produces a ~12k-line diff
 * that is part real schema updates and part formatter-only changes
 * (the prior generation went through a stricter prettier pass). Treat
 * those as intentional and review the diff before committing.
 */
export default defineConfig({
  cms: {
    input: "../backend/openapi.yaml",
    output: {
      // `mode: "split"` produces two files at `target`'s directory:
      //   api.ts          — TanStack-Query hooks + fetch wrappers
      //   api.schemas.ts  — TypeScript types (re-exported by api.ts)
      target: "./src/api/generated/api.ts",
      client: "react-query",
      httpClient: "fetch",
      mode: "split",
      override: {
        mutator: {
          path: "./src/api/custom-fetch.ts",
          name: "customFetch",
        },
        query: {
          useQuery: true,
          useMutation: true,
        },
      },
      prettier: false,
    },
  },

  // Server-side zod schemas, written as plain JS to keep the backend ESM-only.
  cmsZod: {
    input: "../backend/openapi.yaml",
    output: {
      target: "../backend/src/api-zod/generated/api.js",
      client: "zod",
      mode: "single",
      fileExtension: ".js",
      prettier: false,
    },
  },
});

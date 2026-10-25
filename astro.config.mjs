import { rm } from "node:fs/promises";
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

// Notes and projects stay local for now: neither the dev server nor the build
// (and so the deployed site) shows them. `npm run dev:writeups` previews them
// locally. Set to true to publish them.
const PUBLISH_WRITEUPS = false;

// Write-up pages live in src/writeups (not src/pages) and are only routed when
// write-ups are on; their media lives in public/writeups and is dropped from
// the build otherwise. Components read the same switch as `WRITEUPS` (consts.ts).
function writeups() {
  let on = false;
  return {
    name: "writeups",
    hooks: {
      "astro:config:setup": ({ command, injectRoute, updateConfig }) => {
        on = PUBLISH_WRITEUPS || (command === "dev" && process.env.WRITEUPS === "1");
        updateConfig({ vite: { define: { __WRITEUPS__: JSON.stringify(on) } } });
        if (!on) return;
        injectRoute({ pattern: "/notes", entrypoint: "./src/writeups/notes/index.astro" });
        injectRoute({ pattern: "/notes/[...slug]", entrypoint: "./src/writeups/notes/[...slug].astro" });
        injectRoute({ pattern: "/projects/[...slug]", entrypoint: "./src/writeups/projects/[...slug].astro" });
        injectRoute({ pattern: "/rss.xml", entrypoint: "./src/writeups/rss.xml.ts" });
      },
      "astro:build:done": async ({ dir }) => {
        if (!on) await rm(new URL("writeups/", dir), { recursive: true, force: true });
      },
    },
  };
}

// Deployed as the GitHub Pages *user* site at https://mgomezandreu.github.io/.
// It used to be a project site under /personal/; these keep the main old URLs
// working (pages with an instant redirect), and 404.astro sends every other
// /personal/... path to the same path at the root.
export default defineConfig({
  site: "https://mgomezandreu.github.io",
  trailingSlash: "ignore",
  redirects: {
    "/personal": "/",
    "/personal/cv": "/cv",
    "/personal/publications": "/#papers",
  },
  integrations: [mdx(), sitemap(), writeups()],
  // Light code blocks so they sit on the notebook paper.
  markdown: { shikiConfig: { theme: "github-light" } },
});

import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import netlify from "@astrojs/netlify";
import sitemap from "@astrojs/sitemap";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  integrations: [tailwind(), react(), sitemap()],
  output: "server",
  adapter: netlify({
    dist: {
      client: "dist/client",
      server: "dist/server",
    },
  }),
  site: "https://praxjobs.com",
  base: "/",
  trailingSlash: "ignore",
  build: {
    format: "directory",
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
  vite: {
    build: {
      target: "esnext",
      modulePreload: {
        polyfill: false,
      },
    },
    // Removed define block exposing OpenAI key to client-side
    ssr: {
      noExternal: ["firebase", "firebase-admin"],
    },
    optimizeDeps: {
      exclude: ["crypto"],
    },
    plugins: [
      nodePolyfills({
        include: ["crypto"],
      }),
    ],
  },
});

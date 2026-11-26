/// <reference lib="esnext" />
/// <reference lib="webworker" />
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * Caching rules (AGENTS.md rule 11, RECOMMENDATIONS 2.2):
 * - Static build assets, fonts and images: cached.
 * - /api/*, Clerk routes and every page: network only. A page or API response
 *   can hold another user's private event; it must never be served from cache
 *   to the next person on a shared phone.
 * - Offline: the precached /offline page. Writes are not queued.
 * Serwist's `defaultCache` is NOT used: it caches API GETs and pages.
 */
const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ url }) =>
      url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/sign-in") ||
      url.pathname.startsWith("/sign-up") ||
      url.pathname.startsWith("/__clerk") ||
      url.hostname.endsWith("clerk.accounts.dev") ||
      url.hostname.includes("clerk."),
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/_next/static/"),
    handler: new CacheFirst({
      cacheName: "next-static",
      plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 })],
    }),
  },
  {
    matcher: ({ request, sameOrigin }) => sameOrigin && (request.destination === "font" || request.destination === "image"),
    handler: new StaleWhileRevalidate({
      cacheName: "static-media",
      plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 })],
    }),
  },
  {
    // Everything else, pages included.
    matcher: () => true,
    handler: new NetworkOnly(),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();

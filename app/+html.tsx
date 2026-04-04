import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// This file defines the HTML document for web builds.
// The inline script runs before the bundle is parsed, providing
// globalThis.__ExpoImportMetaRegistry so that any import.meta
// replaced by babel-preset-expo (unstable_transformImportMeta) works safely.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof globalThis.__ExpoImportMetaRegistry === 'undefined') {
                Object.defineProperty(globalThis, '__ExpoImportMetaRegistry', {
                  value: {
                    env: {},
                    url: typeof location !== 'undefined' ? location.href : '',
                  },
                  writable: true,
                  configurable: true,
                });
              }

              // Register coi-serviceworker to enable cross-origin isolation (required for SharedArrayBuffer).
              // The service worker intercepts all fetches and injects COOP + COEP headers.
              // First load: SW installs → activates → page reloads.
              // Second load: SW is controlling, headers are injected → crossOriginIsolated = true.
              if ('serviceWorker' in navigator && !window.crossOriginIsolated) {
                navigator.serviceWorker.register('/coi-serviceworker.js').then(function(reg) {
                  function reload() { window.location.reload(); }

                  function trackSW(sw) {
                    if (sw.state === 'activated') { reload(); return; }
                    sw.addEventListener('statechange', function() {
                      if (sw.state === 'activated') reload();
                    });
                  }

                  if (reg.installing) {
                    trackSW(reg.installing);
                  } else if (reg.waiting) {
                    trackSW(reg.waiting);
                  } else if (reg.active && !navigator.serviceWorker.controller) {
                    reload();
                  }

                  reg.addEventListener('updatefound', function() {
                    if (reg.installing) trackSW(reg.installing);
                  });
                }).catch(function(err) {
                  console.warn('Service worker registration failed:', err);
                });
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

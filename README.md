# Read-only public dashboard

Static HTML/CSS/JavaScript and a sanitized, allowlisted last-known checkpoint. Arabic-friendly responsive layout. No commands, administrative endpoint, forms, credentials, external fonts, third-party libraries, telemetry, or private registry copy.

`state.json` is the only publisher-updated file. Live Lead/worker heartbeat is UNKNOWN; Raspberry Pi is NOT_CONNECTED. A recent checkpoint is not an online agent. Runtime heartbeat evidence is separate and currently unknown in this public projection. Milestone prose is explicitly the foundation checkpoint, not inferred live progress. No percentages or synthetic test lanes.

```
node --test test_app.cjs
```

GitHub Pages source: `hermes/dashboard-foundation`, root `/`. No custom domain and no authored Actions workflow. The normal GitHub Pages branch deployment may use GitHub's managed Pages build infrastructure.

If a state fetch fails, the browser retains the last-known public snapshot (including across reload via localStorage) and shows an offline warning. After 15 minutes the checkpoint is marked stale; heartbeat becomes stale after 90 seconds if one is ever legitimately supplied. Neither means a workstream is deleted or complete. No service-worker/offline app-shell claim.

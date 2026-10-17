# Read-only public dashboard

Static HTML/CSS/JavaScript and a sanitized, allowlisted last-known checkpoint. Arabic-friendly responsive layout. No commands, administrative endpoint, forms, credentials, external fonts, third-party libraries, telemetry, or private registry copy.

Live data URL is fixed: `https://raw.githubusercontent.com/afllak/muhannad-dashboard/hermes/live-state/state.json`. Only `state.json` on that DATA branch is automatically updated. Pages source `hermes/dashboard-foundation` is unchanged by schedules, avoiding Pages build churn. Root `state.json` on the Pages source is an archival checkpoint, not the live source. No token/client authentication or private API access. CSP permits only the raw GitHub host for data fetches.

Schema version 1, integration N8N_DURABLE_GITHUB: eight allowlisted lanes with reviewed milestone prose, checkpoint/source revision, registry-file timestamp semantics, bridge runtime heartbeat, UNKNOWN Lead/workers, NOT_CONNECTED Pi. COMPLETE/DONE closes an assignment, not implementation PASS; superseded plans remain IDLE with explicit closure semantics. Real scheduled publication is independent of manually reviewed milestone prose. No percentages or synthetic test lanes. FantasyRoam build success is not gameplay acceptance.

```
node --test test_app.cjs
```

GitHub Pages source: `hermes/dashboard-foundation`, root `/`. No custom domain and no authored Actions workflow. The normal GitHub Pages branch deployment may use GitHub's managed Pages build infrastructure.

Fetch runs every minute without credentials. Raw GitHub currently returns Cache-Control max-age=300; runtime heartbeat is quantized to five-minute buckets. Both runtime and registry age use a conservative 15-minute stale threshold, but represent distinct clocks. Registry timestamps are NOT live-agent heartbeat. Stale runtime shows OFFLINE/lost freshness, not proof the PC is powered off. Failed fetch retains last-known data in memory/localStorage across reloads. No workstream is deleted or declared complete. No service-worker/offline app-shell claim. V1 remains the main page; no V2 deployment or visual approval is implied.

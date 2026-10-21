# Multiverse Mission Lab

Public Sites package for the Console simulator and Observe prototype. Both routes share the original pure rule engine and browser-local store.

- `/dev/mission-simulator/`
- `/dev/mission-observe/`

Run `npm install` then `npm run build`. Static files are exported to `out/`. The local development checkout can reuse the parent workspace dependencies via an ignored symlink; that symlink is not part of the published source.

Source copied from the corresponding Putopia Demo directories on 2026-10-16. The standalone layout excludes production authentication, advertising scripts, APIs and service workers. Observe uses a client-side query wrapper for static hosting; images are unoptimized local assets. No production environment files or credentials are included.

Access is public. Simulation state stays in the visitor's browser; cross-device multiplayer is not provided. See the parent repository's `docs/product/mission-gameplay-spec.zh.md` and `docs/product/mission-demo-verification.zh.md` for rules and validation.

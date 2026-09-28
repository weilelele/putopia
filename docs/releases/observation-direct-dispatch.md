# Observation command dispatch

New observations no longer wait for Mongo `bootstrap.status = bootstrapped` before writing the existing `cosmo_requests` command. The minute queue worker snapshots existing sessions and invokes the same atomic `dispatch_dreamcatcher_generation` RPC. Missing Cosmo world data produces an empty snapshot, not an onboarding gate. A Mongo read error still retries safely rather than accepting an unknown baseline.

The wire contract remains unchanged: first round `{world_id, type: "expansion", payload: {}}`; subsequent rounds carry `{puzzleType, tiles: [{assetId, votes}]}` from the settled previous round. The RPC saves the command ID in the same transaction and reuses it on retry. It returns null for cancelled/superseded work, which is not reported as a dispatched request.

Existing result retrieval, session fencing, presentation queue, 24-hour voting rules and publication-only email remain in place. No Cosmo server change or new API is introduced. No database migration is needed: the v79 RPC already permits first-round proposed worlds. Its historical caller-bootstrap comment describes the previous adapter contract and is superseded by this release.

Writing a command proves submission to the shared inbox, not Cosmo consumption. Verify the saved command ID separately from Mongo's processed cursor, returned batch, published task and notification delivery.

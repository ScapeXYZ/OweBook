# Security notes

**Audit date:** 2026-11-20. **Code commit:** `d4b76119855174cbf90510a41e4cdc59131c05c8`. The D12 evidence records scanned HEAD `417deabe4aadd80f051b0c54c48a177497df42a7`, the subsequent evidence-only commit. These notes describe that audit snapshot. Claude’s approval of this disclosure is pending.

## Results

| Recorded command | Exit | Moderate entries | High | Critical |
| --- | ---: | ---: | ---: | ---: |
| Windows, npm 11.18.0, `npm.cmd audit --json` | 1 | 2 | 0 | 0 |
| WSL, npm 10.8.2, `npm audit --json --package-lock-only` | 1 | 6 | 0 | 0 |

Both reports contain **one underlying advisory**, [GHSA-px8p-9vwx-vf98 / CVE-2026-45820](https://github.com/advisories/GHSA-px8p-9vwx-vf98), npm advisory source `1164783`, rated **moderate**. It affects `fflate` and can cause a denial of service if its `unzipSync` function processes a malformed ZIP64 archive. The two reports both identify the locked `fflate@0.7.3` instance nested under Satori. The lockfile also has `fflate@0.7.5` and `0.8.3`, which are patched versions of their respective branches and were outside the reported affected instance. [Lockfile](../package-lock.json)

Windows reports the affected `fflate` instance and the propagated entry for its parent, `satori`. The WSL report propagates the same advisory further through the Hyper Elements React renderer’s Satori peer and through the CLI, email-client, and lint tooling. The four additional entries are dependency-level findings with no separate advisory IDs. The commands used different npm versions and audit modes, so the saved results cannot isolate which difference in audit processing caused the extra propagation. Both reports list the same dependency totals and the same affected `fflate` path.

## Reported packages

The paths below start at OweBook. “Peer” marks an optional peer relationship in the lockfile. All six entries have moderate severity and trace to `GHSA-px8p-9vwx-vf98`. The Hyper Elements and Satori entries inherit the advisory through their dependencies.

| Package | Classification and dependency path | Known use and potential reachability | Available remediation |
| --- | --- | --- | --- |
| `fflate@0.7.3` | Transitive runtime. OweBook → `satori` → nested `fflate`. | Confirmed affected version. OweBook reachability of the vulnerable `unzipSync` operation is unconfirmed. The inspected Satori source uses the same package’s `inflateSync` in its WOFF font path, a different operation. | Upstream patched this branch in `0.7.5`. Getting Satori to resolve a patched copy requires a dependency resolution change because it pins `0.7.3`. Windows audit proposes changing Satori to `0.32.0`. WSL audit reports no automatic fix. |
| `satori@0.33.5` | Direct runtime. OweBook → `satori` → `fflate`. | Used to render reminder PNGs through Hyper Elements Canvas. Canvas use establishes that this renderer is exercised. It does not establish that the vulnerable ZIP operation receives data. | Windows audit proposes `satori@0.32.0` and marks the change as semver-major. It is outside Hyper Elements React’s declared `^0.33.5` Satori peer range. WSL audit reports no automatic fix. A compatible upstream fix or tested dependency resolution change is required. |
| `@hyper-elements/react@0.4.6` | Direct runtime. OweBook → React renderer → Satori (peer) → `fflate`. | The build uses this renderer for all four formats. Canvas is the confirmed Satori entry point. Reachability of vulnerable ZIP parsing is unconfirmed. | WSL audit reports no automatic fix. Resolve the affected Satori branch within a compatible React/Satori combination. This requires changing dependency resolution and may require updating the React renderer. |
| `@hyper-elements/cli@0.2.10` | Direct development dependency. OweBook → CLI → React renderer (peer), or CLI → email-clients/lint → React renderer (peer) → Satori (peer) → `fflate`. | Used for local verification checks. CLI use establishes the tooling is exercised. The audit paths alone do not establish that these checks invoke `unzipSync`. | WSL audit reports no automatic fix. The inherited finding requires a change to the underlying renderer dependency resolution, potentially with a compatible tooling update. |
| `@hyper-elements/email-clients@0.4.16` | Direct development dependency, also used during builds. OweBook → email-clients → React renderer (peer) → Satori (peer) → `fflate`. | Used for HTML diagnostics and emulated previews. The peer relationship alone does not establish a path from receipt inputs to vulnerable ZIP parsing. | WSL audit reports no automatic fix. Resolving the affected renderer chain requires a dependency resolution change. |
| `@hyper-elements/lint@0.1.7` | Direct development dependency, also used during builds. OweBook → lint → React renderer (peer) → Satori (peer) → `fflate`. | Used for HTML diagnostics. The peer relationship alone does not establish a path from lint inputs to vulnerable ZIP parsing. | WSL audit reports no automatic fix. Resolving the affected renderer chain requires a dependency resolution change. |

## Reachability and release status

The documented build reads shop JSON and customer and transaction CSV files, and supplies bundled Lato TTF fonts to the renderer. The normal project input interface has no ZIP archive input. Static review did not identify a route from those inputs to `unzipSync`. No exploit or exhaustive reachability test was performed, so reachability in OweBook remains unconfirmed. [Input loader](../scripts/load-summary.ts) · [Render workflow](../scripts/build.tsx)

The Windows suggestion is recorded as an audit result. Its compatibility and effectiveness for OweBook were not verified. No dependency remediation or runtime changes were applied during this review.

Audit sources are the local D12 artifacts `out/pre-push-final/npm-audit.json` and `out/pre-push/npm-audit.json`. The earlier D12 report contains the same package counts, advisory ID, dependency paths, and remediation flags. The historical WSL install also reported six moderate entries. [Installation transcript](evidence/wsl-complete.txt)

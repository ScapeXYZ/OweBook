# Pre-public documentation and dependency checks

code commit: da4841700570ad5621e2a85328d0af25749778b2

## G1 · Credit invariant

The named test `credit invariant: credit above zero implies no open sales` reconciles the aging total, credit and signed balance for every customer in sample, stress-max, stress-min, USD and JPY. The crafted sequence checks prepayment, a sale that uses part of the available credit, a subsequent sale that leaves an open balance, and a payment that settles it and leaves credit. [Named test results](pre-public-tests.txt) · [Test source](../../tests/core.test.ts)

## G2 · Wording

The [before](pre-public-wording-before.txt) and [after](pre-public-wording-after.txt) scans include all matches with one surrounding line where available. The regex was `verified|bank|confirmed|zero warnings|Gmail-safe|pixel|audit|accounting|fuzz|all clients|secure|production|guarantee|independent` and was applied case-insensitively to README, claims, submission and qualification documents. The bank references describe the product's limited scope. “Verified” labels in the claims register refer to the linked local evidence. The approved consistency-check disclosure and the npm audit reference are supported.

## G3 · Numerical claims

| Where | Values and claims | Evidence |
| --- | --- | --- |
| README introduction and implementation | Four output types from one computed ledger and one shared theme | [Build workflow](../../scripts/build.tsx), [template theme](../../kit/theme.ts), [final build and checks](pre-public-verify.txt) |
| README introduction | The three questions are explanatory framing | [README introduction](../../README.md#owebook) |
| Preview captions and alt text | Ledger at 1280 px and 390 px, c3 statement page 1 on A4, c3 square reminder, E015 Gmail at 600 px and 390 px, E015 Outlook.com at 600 px | [Regeneration comparison](d10b-assets-sha256.json), [browser and model findings](d10b-email-preview-findings.json), [image path and PNG dimensions](pre-public-image-paths.txt) |
| README preview HTML | Presentation widths 880, 320, 560, 520, 600, 390 and 600 px are markup choices | [README markup and checked attributes](pre-public-image-paths.txt) |
| README implementation and submission implementation | Hyper Elements React 0.4.6; CLI 0.2.10; lint 0.1.7; email-clients 0.4.16. The submission names the A4 Document. | [Pinned versions](../../package.json), [statement template](../../templates/statement.tsx), [WSL PDF inspection](wsl-complete.txt) |
| README implementation table, output paths and submission description | One-page A4 statements | [Poppler output](wsl-complete.txt), [statement template](../../templates/statement.tsx) |
| README prerequisites | Windows Node 24.14.1 with npm 11.18.0; WSL Node 20.20.2 with npm 10.8.2; Python 3 for the full tier | [Windows transcript](windows-complete.txt), [WSL transcript](wsl-complete.txt), [Python wrapper](../../scripts/crosscheck.ts) |
| README build and summary examples | Explicit as-of 2026-11-20 and YYYY-MM-DD input format | [Build checks](pre-public-verify.txt), [date rules](../../core/values.ts), [summary CLI test](../../tests/summary.test.ts) |
| README output and input rules | One selected receipt, default A4, square-only reminders | [Build selector](../../scripts/build.tsx), [paper test](../../tests/capabilities.test.ts), [reminder template](../../templates/reminder.tsx) |
| README limits | Symbol length at most 3; amount 9,999,999,999; customer limits 99,999,999,999; shop limits 9,999,999,999,999; 10,000 data rows per CSV | [F1 boundary tests](../../tests/limits.test.ts), [CSV boundary test](../../tests/core.test.ts), [limits](../../core/values.ts) |
| README currencies | Two decimal places for NGN and USD, none for JPY, one currency per data set | [NGN](../../data/sample/shop.json), [USD](../../data/currency-usd/shop.json), [JPY](../../data/currency-jpy/shop.json), [full verification](wsl-complete.txt) |
| README verification | 48 named tests; five datasets; the approved Python disclosure describes a second implementation, 8 sample customers, and two stress sets with 1 customer each | [Tests](pre-public-tests.txt), [runner](../../scripts/verify.ts), [checker](../../verification/crosscheck.py), [comparison](pre-public-crosscheck.txt) |
| README limitations | Classic Outlook model holds a 600 px receipt at a 390 px viewport | [Excluded classic Outlook preview measurement](d10b-email-preview-findings.json) |

## G4 · fflate reachability

`npm ls fflate` resolved Satori 0.33.5 to fflate 0.7.3, `@shuding/opentype.js` to fflate 0.7.5, and the React PDF/PDFKit chain to fflate 0.8.3. The renderer reads JSON/CSV and supplies bundled Lato TTFs. In the installed Satori source map, `src/font.ts` imports `inflateSync` from fflate and uses it for compressed WOFF font tables. The advisory concerns `unzipSync`, and the inspected source path did not establish that OweBook reaches it. The review stayed within 15 minutes. **Reachability not confirmed.** [Audit and limitations](../security-notes.md)

## G5 · Image paths

The [image check](pre-public-image-paths.txt) confirms the seven approved paths are relative, present, tracked, and still byte-identical to the D10b hash evidence. All captions identify the fictional sample and the email captions also identify the emulator.

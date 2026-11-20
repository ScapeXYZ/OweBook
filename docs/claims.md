# README claims and evidence

| README passage or claim | Evidence | Status |
| --- | --- | --- |
| Preview placeholders for the ledger, statement, reminder, and receipt | [Qualification gate](qualification-checklist.md) | PENDING |
| Local TypeScript kit and its four output types | [Build workflow](../scripts/build.tsx), [templates](../templates) | Verified locally |
| No accounts, payment initiation, email sending, or bank checks. Receipts represent recorded data. | [Build workflow](../scripts/build.tsx), [receipt](../templates/receipt.tsx) | Verified in source |
| One currency per set, excluded charges and adjustments, and recordkeeping scope | [Specification](spec.md), [ledger](../core/ledger.ts) | Verified in source |
| Hyper Elements versions, four roots, shared theme, fictional PreviewProps, and HTML diagnostics | [Manifest](../package.json), [templates](../templates), [theme](../kit/theme.ts), [preview data](../kit/sample.ts) | Verified locally |
| CLI checks Page, Canvas, and Email. The Document uses public validate and renderPdf because the CLI worker fails. | [CLI limitation](decisions.md#known-limitations), [Document diagnostics](evidence/diagnostics-sample.json), [build workflow](../scripts/build.tsx) | Verified locally |
| Tested Node and npm versions, native ESM, and PowerShell npm.cmd fallback | [Windows results](evidence/windows-complete.txt), [WSL results](evidence/wsl-complete.txt), [manifest](../package.json), [PowerShell record](decisions.md) | Verified locally |
| Repository-root setup commands and five-dataset Node-only verification | [Fresh-clone README run](evidence/wsl-portable.txt), [repeat WSL results](evidence/wsl-complete.txt), [runner](../scripts/verify.ts) | Verified locally |
| Full tier, Chromium installation, Python and Poppler prerequisites, Windows WSL routing, and WSL pass | [Runner](../scripts/verify.ts), [Chromium installation and original recovery transcript](evidence/wsl-original-recovery.txt), [WSL full tier](evidence/wsl-complete.txt) | Verified locally |
| Input files, explicit as-of, receipt selection, and A4 and square output scope | [Build arguments](../scripts/build.tsx), [sample](../data/sample), [ledger rules](spec.md), [PDF and screenshots](evidence/wsl-complete.txt) | Verified locally and in source |
| Paper defaults to A4, Letter is rejected, and the reminder card supports square format only. | [D11 tests](../tests/capabilities.test.ts), [input and CLI audit](spec.md#input-and-command-capability-audit), [reminder template](../templates/reminder.tsx) | Verified locally and in source |
| Decimal syntax, currency-symbol width, monetary limits and CSV row cap | [Boundary tests](../tests/limits.test.ts), [parsing tests](../tests/core.test.ts), [input rules](spec.md) | Verified locally |
| Bundled Lato glyph requirement and ISO-code fallback | [Arabic glyph probe](decisions.md#day-2-currency-verification) | Verified locally |
| Summary-only command | [CLI test](../tests/summary.test.ts), [Windows results](evidence/windows-complete.txt) | Verified locally |
| NGN, USD, and JPY render with their respective symbols and decimal places. No conversion. | [Currency results](decisions.md#day-2-currency-verification), [PDF extraction and diagnostics](evidence/wsl-complete.txt), [ledger](../core/ledger.ts) | Verified locally |
| Small labels, classic Outlook letter spacing, font fallback, and Chromium receipt screenshots | [Render diagnostics](evidence/diagnostics-sample.json), [screenshot runner](../scripts/screenshot.ts) | Verified locally |
| Gmail and Outlook visual approval | [Qualification checklist](qualification-checklist.md) | PENDING |
| 45 named tests, fresh WSL results, checklist and claims links | [Windows results](evidence/windows-complete.txt), [WSL results](evidence/wsl-complete.txt), [checklist](qualification-checklist.md) | Verified locally |
| Python consistency check, matching original datasets and independence limitation | [Checker](../verification/crosscheck.py), [original-set comparison](evidence/crosscheck.json), [fresh comparison](evidence/wsl-full-crosscheck.json), [provenance](../verification/README.md) | Verified locally |
| MIT license and separate bundled font notices | [MIT license](../LICENSE), [third-party notices](../THIRD_PARTY.md) | Verified in source |

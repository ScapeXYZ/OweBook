# Qualification checklist

| Requirement | Status | Evidence |
| --- | --- | --- |
| Hyper Elements meaningfully used in four formats | PASS locally | [Templates](../templates), [shared theme](../kit/theme.ts), [CLI check](../out/sample/evidence/hyper-elements-check.jsonl), [Document API results](../out/sample/evidence/diagnostics.json) |
| Complete source in a public GitHub repository | PENDING | Local source is present. Published source and public visibility await an authorized release. |
| README contains the three required headings | PASS locally | [README](../README.md) |
| README includes real screenshots for all four outputs | PASS locally | [Ledger](../assets/ledger-1280.png), [statement](../assets/statement.png), [reminder](../assets/reminder.png), [receipt](../assets/receipt.png) |
| README explains the Hyper Elements implementation | PASS locally | [Implementation](../README.md#hyper-elements-implementation), [build script](../scripts/build.tsx) |
| README contains working run commands | PASS for the installed Windows workspace | [Setup instructions](../README.md#setup-instructions), [Windows verification](../out/parallel/sample-verify.txt) |
| Fresh WSL clone using only README steps | PENDING | Requires authorized publication and a new clone. |
| Required Hyper Elements repository star | PENDING | Owner confirmation required. |
| Gmail and Outlook screenshot previews | PENDING | The receipt preview is a Chromium capture of rendered HTML. |
| Stress layout verification | PASS locally | [PDF gutter measurements](../out/parallel/pdf-gutter.json), [stress-max statement](../out/stress-max/screenshots/statement.png), [390 px stress-max ledger](../out/stress-max/screenshots/ledger-390.png), [final stress-max transcript](../out/parallel/final-stress-max-verify.txt). Claude's acceptance remains pending. |
| Claude's design and CP1 acceptance | PENDING | Awaiting Claude's decision. |
| Submission | PENDING | [Draft form fields](submission.md). |

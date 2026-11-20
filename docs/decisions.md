# OweBook setup verification

Initial verification on 2026-11-20 used Node v24.14.1 and npm 11.18.0. The standalone repository had the expected origin and no commits at that time. PowerShell blocked `npm.ps1`, so verification used `npm.cmd`.

## Installed dependencies

`npm.cmd ls --depth=0` exited 0:

```text
owebook@1.0.0 <repository root>
├── @hyper-elements/cli@0.2.10
├── @hyper-elements/email-clients@0.4.16
├── @hyper-elements/lint@0.1.7
├── @hyper-elements/react@0.4.6
├── @react-pdf/renderer@4.9.0
├── @resvg/resvg-js@2.6.2
├── @types/node@26.6.6
├── @types/react-dom@18.3.7
├── @types/react@18.3.31
├── playwright@1.65.1
├── react-dom@18.3.1
├── react@18.3.1
├── satori@0.33.5
├── tsx@4.23.15
└── typescript@7.0.2
```

## Install warnings

- `npm.cmd audit --json` could not reach the registry inside the sandbox. The authorized registry retry exited 1 and confirmed two moderate findings. Satori 0.33.5 depends directly on fflate 0.7.3, which the advisory reports can loop indefinitely on malformed ZIP64 archives. npm also flags Satori through that dependency and reports a downgrade to 0.32.0 as its available fix. [GHSA-px8p-9vwx-vf98](https://github.com/advisories/GHSA-px8p-9vwx-vf98)
- `npm.cmd ls esbuild` showed esbuild 0.28.2 under tsx 4.23.15. Its package declares `node install.js` as its postinstall script. `npm.cmd approve-scripts --allow-scripts-pending --json` confirmed the script is pending. The installed esbuild successfully transformed a TypeScript snippet and the installed tsx reported its version.
- Dependency versions and install-script approvals were left as found.

## Setup status

Both requested font hashes match. See [font provenance](../fonts/PROVENANCE.md) for the upstream comparison.

The Full Build Brief, Revised Section 1, Qualification Addendum, and verification requirements were absent from the workspace. The approved standalone scripts, project structure, and four-root verification procedure depend on those materials. No application tests or hello-world renders ran.

## Handoff received

`CLAUDE_HANDOFF.txt` was supplied and read in full. The revised setup requires Poppler in WSL and directs a stop if it is missing. The sandboxed WSL probe returned `Wsl/E_ACCESSDENIED`. The authorized retry of `wsl --exec sh -c 'command -v pdfinfo && command -v pdffonts && command -v pdftoppm'` exited 1 with no output, so `pdfinfo` was unavailable on WSL's PATH and the chained checks for the other two tools did not run. No render commands ran. The handoff directs the owner to run `wsl sudo apt-get install -y poppler-utils`.

## Four-root hello-world

After the owner installed Poppler, the offline Hyper Elements CLI rendered Page, Canvas, and Email into `out/hello/`. Its Document worker failed with `ERR_PACKAGE_PATH_NOT_EXPORTED` for `@react-pdf/hyphenate/en-us`. The installed Textkit imports that subpath, and the installed Hyphenate package exposes it under the ESM import condition. Running the public Hyper Elements `renderPdf` API through native ESM produced `out/hello/document.pdf` with no diagnostics and with the same pinned packages. WSL Poppler confirmed one A4 page with embedded Lato Regular as the sole font and generated `out/hello/document.png`.

The supported Hyper Elements `check --rendered --json --timeout 10000` invocation exited 0 for all four fixtures with 0 errors and 2 warnings (missing language on Page and Email), plus one informational diagnostic for Email preview-text length. The CLI render exited 1 with 1 error and 2 warnings. Core tests and CP1 checks have not run.

Before implementing the ledger parser, Claude needs to resolve the expected results for the first two decimal test inputs. Section 2 allows positive decimal strings up to the currency precision. Section 4 lists `"15000", "15000.5", "15000.505" rejected`, which can attach “rejected” to the whole list or only the last input. These readings produce different acceptance tests for money.

## Claude's final rulings

R1 resolved decimal parsing. Two-minor-unit currencies accept `15000`, `15000.5`, and `15000.50` and reject fractions with more than two decimal places, including trailing zeros. The core tests cover every R1 example, the amount and CSV row limits, and the safe-integer boundary.

## Known limitations

The hello-world CLI Document worker returned this exact error:

```text
Package subpath './en-us' is not defined by "exports" in <repository root>\node_modules\@react-pdf\hyphenate\package.json
```

Production statements use the public `validate` and `renderPdf` APIs in native Node ESM. The CP1 CLI check covers Page, Canvas, and Email. The optional compatibility experiment was skipped because the approved API path works with the installed dependencies.

### Hello-world diagnostics and disposition

| Run | Severity and code | Exact message | Disposition |
| --- | --- | --- | --- |
| CLI check | Warning, `page/lint-lang` | The Page has no lang, so screen readers guess its language | Set `lang="en"` in the owner ledger. |
| CLI check | Warning, `email/lint-lang` | The Email has no lang, so screen readers guess its language | Set `lang="en"` in the receipt. |
| CLI check | Info, `email/lint-preview-text` | The Email's previewText is 18 characters ("Hello from OweBook"): inboxes fill the rest with its first words | The production receipt uses a 43-character preview describing the recorded payment. |
| CLI render | Warning, `page/lint-lang` | The Page has no lang, so screen readers guess its language | Addressed in the owner ledger as above. |
| CLI render | Warning, `email/lint-lang` | The Email has no lang, so screen readers guess its language | Addressed in the receipt as above. |

The CLI render also repeated the informational preview-text message verbatim. The hello-world fixtures remain available as setup evidence.

## CP1 verification

### Day 2 currency verification

USD and JPY rendered all four roots. Each had three one-page A4 statements with only Lato Regular and Bold embedded. In the statement rasters and Canvas PNGs, USD showed `$1,100.25` and JPY showed `¥1,100` without decimals. The Python comparison returned zero differences across three customers in each dataset. The parser and formatter tests cover zero and three minor units, and the existing F1 test rejects a four-character symbol.

The three-decimal Arabic KWD probe used `د.ك`. The Canvas displayed boxed missing glyphs and incorrect digit order. The PDF raster also showed malformed currency text. The symbol must be a character the bundled Lato includes; otherwise use the ISO code as the symbol. KWD was a glyph probe and is excluded from the tested currency list.

### WSL Node 20 recovery

At code commit `db5d3748c2ac4cc38008fc23c65d82b163394e3a`, WSL Node 20.20.2 with npm 10.8.2 completed `npm ci`. npm installed 101 packages, audited 102 packages, and reported six moderate severity vulnerabilities. No audit remediation or dependency version changes were applied. The subsequent verification failed when Node received the literal path `tests/*.test.ts`. The verification launcher now enumerates the files and passes each test path directly.

- The Windows `npm.cmd run verify` run passed. It exercised 31 tests, typechecking, five contrast pairs, the sample build, CLI checks for Page/Canvas/Email, public API validation for all eight Documents, WSL Poppler, and Chromium screenshots.
- The sample build recorded 29 rendering or validation results with 65 informational findings. The findings cover small labels, classic Outlook spacing, and email-client font degradation. Full findings are in `out/sample/evidence/diagnostics.json`; the CLI's separate findings are in `out/sample/evidence/hyper-elements-check.jsonl`.
- The sample input generated its own ledger warnings for the two fictional-data label columns and the deliberately excluded post-as-of transaction.
- Poppler verified one A4 page per statement, embedded Lato Regular and Bold only, and the naira symbol in every statement. Chromium loaded local Lato and measured no horizontal overflow in the ledger at 390 or 1280 pixels or the receipt at 390 or 600 pixels.
- CP1 evidence covers the fictional sample. Stress fixtures, fresh-clone verification, and email-client screenshots remain pending.

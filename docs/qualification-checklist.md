# Qualification checklist

| Requirement | Status | Evidence |
| --- | --- | --- |
| Meaningful Hyper Elements use in Page, Document, Canvas, and Email | PASS locally | [Templates](../templates), [shared theme](../kit/theme.ts), [CLI and verification](evidence/windows-complete.txt), [Document validation](evidence/diagnostics-sample.json) |
| Public GitHub repository containing the complete source | PENDING | Local source is committed. Public visibility and release contents await authorization. |
| README has the three required headings | PASS locally | [README](../README.md) |
| README preview uses approved rendered screenshots | PASS locally | [README previews](../README.md#preview) and [byte-identical regeneration evidence](evidence/d10b-assets-sha256.json). |
| README explains Hyper Elements implementation | PASS locally | [Implementation](../README.md#hyper-elements-implementation) |
| README supplies working setup and run steps | PASS locally | [Setup](../README.md#setup-instructions), [fresh WSL clone](evidence/wsl-portable.txt), [Windows verification](evidence/windows-complete.txt), [WSL full verification](evidence/wsl-complete.txt) |
| Required Hyper Elements repository star | PENDING | Owner confirmation is pending. |
| Approved emulated email previews | PASS locally | [Gmail and Outlook.com captures](../README.md#preview) and [emulator findings](evidence/d10b-email-preview-findings.json). Classic Outlook 390 px is excluded. |
| Stress layout verification | PASS locally | [PDF gutter](evidence/pdf-gutter.json), [stress inspection](evidence/wsl-complete.txt) |
| CP1 acceptance | PASS | Claude accepted CP1 in the owner’s Day 2 authorization. |
| Submission | PENDING | [Draft form fields](submission.md). |

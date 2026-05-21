# Email DNS Configuration — conversionops.in

This document lists the DNS records required to ensure deliverability of transactional email (magic links, agent alerts, lead notifications) from `noreply@conversionops.in` via Resend. Without these, Gmail and Outlook will route messages to spam or reject them outright.

## Provider
- **Sender service:** Resend (https://resend.com)
- **Sending domain:** `conversionops.in`
- **From address:** `ConversionOps <noreply@conversionops.in>`
- **Reply-to:** `hello@conversionops.in`

---

## Required DNS records

Add all of the following records at your DNS host (Cloudflare, Route53, etc.). Resend will surface the exact selector values in the dashboard after you add the domain — replace `<resend-selector>` and `<resend-key>` placeholders below with those values.

### 1. SPF — authorizes Resend to send on behalf of the domain

| Type | Host | Value | TTL |
|------|------|-------|-----|
| TXT  | `@` (root) | `v=spf1 include:amazonses.com ~all` | 3600 |

Notes:
- Resend uses Amazon SES under the hood, hence `include:amazonses.com`.
- If you already have an SPF record at the apex, merge — do not create a second TXT. Multiple SPF records cause a permanent fail in some validators.

### 2. DKIM — cryptographically signs outbound mail

Resend generates a unique DKIM key per domain. Add the CNAME records Resend shows in the dashboard, typically:

| Type  | Host                              | Value                                          | TTL |
|-------|-----------------------------------|------------------------------------------------|-----|
| CNAME | `<selector>._domainkey`           | `<selector>.dkim.amazonses.com`                | 3600 |

(Resend may also instruct you to add a second selector for rotation — add both.)

### 3. DMARC — instructs receivers what to do on auth failure

| Type | Host       | Value | TTL |
|------|------------|-------|-----|
| TXT  | `_dmarc`   | `v=DMARC1; p=quarantine; rua=mailto:dmarc@conversionops.in; ruf=mailto:dmarc@conversionops.in; pct=100; aspf=s; adkim=s` | 3600 |

Notes:
- Start with `p=quarantine` for the first 2 weeks to monitor reports.
- After confirming no legitimate mail is failing, upgrade to `p=reject`.
- The `dmarc@conversionops.in` mailbox must exist (forwarders to ops team are fine).

### 4. MX — required for receiving bounces and DMARC reports

If you do not already host email on conversionops.in, point MX to a receiving service (e.g., Google Workspace, Fastmail, or a forwarding service):

| Type | Host | Priority | Value | TTL |
|------|------|----------|-------|-----|
| MX   | `@`  | 1        | `smtp.google.com.` (example) | 3600 |

### 5. Return-Path (MAIL FROM) — recommended

Resend may instruct you to set up a subdomain MAIL FROM (e.g., `bounce.conversionops.in`) to align Return-Path with the visible From. Add the records Resend shows in the dashboard.

### 6. BIMI (optional, post-launch) — adds logo in Gmail/Yahoo inbox

| Type | Host                         | Value | TTL |
|------|------------------------------|-------|-----|
| TXT  | `default._bimi`              | `v=BIMI1; l=https://conversionops.in/logo.svg; a=https://conversionops.in/vmc.pem` | 3600 |

Requires a Verified Mark Certificate (VMC) from a CA like DigiCert. Defer until after launch.

---

## Verification checklist

After DNS propagates (5 – 30 min), run these checks:

```bash
# SPF
dig TXT conversionops.in +short
# Expect: "v=spf1 include:amazonses.com ~all"

# DKIM (replace selector)
dig CNAME <selector>._domainkey.conversionops.in +short

# DMARC
dig TXT _dmarc.conversionops.in +short
# Expect: "v=DMARC1; p=quarantine; ..."
```

Online verifiers:
- https://www.mail-tester.com (send a magic link to the test address, target score >= 9/10)
- https://dmarcian.com/dmarc-inspector/
- https://mxtoolbox.com/SuperTool.aspx

Send-side checks (in Resend dashboard):
- Domain status: **Verified** (green)
- DKIM: **Verified**
- SPF: **Verified**
- DMARC: **Verified**

---

## Application-side rules already in place

The `ResendClient` in `packages/integrations/src/comms/resend/index.ts` already handles the Gmail / Outlook deliverability rules:

- **Table-based HTML layout** (Outlook does not support flexbox/grid).
- **Inline styles only** — no `<style>` blocks or external stylesheets.
- **Plain-text fallback** included on every send.
- **From name** is set (`ConversionOps <noreply@conversionops.in>`), not just the address.
- **No image-only content** — every email has a text-equivalent and visible link fallback.
- **`X-Entity-Ref-ID` header** on magic links to prevent Gmail from threading the messages.
- **600 px max width** for desktop client compatibility.
- **Unsubscribe link** in the footer pointing to the privacy policy (CAN-SPAM / GDPR alignment).

---

## Sanity test plan before going live

1. Add the records above and wait for Resend to mark the domain Verified.
2. Send a magic link to a personal Gmail address — confirm it lands in **Primary**, not Promotions or Spam.
3. Send a magic link to a personal Outlook.com / Live address — confirm it lands in the inbox.
4. Send a magic link to an Apple Mail (iCloud) address — confirm rendering and link click works on iOS.
5. Reply to the magic-link email — verify the reply routes to `hello@conversionops.in`.
6. Run `mail-tester.com` once more and confirm score >= 9/10.

If any of the above fails, do **not** ship — deliverability problems compound the longer they persist (sender reputation decays). Fix DNS, wait 24 hours, and re-test.

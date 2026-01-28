## Business model: URL → Verified Onboarding Draft + Assistant Context Pack

### What we sell

A **multi-tenant onboarding intelligence layer** for SaaS companies:

- Admins define a **schema** (fields + instructions).
- Customers paste a **website URL**.
- We generate an **auto-filled draft** with **per-field citations** (evidence-first).
- Customer reviews/edits once → confirm.
- We **export** the confirmed payload via webhook/API (and optionally a “context pack” for AI assistants).

---

# 1) Ideal customers and wedges

### Primary wedges (sell whichever hits first)

1. **Implementation-heavy B2B SaaS**
   Goal: reduce onboarding calls + form time; standardize intake; fewer “missing details” loops.

2. **AI SaaS startups building assistants/agents**
   Goal: “make the assistant useful on day 1” with a verified customer context pack.

3. **Security/compliance/vendor-risk adjacent** (where intake = questionnaires)
   Goal: only claim what’s verifiable; speed up “company profile / public evidence” portion.

### Buyer personas

- Head of CS / Implementation (pain: labor + time-to-value)
- Product (pain: activation)
- Applied AI engineer (pain: structured, safe customer context)
- RevOps (secondary: CRM completeness)

---

# 2) Pricing strategy

### Pricing principle

**Value-based + usage-based.**
This saves _hours_ of human onboarding time and reduces customer friction, so pricing should map to:

- **How many customers you onboard per month** (predictable)
- **How deep each run is** (pages/fields)

Most adjacent categories already condition buyers to **credit-based** pricing:

- Clay is monthly subscription + credits (e.g., Starter listed at **$134/mo** on their pricing page). ([Clay][1])
- Browse AI is monthly subscription + credits (e.g., **$48/mo** Personal; **$87/mo** Professional, plus a Premium starting point). ([browse.ai][2])
- Diffbot prices by plan/credits (e.g., **$299/mo**, **$899/mo** tiers shown). ([Diffbot][3])
- Rocketlane is priced per seat/month (e.g., Essential **$19/user/mo** billed annually; higher tiers listed). ([rocketlane.com][4])

So we’ll use: **platform subscription + onboarding runs**, with optional add-ons.

---

# 3) Proposed packaging & pricing (reasonable + competitive)

## Core metric: “Onboarding Run”

1 run = generate one draft for one customer domain, up to:

- **25 pages crawled** (HTML fetch, no JS render)
- **75 schema fields extracted**
- Evidence-first citations included

Additional pages/fields cost overage (keeps your COGS safe).

### Free (for adoption)

- **$0**
- 3 runs / month
- 1 schema, 1 seat
- Draft + citations + manual export (download JSON/CSV)

### Starter (AI startups + small B2B SaaS)

- **$99 / month**
- 30 runs / month
- 3 schemas, up to 3 seats
- Webhook export (1 destination), basic audit log
- Email notifications

### Growth (default “real SaaS” tier)

- **$299 / month**
- 150 runs / month
- 10 schemas, up to 10 seats
- Webhook export (3 destinations)
- “Context Pack” output (JSON + sources bundle) enabled
- Re-run/refresh drafts (manual trigger)

### Pro (mid-market + onboarding teams)

- **$799 / month**
- 600 runs / month
- Unlimited schemas, unlimited seats
- Role-based access + expanded audit logs
- Drift detection (monthly “website changed” checks)
- Priority support

### Enterprise

- **Custom**
- SLA, SSO/SAML, SCIM, data residency, VPC egress allowlists
- Custom crawl limits, dedicated support channel

### Overage (simple and predictable)

- Extra runs:
  - Starter **$3/run**
  - Growth **$2/run**
  - Pro **$1/run**

- “Deep crawl” overage: **$0.10 per extra page** beyond included limit
- High-field schemas overage: **$0.05 per extra field** beyond included limit

**Why these numbers are reasonable:** they sit in the same psychological band as workflow/enrichment tools (Clay starting ~$134/mo ([Clay][1]); Diffbot $299/mo tier ([Diffbot][3]); Browse AI $48–$87/mo ([browse.ai][2])) while aligning with the value of saving even **1–3 hours** of CS/implementation labor per onboarding.

---

# 4) Add-ons (optional upsells)

### Assistant Pack (for AI SaaS)

Included in Growth+ above, but could be an add-on if you want cheaper base plans:

- **+$99/mo** to enable:
  - RAG-ready chunks
  - “Allowed claims”/guardrails file (only what’s cited)
  - Tool/function-ready JSON packaging

### Multi-source ingestion (v1+)

- **+$199/mo** per connected source type (Notion/Confluence/Zendesk/Drive)
- Useful once customers ask, “can you also read our docs?”

### Premium deliverability (exports)

- Guaranteed webhook retries + replay UI + signed payloads
- Pro+ included; Starter/Growth add-on **+$49/mo**

---

# 5) Cost model & margins (so pricing holds up)

Your main variable cost is **LLM tokens** (plus bandwidth/storage).

Anthropic’s Claude API pricing (example current public rates) shows:

- Sonnet 4.5: **$3/MTok input** and **$15/MTok output** ([Claude][5])
- Haiku 4.5: **$1/MTok input** and **$5/MTok output** ([Claude][5])

**Practical approach:**

- Use **Haiku** for page classification + extraction of obvious fields
- Use **Sonnet** for final schema extraction + citation alignment

**Back-of-envelope COGS per run (typical)**

- Input tokens dominated by page excerpts; output is structured JSON + short rationales.
- Even if you spend, say, **200k input + 10k output** on Sonnet for the “final extract,” the token cost is still typically **low single dollars** at list rates; often far less with tighter excerpts + caching/batching. (Exact numbers depend on your crawl depth and prompt strategy.) ([Claude][5])

That’s why a $99–$299 base plan with per-run overage can maintain strong gross margins.

---

# 6) Competitive positioning (how we justify premium over “enrichment”)

### Why we’re not “just enrichment”

- Enrichment tools focus on filling CRM records; you’re generating a **customer-confirmed onboarding draft** (with evidence) and **exporting provisioning-ready data**.
- Scrapers/tools sell extraction infrastructure; you sell an end-to-end onboarding outcome.

### Why customers will pay

- **Time-to-value** acceleration: fewer calls, fewer back-and-forths, faster go-live.
- **Trust**: evidence-first citations (critical for security-conscious buyers).
- **AI activation**: assistants fail without context; you provide a verified context contract.

---

# 7) GTM & distribution

### Motions

- **Self-serve** for AI startups + small SaaS (Free → Starter)
- **Sales-assisted** for Growth/Pro (CS leader or Product buyer)
- **Enterprise** for compliance-heavy buyers (security review + SLA)

### Channels

- App marketplaces (HubSpot, Salesforce, onboarding platforms)
- “Assistant pack” partnerships (agent frameworks, AI CS tooling)
- Content wedge: “reduce onboarding time by X%” benchmarks + templates

---

## If you want one refinement that usually increases conversion

Offer **“per onboarding” checkout** as an alternative to monthly:

- e.g., **$9 per run** pay-as-you-go (no subscription), capped features
  This matches buyers who onboard in bursts and avoids “budget committee” friction.

If you tell me your expected customer profile (early-stage AI SaaS vs mid-market implementation-heavy SaaS) and a rough monthly onboarding volume (10 / 50 / 200+), I’ll tune the tier limits and overage rates so they land exactly in the “no-brainer ROI” zone.

[1]: https://www.clay.com/pricing?utm_source=chatgpt.com "Compare plans, features & costs | Clay.com"
[2]: https://www.browse.ai/pricing?utm_source=chatgpt.com "Pricing"
[3]: https://www.diffbot.com/pricing/?utm_source=chatgpt.com "Plans & Pricing"
[4]: https://www.rocketlane.com/pricing?utm_source=chatgpt.com "Rocketlane pricing plans | The best enterprise PSA platform"
[5]: https://platform.claude.com/docs/en/about-claude/pricing?utm_source=chatgpt.com "Pricing - Claude API Docs"

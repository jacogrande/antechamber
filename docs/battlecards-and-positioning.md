## Positioning matrix

### 2×2 market map

**X-axis:** Owns the onboarding workflow (low → high)
**Y-axis:** Extraction intelligence from a URL (low → high)

**High workflow / low extraction**

- **Onboarding platforms** (forms + projects + tasks): Rocketlane Forms collects intake and turns responses into tasks. ([rocketlane.com][1])

**High extraction / low workflow**

- **Web extraction & scraping infrastructure**: Diffbot (automatic web extraction + org data), Apify Actors (scrape/automate). ([Diffbot][2])
- **No-code scrapers**: Browse AI (website → spreadsheet/API). ([browse.ai][3])

**Low workflow / medium extraction**

- **CRM/GTM enrichment**: HubSpot data enrichment adds 40+ attributes and supports property mapping/smart properties. ([hubspot.com][4])
- **Form enrichment for inbound leads**: Apollo “form enrichment” keeps forms short while enriching submissions. ([knowledge.apollo.io][5])
- **Technographics**: Wappalyzer + BuiltWith focus on technology stacks + some company/contact metadata. ([wappalyzer.com][6])

**High workflow / high extraction**

- **Your category**: “URL → schema-driven onboarding draft → citations + review → provisioning-ready export,” plus optional **assistant-ready context pack** (RAG + JSON).

---

## Feature positioning matrix (what matters in deals)

| Capability that wins deals                                               | Your product             | CRM/GTM enrichment (HubSpot/Clearbit-style)                     | GTM workflows (Clay)                                                 | Lead form enrichment (Apollo)                  | Onboarding platforms (Rocketlane)                       | Web extraction infra (Diffbot)            | Scraping platforms (Apify/Browse AI)     | Technographics (BuiltWith/Wappalyzer) |
| ------------------------------------------------------------------------ | ------------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------- | ----------------------------------------- | ---------------------------------------- | ------------------------------------- |
| **Custom onboarding schema** (nested, validations, conditional fields)   | **Yes (core)**           | Limited to CRM properties/mapping ([HubSpot Knowledge Base][7]) | Flexible workflows, not onboarding-native ([university.clay.com][8]) | Focus on lead forms ([knowledge.apollo.io][5]) | Forms customizable (manual entry) ([rocketlane.com][1]) | You build it                              | You build it                             | Not the focus                         |
| **Evidence-first outputs** (per-field citations, “unknown if no source”) | **Yes (differentiator)** | Usually not customer-facing evidence                            | DIY                                                                  | Not the focus                                  | Not automatic extraction                                | DIY                                       | DIY                                      | Not the focus                         |
| **Customer-facing review UX** (confirm/edit → export)                    | **Yes**                  | Mostly internal CRM ops                                         | Not native                                                           | Not native                                     | Yes (forms), but manual entry ([rocketlane.com][1])     | No                                        | No                                       | No                                    |
| **Minimal follow-up questions** (only missing fields)                    | **Yes**                  | No                                                              | DIY                                                                  | No                                             | Manual                                                  | DIY                                       | DIY                                      | No                                    |
| **Provisioning-ready** (handoff to tasks/config/CRM)                     | **Yes**                  | CRM only                                                        | Workflow output, not provisioning-native                             | CRM/lead workflows                             | Tasks/projects yes ([rocketlane.com][1])                | No                                        | No                                       | No                                    |
| **Assistant-ready context pack** (JSON + RAG corpus + guardrails)        | **Yes (wedge)**          | Not designed for assistants                                     | Possible with effort                                                 | No                                             | No                                                      | Possible, you build layers ([Diffbot][9]) | Possible, you build layers ([Apify][10]) | No                                    |
| **Continuous refresh + drift alerts**                                    | Strong roadmap           | Sometimes record updates                                        | Possible                                                             | No                                             | No                                                      | Extract/refresh possible                  | Possible                                 | Some signals                          |

---

# Competitive battlecards

## 1) HubSpot Data Enrichment (Breeze) / Clearbit-style enrichment

**What they do**

- Enrich contact/company records with many attributes and let you map enrichment properties; HubSpot also supports “smart properties” filled by Breeze. ([hubspot.com][4])

**Where they win**

- Your buyer is **RevOps** and the goal is “fill CRM fields fast.”
- They want a **single-system** solution inside HubSpot.

**Where they lose vs you**

- Not an **onboarding workflow** (no customer review flow; not “complete the intake and provision setup”).
- Weak on **deep, custom, schema-driven onboarding fields** (implementation-specific, nested objects, conditional requirements).
- Not designed for “assistant context pack + guardrails.”

**Your talk track**

- “HubSpot enrichment makes CRM records nicer. We make onboarding _complete_—schema + evidence + customer confirmation + downstream provisioning.”

**How to win the deal**

- Start by integrating to HubSpot as a destination: you _complement_ enrichment.
- Pitch “reduce onboarding calls + forms,” not “enrich records.”

**Trap questions to qualify**

- “Do you need the customer to confirm the extracted info before it’s used for setup?”
- “Do onboarding answers need evidence/citations for security/compliance?”

---

## 2) Clay (enrichment + AI workflows)

**What they do**

- Enrich companies by domain and orchestrate multi-step enrichment “recipes/workflows.” ([Clay][11])

**Where they win**

- Power users who love spreadsheets/workflows.
- Teams doing **GTM ops** (prospecting lists, research at scale).

**Where they lose vs you**

- Not built as a **customer-facing onboarding intake** product.
- Governance (schema versioning, field QA, evidence-first UX) is not the primary surface area.
- Harder to make “customer-confirmed onboarding draft” feel magical.

**Your talk track**

- “Clay is great for internal GTM research. We’re a purpose-built onboarding and assistant-context ingestion layer—URL in, customer-confirmed schema out.”

**How to win**

- Sell to CS/Product, not GTM.
- Offer Clay as an integration (“push confirmed context pack into Clay if you want”).

**Trap questions**

- “Is the output used to configure the customer’s account automatically?”
- “Do you need a review step your customer sees?”

---

## 3) Apollo Form Enrichment

**What they do**

- Keeps lead capture forms short while enriching submissions with Apollo data. ([knowledge.apollo.io][5])

**Where they win**

- Inbound lead capture + routing use cases.
- Sales wants better lead records without longer forms.

**Where they lose vs you**

- It’s **pre-sales** oriented, not post-sale onboarding.
- Doesn’t handle deep onboarding schemas, evidence-first citations, or provisioning workflows.

**Your talk track**

- “Apollo enriches leads; we complete onboarding intake and generate an assistant-ready context pack.”

**How to win**

- Position as post-sale “implementation acceleration.”
- If they already use Apollo, integrate/ingest Apollo firmographics as an auxiliary source.

**Trap questions**

- “Is this data used to provision environments, permissions, integrations, or project plans?”
- “Is the bottleneck sales conversion—or implementation time-to-value?”

---

## 4) Rocketlane Forms (and onboarding platforms)

**What they do**

- Native forms to collect intake/handoff/surveys and convert responses into tasks/projects. ([rocketlane.com][1])

**Where they win**

- Companies that already standardized onboarding as projects.
- Buyers who want process + collaboration + visibility.

**Where they lose vs you**

- Intake is still **manual** (customer typing answers).
- No “URL → auto-filled draft with citations,” which is your magic moment.

**Your talk track**

- “Rocketlane is the system of record for onboarding projects. We’re the intelligence layer that auto-completes the intake and creates cleaner tasks faster.”

**How to win**

- Don’t replace Rocketlane—**integrate**: push confirmed fields into Rocketlane tasks/intake objects.

**Trap questions**

- “How many hours are spent just collecting basics that already exist on the customer’s website?”
- “How often do forms come back incomplete or inconsistent?”

---

## 5) Diffbot (web extraction + knowledge graph)

**What they do**

- Automatic extraction from webpages and organization data at scale; provides extraction APIs. ([Diffbot][2])

**Where they win**

- Teams that want **infrastructure** to build their own data products.
- Large-scale crawling, knowledge graph needs.

**Where they lose vs you**

- Not an onboarding product: no schema UX, customer review flow, follow-up questions, provisioning integrations.
- You’d still need to build the entire onboarding layer around it.

**Your talk track**

- “Diffbot is a great engine. We’re the turnkey onboarding and assistant-context product: schema config, evidence UX, confirmations, integrations, governance.”

**How to win**

- If needed, you can even use Diffbot under the hood later—customers buy outcomes, not extraction plumbing.

**Trap questions**

- “Do you want an API to build on, or a drop-in onboarding product your CS team can run next week?”

---

## 6) DIY scraping stacks: Apify / Browse AI

**What they do**

- Apify: Actors to scrape/automate, run in cloud/local. ([Apify][10])
- Browse AI: no-code “websites to spreadsheets/APIs,” monitoring, integrations. ([browse.ai][3])

**Where they win**

- Engineering teams who want maximum control and accept maintenance.
- One-off extraction needs.

**Where they lose vs you**

- The **hard part isn’t scraping**—it’s schema governance, evidence-first UX, customer review, and integration into onboarding/provisioning.
- Ongoing brittleness and QA burden lands on the customer.

**Your talk track**

- “You can scrape anything. The expensive part is turning it into a trustworthy onboarding system with schema/versioning, citations, follow-ups, and exports. That’s what we productize.”

**How to win**

- Offer a “Build vs Buy” calculator: hours saved + reduced onboarding churn + reduced engineer maintenance.

**Trap questions**

- “Who owns breakage and QA when websites change?”
- “Do you need customer-confirmed outputs and audit logs?”

---

## 7) Technographics: BuiltWith / Wappalyzer

**What they do**

- BuiltWith: tech lookup + lead generation; has a Domain API for technology info/metadata. ([BuiltWith][12])
- Wappalyzer: tech stack lookup; APIs can include company details/contact metadata. ([wappalyzer.com][6])

**Where they win**

- “What stack do they use?” and prospecting/lead list workflows.
- Routing SDR outreach based on tech.

**Where they lose vs you**

- They don’t produce onboarding schemas, customer review flows, or assistant-ready context packs.
- Little/no evidence-first onboarding UX.

**Your talk track**

- “They tell you what tools a site uses. We turn a URL into a verified onboarding profile and assistant context pack.”

---

## Your differentiation pillars (the 3 things to repeat everywhere)

1. **Schema-first onboarding**: you define _your_ onboarding fields (nested, conditional, validated).
2. **Evidence-first trust layer**: per-field citations + “unknown if no source” (anti-hallucination).
3. **Provisioning + assistant readiness**: customer-confirmed outputs that power onboarding workflows _and_ AI assistants.

---

[1]: https://www.rocketlane.com/forms?utm_source=chatgpt.com "Rocketlane forms | Collect client onboarding and project ..."
[2]: https://www.diffbot.com/?utm_source=chatgpt.com "Diffbot | Knowledge Graph, AI Web Data Extraction and Crawling"
[3]: https://www.browse.ai/?utm_source=chatgpt.com "Browse AI: Scrape and Monitor Data from Any Website with ..."
[4]: https://www.hubspot.com/products/crm/data-enrichment?utm_source=chatgpt.com "Data Enrichment"
[5]: https://knowledge.apollo.io/hc/en-us/articles/37944366290189-Use-Form-Enrichment-to-Capture-More-Leads-with-Deeper-Insights?utm_source=chatgpt.com "Use Form Enrichment to Capture More Leads with Deeper ..."
[6]: https://www.wappalyzer.com/?utm_source=chatgpt.com "Wappalyzer: Find out what websites are built with"
[7]: https://knowledge.hubspot.com/records/enrich-your-contact-and-company-data?utm_source=chatgpt.com "Enrich your contact and company data"
[8]: https://university.clay.com/docs/enrichments?utm_source=chatgpt.com "Enrichments - Clay Docs"
[9]: https://www.diffbot.com/products/extract/?utm_source=chatgpt.com "Extract Content From Websites Automatically"
[10]: https://apify.com/?utm_source=chatgpt.com "Apify: Full-stack web scraping and data extraction platform"
[11]: https://www.clay.com/blog/how-to-enrich-a-company-by-using-its-domain?utm_source=chatgpt.com "How to enrich a company using its domain"
[12]: https://builtwith.com/?utm_source=chatgpt.com "BuiltWith Technology Lookup"

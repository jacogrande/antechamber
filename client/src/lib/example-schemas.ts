import type { FieldDefinition } from '@/types/schema'

export interface ExampleSchema {
  id: string
  name: string
  description: string
  category: SchemaCategory
  tags: string[]
  fields: FieldDefinition[]
}

export type SchemaCategory =
  | 'ai'
  | 'sales'
  | 'hr'
  | 'finance'
  | 'customer'
  | 'nonprofit'

export const categoryLabels: Record<SchemaCategory, string> = {
  ai: 'AI Assistant Context',
  sales: 'Sales & Partnerships',
  hr: 'HR & Recruiting',
  finance: 'Finance & Compliance',
  customer: 'Customer Success',
  nonprofit: 'Nonprofit',
}

export const categoryDescriptions: Record<SchemaCategory, string> = {
  ai: 'Context packs for AI assistants and RAG systems',
  sales: 'Qualify leads and assess vendors',
  hr: 'Streamline hiring and onboarding',
  finance: 'KYC verification and due diligence',
  customer: 'Customer intake and onboarding',
  nonprofit: 'Grant applications and donor management',
}

// =============================================================================
// AI ASSISTANT CONTEXT PACKS
// =============================================================================

const aiAssistantContextPack: ExampleSchema = {
  id: 'ai-assistant-context-pack',
  name: 'AI Assistant Context Pack',
  description:
    'Essential customer context for AI assistants. The core fields every AI needs to be useful on day one.',
  category: 'ai',
  tags: ['ai', 'assistant', 'rag', 'context'],
  fields: [
    {
      key: 'company_name',
      label: 'Company Name',
      type: 'string',
      required: true,
      instructions:
        'Extract the official company name. Look in header, footer, or about page.',
    },
    {
      key: 'company_description',
      label: 'Company Description',
      type: 'string',
      required: true,
      instructions:
        'Extract a 1-2 sentence description of what the company does. Use the meta description or about page summary.',
      sourceHints: ['/about'],
    },
    {
      key: 'industry_vertical',
      label: 'Industry Vertical',
      type: 'enum',
      required: true,
      enumOptions: [
        'Technology/SaaS',
        'Healthcare',
        'Financial Services',
        'E-commerce/Retail',
        'Manufacturing',
        'Professional Services',
        'Education',
        'Media/Entertainment',
        'Real Estate',
        'Other',
      ],
      instructions:
        'Classify the primary industry based on products, services, and target market.',
    },
    {
      key: 'products_services',
      label: 'Products & Services',
      type: 'string[]',
      required: true,
      instructions:
        'List the main products or services offered. Extract from products/services page or homepage.',
      sourceHints: ['/products', '/services', '/solutions'],
    },
    {
      key: 'target_audience',
      label: 'Target Audience',
      type: 'string',
      required: true,
      instructions:
        'Describe who the company sells to (e.g., "Enterprise IT teams", "Small business owners", "Healthcare providers").',
    },
    {
      key: 'value_proposition',
      label: 'Value Proposition',
      type: 'string',
      required: true,
      instructions:
        'Extract the main value proposition or tagline. Usually found in hero section or about page.',
    },
    {
      key: 'headquarters_location',
      label: 'Headquarters Location',
      type: 'string',
      required: false,
      instructions: 'Find primary office location from contact page or footer.',
      sourceHints: ['/contact', '/about'],
    },
    {
      key: 'regions_served',
      label: 'Regions Served',
      type: 'string[]',
      required: false,
      instructions:
        'List geographic regions or markets served (e.g., "North America", "EMEA", "Global").',
    },
    {
      key: 'company_size',
      label: 'Company Size',
      type: 'enum',
      required: false,
      enumOptions: ['1-10', '11-50', '51-200', '201-1000', '1001+'],
      instructions:
        'Look for employee count on About page, Careers, or team page. Only extract if explicitly stated.',
      sourceHints: ['/about', '/careers', '/team'],
    },
    {
      key: 'year_founded',
      label: 'Year Founded',
      type: 'number',
      required: false,
      instructions: 'Find founding year from about page or company history.',
      sourceHints: ['/about'],
    },
    {
      key: 'contact_email',
      label: 'Contact Email',
      type: 'string',
      required: false,
      instructions: 'Extract primary contact email from contact page.',
      sourceHints: ['/contact'],
      validation: { regex: '^[^@]+@[^@]+\\.[^@]+$' },
    },
    {
      key: 'contact_phone',
      label: 'Contact Phone',
      type: 'string',
      required: false,
      instructions: 'Extract primary phone number from contact page.',
      sourceHints: ['/contact'],
    },
  ],
}

const brandVoiceContext: ExampleSchema = {
  id: 'brand-voice-context',
  name: 'Brand Voice & Messaging',
  description:
    'Extract brand personality, tone, and messaging guidelines for AI content generation.',
  category: 'ai',
  tags: ['ai', 'content', 'brand', 'copywriting'],
  fields: [
    {
      key: 'company_name',
      label: 'Company Name',
      type: 'string',
      required: true,
      instructions: 'Extract the official company name.',
    },
    {
      key: 'brand_tagline',
      label: 'Brand Tagline',
      type: 'string',
      required: true,
      instructions:
        'Find the primary tagline or slogan from the homepage hero section.',
    },
    {
      key: 'brand_personality',
      label: 'Brand Personality',
      type: 'enum',
      required: true,
      enumOptions: [
        'Professional/Corporate',
        'Friendly/Approachable',
        'Bold/Disruptive',
        'Technical/Expert',
        'Playful/Fun',
        'Luxurious/Premium',
        'Trustworthy/Reliable',
      ],
      instructions:
        'Assess the overall brand personality from tone of copy, imagery, and design.',
    },
    {
      key: 'tone_descriptors',
      label: 'Tone Descriptors',
      type: 'string[]',
      required: true,
      instructions:
        'List 3-5 adjectives that describe the writing tone (e.g., "confident", "empathetic", "direct", "innovative").',
    },
    {
      key: 'key_messages',
      label: 'Key Messages',
      type: 'string[]',
      required: true,
      instructions:
        'Extract the main marketing messages or selling points from homepage and about page.',
    },
    {
      key: 'terminology_glossary',
      label: 'Brand Terminology',
      type: 'string[]',
      required: false,
      instructions:
        'List unique terms, product names, or branded language the company uses.',
    },
    {
      key: 'customer_language',
      label: 'How They Refer to Customers',
      type: 'string',
      required: false,
      instructions:
        'How does the company refer to customers? (e.g., "clients", "members", "partners", "users")',
    },
    {
      key: 'cta_style',
      label: 'CTA Style Examples',
      type: 'string[]',
      required: false,
      instructions:
        'Extract examples of call-to-action text used on the site (e.g., "Get Started", "Book a Demo", "Try Free").',
    },
    {
      key: 'mission_statement',
      label: 'Mission Statement',
      type: 'string',
      required: false,
      instructions: 'Extract the company mission statement from about page.',
      sourceHints: ['/about', '/mission'],
    },
    {
      key: 'differentiators',
      label: 'Key Differentiators',
      type: 'string[]',
      required: false,
      instructions:
        'What makes them different? Extract from "Why us" or competitive positioning sections.',
      sourceHints: ['/why-us', '/about'],
    },
  ],
}

const productCatalogContext: ExampleSchema = {
  id: 'product-catalog-context',
  name: 'Product Catalog Context',
  description:
    'Structured product/service catalog for AI sales and support assistants.',
  category: 'ai',
  tags: ['ai', 'sales', 'support', 'products'],
  fields: [
    {
      key: 'company_name',
      label: 'Company Name',
      type: 'string',
      required: true,
      instructions: 'Extract the official company name.',
    },
    {
      key: 'product_names',
      label: 'Product/Service Names',
      type: 'string[]',
      required: true,
      instructions:
        'List all distinct products or service offerings by name.',
      sourceHints: ['/products', '/services', '/solutions', '/pricing'],
    },
    {
      key: 'product_categories',
      label: 'Product Categories',
      type: 'string[]',
      required: false,
      instructions:
        'List how products are categorized (e.g., "Analytics", "Automation", "Integrations").',
    },
    {
      key: 'pricing_model',
      label: 'Pricing Model',
      type: 'enum',
      required: true,
      enumOptions: [
        'Subscription/SaaS',
        'One-time Purchase',
        'Usage-based',
        'Freemium',
        'Custom/Enterprise',
        'Contact for Pricing',
      ],
      instructions: 'Identify the primary pricing model from pricing page.',
      sourceHints: ['/pricing'],
    },
    {
      key: 'pricing_tiers',
      label: 'Pricing Tier Names',
      type: 'string[]',
      required: false,
      instructions:
        'List pricing tier names if available (e.g., "Starter", "Pro", "Enterprise").',
      sourceHints: ['/pricing'],
    },
    {
      key: 'free_trial_available',
      label: 'Free Trial Available',
      type: 'boolean',
      required: false,
      instructions:
        'Check if a free trial is offered. Look for "free trial", "try free", "14-day trial".',
      sourceHints: ['/pricing', '/'],
    },
    {
      key: 'key_features',
      label: 'Key Features',
      type: 'string[]',
      required: true,
      instructions:
        'List the main features highlighted on the features or product pages.',
      sourceHints: ['/features', '/products'],
    },
    {
      key: 'integrations',
      label: 'Integrations',
      type: 'string[]',
      required: false,
      instructions:
        'List third-party integrations mentioned (e.g., "Salesforce", "Slack", "Zapier").',
      sourceHints: ['/integrations'],
    },
    {
      key: 'use_cases',
      label: 'Use Cases',
      type: 'string[]',
      required: false,
      instructions:
        'Extract specific use cases or workflows the product supports.',
      sourceHints: ['/use-cases', '/solutions'],
    },
    {
      key: 'supported_platforms',
      label: 'Supported Platforms',
      type: 'string[]',
      required: false,
      instructions:
        'List platforms supported (e.g., "Web", "iOS", "Android", "Desktop").',
    },
  ],
}

const complianceSecurityContext: ExampleSchema = {
  id: 'compliance-security-context',
  name: 'Compliance & Security Profile',
  description:
    'Security certifications and compliance info for AI assistant guardrails. Only extract what is explicitly stated.',
  category: 'ai',
  tags: ['ai', 'security', 'compliance', 'guardrails'],
  fields: [
    {
      key: 'company_name',
      label: 'Company Name',
      type: 'string',
      required: true,
      instructions: 'Extract the official company name.',
    },
    {
      key: 'security_certifications',
      label: 'Security Certifications',
      type: 'string[]',
      required: true,
      instructions:
        'List security certifications ONLY if explicitly mentioned (SOC 2, ISO 27001, etc.). Do NOT guess.',
      sourceHints: ['/security', '/trust', '/compliance'],
    },
    {
      key: 'compliance_frameworks',
      label: 'Compliance Frameworks',
      type: 'string[]',
      required: false,
      instructions:
        'List compliance frameworks mentioned (GDPR, HIPAA, CCPA, PCI-DSS). Only include if explicitly stated.',
      sourceHints: ['/security', '/privacy', '/compliance'],
    },
    {
      key: 'data_encryption',
      label: 'Data Encryption Mentioned',
      type: 'boolean',
      required: false,
      instructions:
        'Does the security page mention data encryption (at rest or in transit)?',
      sourceHints: ['/security'],
    },
    {
      key: 'sso_supported',
      label: 'SSO Supported',
      type: 'boolean',
      required: false,
      instructions:
        'Is Single Sign-On (SSO) mentioned as a feature? Look for SAML, OAuth, Okta, etc.',
      sourceHints: ['/security', '/features', '/enterprise'],
    },
    {
      key: 'data_residency_options',
      label: 'Data Residency Options',
      type: 'string[]',
      required: false,
      instructions:
        'List data residency or hosting regions if mentioned (e.g., "US", "EU", "Australia").',
      sourceHints: ['/security', '/privacy'],
    },
    {
      key: 'privacy_policy_url',
      label: 'Privacy Policy URL',
      type: 'string',
      required: false,
      instructions: 'Find the URL to the privacy policy page.',
    },
    {
      key: 'terms_of_service_url',
      label: 'Terms of Service URL',
      type: 'string',
      required: false,
      instructions: 'Find the URL to the terms of service page.',
    },
    {
      key: 'security_contact',
      label: 'Security Contact',
      type: 'string',
      required: false,
      instructions:
        'Find security team contact email (e.g., security@company.com).',
      sourceHints: ['/security'],
    },
    {
      key: 'uptime_sla',
      label: 'Uptime SLA',
      type: 'string',
      required: false,
      instructions:
        'Extract uptime guarantee if mentioned (e.g., "99.9% uptime").',
      sourceHints: ['/sla', '/security', '/enterprise'],
    },
  ],
}

const supportContextPack: ExampleSchema = {
  id: 'support-context-pack',
  name: 'Support Context Pack',
  description:
    'Customer context for AI support assistants. Includes support channels, documentation, and common topics.',
  category: 'ai',
  tags: ['ai', 'support', 'helpdesk', 'customer-service'],
  fields: [
    {
      key: 'company_name',
      label: 'Company Name',
      type: 'string',
      required: true,
      instructions: 'Extract the official company name.',
    },
    {
      key: 'support_email',
      label: 'Support Email',
      type: 'string',
      required: false,
      instructions: 'Find the customer support email address.',
      sourceHints: ['/contact', '/support'],
      validation: { regex: '^[^@]+@[^@]+\\.[^@]+$' },
    },
    {
      key: 'support_phone',
      label: 'Support Phone',
      type: 'string',
      required: false,
      instructions: 'Find the customer support phone number.',
      sourceHints: ['/contact', '/support'],
    },
    {
      key: 'support_hours',
      label: 'Support Hours',
      type: 'string',
      required: false,
      instructions:
        'Extract support availability hours (e.g., "24/7", "Mon-Fri 9am-5pm EST").',
      sourceHints: ['/support', '/contact'],
    },
    {
      key: 'help_center_url',
      label: 'Help Center URL',
      type: 'string',
      required: false,
      instructions:
        'Find the URL to knowledge base, help center, or documentation.',
      sourceHints: ['/help', '/support', '/docs'],
    },
    {
      key: 'has_live_chat',
      label: 'Has Live Chat',
      type: 'boolean',
      required: false,
      instructions:
        'Check if live chat support is available. Look for chat widgets or mentions of live chat.',
    },
    {
      key: 'community_forum_url',
      label: 'Community/Forum URL',
      type: 'string',
      required: false,
      instructions: 'Find URL to community forum or discussion board.',
    },
    {
      key: 'status_page_url',
      label: 'Status Page URL',
      type: 'string',
      required: false,
      instructions: 'Find URL to system status page.',
      sourceHints: ['/status'],
    },
    {
      key: 'faq_topics',
      label: 'FAQ Topics',
      type: 'string[]',
      required: false,
      instructions:
        'Extract main FAQ categories or common question topics from help center.',
      sourceHints: ['/faq', '/help'],
    },
    {
      key: 'onboarding_resources',
      label: 'Onboarding Resources',
      type: 'string[]',
      required: false,
      instructions:
        'List getting started guides, tutorials, or onboarding resources mentioned.',
      sourceHints: ['/getting-started', '/docs', '/resources'],
    },
  ],
}

// =============================================================================
// SALES & PARTNERSHIPS
// =============================================================================

const leadQualification: ExampleSchema = {
  id: 'lead-qualification',
  name: 'Lead Qualification',
  description: 'Qualify inbound leads by extracting company size, industry, and buying signals.',
  category: 'sales',
  tags: ['b2b', 'sales'],
  fields: [
    {
      key: 'company_name',
      label: 'Company Name',
      type: 'string',
      required: true,
      instructions: 'Extract the official company name from the website header, footer, or about page.',
    },
    {
      key: 'industry',
      label: 'Industry',
      type: 'enum',
      required: true,
      enumOptions: [
        'Technology',
        'Healthcare',
        'Finance',
        'Manufacturing',
        'Retail',
        'Professional Services',
        'Education',
        'Other',
      ],
      instructions: 'Determine the primary industry based on products, services, and company description.',
    },
    {
      key: 'company_size',
      label: 'Company Size',
      type: 'enum',
      required: true,
      enumOptions: ['1-10', '11-50', '51-200', '201-1000', '1001+'],
      instructions: 'Look for employee count on About, Careers, or LinkedIn.',
    },
    {
      key: 'headquarters_location',
      label: 'Headquarters',
      type: 'string',
      required: false,
      instructions: 'Find the main office location from contact page or footer. Format as "City, Country".',
    },
    {
      key: 'technologies_used',
      label: 'Technologies Used',
      type: 'string[]',
      required: false,
      instructions: 'Identify tech stack from job postings, integrations page, or developer docs.',
      sourceHints: ['/careers', '/integrations', '/developers'],
    },
    {
      key: 'key_decision_makers',
      label: 'Key Decision Makers',
      type: 'string[]',
      required: false,
      instructions: 'Find leadership team members from About or Team page. Focus on C-level and VP titles.',
      sourceHints: ['/about', '/team', '/leadership'],
    },
  ],
}

const vendorAssessment: ExampleSchema = {
  id: 'vendor-assessment',
  name: 'Vendor Assessment',
  description: 'Evaluate potential vendors by extracting capabilities and compliance information.',
  category: 'sales',
  tags: ['procurement', 'vendor'],
  fields: [
    {
      key: 'company_name',
      label: 'Company Name',
      type: 'string',
      required: true,
      instructions: 'Extract the full legal entity name from footer or about page.',
    },
    {
      key: 'year_founded',
      label: 'Year Founded',
      type: 'number',
      required: false,
      instructions: 'Find the founding year from about page or company history.',
    },
    {
      key: 'headquarters_address',
      label: 'Headquarters Address',
      type: 'string',
      required: true,
      instructions: 'Find complete mailing address from contact page or footer.',
    },
    {
      key: 'service_offerings',
      label: 'Service Offerings',
      type: 'string[]',
      required: true,
      instructions: 'List main products or services from the services/products page.',
    },
    {
      key: 'certifications',
      label: 'Certifications',
      type: 'string[]',
      required: false,
      instructions: 'Look for SOC 2, ISO 27001, GDPR, HIPAA, or industry certifications.',
      sourceHints: ['/security', '/trust', '/compliance'],
    },
    {
      key: 'notable_clients',
      label: 'Notable Clients',
      type: 'string[]',
      required: false,
      instructions: 'Extract recognizable client logos or testimonials from homepage.',
    },
  ],
}

// =============================================================================
// HR & RECRUITING
// =============================================================================

const candidateScreening: ExampleSchema = {
  id: 'candidate-screening',
  name: 'Candidate Screening',
  description: 'Pre-screen job applicants by extracting experience and qualifications.',
  category: 'hr',
  tags: ['recruiting', 'hiring'],
  fields: [
    {
      key: 'candidate_name',
      label: 'Candidate Name',
      type: 'string',
      required: true,
      instructions: 'Extract full name from profile.',
    },
    {
      key: 'current_role',
      label: 'Current Role',
      type: 'string',
      required: true,
      instructions: 'Find current or most recent job title.',
    },
    {
      key: 'current_company',
      label: 'Current Company',
      type: 'string',
      required: false,
      instructions: 'Identify current employer.',
    },
    {
      key: 'total_experience_years',
      label: 'Total Experience (Years)',
      type: 'number',
      required: true,
      instructions: 'Calculate total years of professional experience.',
    },
    {
      key: 'highest_education',
      label: 'Highest Education',
      type: 'enum',
      required: false,
      enumOptions: ['High School', 'Associate', 'Bachelor', 'Master', 'PhD', 'Other'],
      instructions: 'Identify highest level of education completed.',
    },
    {
      key: 'technical_skills',
      label: 'Technical Skills',
      type: 'string[]',
      required: false,
      instructions: 'List relevant technical skills and tools.',
    },
    {
      key: 'management_experience',
      label: 'Has Management Experience',
      type: 'boolean',
      required: false,
      instructions: 'Check for people management or leadership roles in work history.',
    },
  ],
}

// =============================================================================
// FINANCE & COMPLIANCE
// =============================================================================

const kycVerification: ExampleSchema = {
  id: 'kyc-verification',
  name: 'KYC Verification',
  description: 'Know Your Customer verification for financial services and compliance.',
  category: 'finance',
  tags: ['kyc', 'compliance'],
  fields: [
    {
      key: 'legal_entity_name',
      label: 'Legal Entity Name',
      type: 'string',
      required: true,
      instructions: 'Extract the full legal company name from official documents or website footer.',
    },
    {
      key: 'entity_type',
      label: 'Entity Type',
      type: 'enum',
      required: true,
      enumOptions: ['Corporation', 'LLC', 'Partnership', 'Sole Proprietorship', 'Nonprofit'],
      instructions: 'Determine business entity type from about page or legal notices.',
    },
    {
      key: 'incorporation_jurisdiction',
      label: 'Incorporation Jurisdiction',
      type: 'string',
      required: true,
      instructions: 'Find state/country of incorporation from footer or terms of service.',
    },
    {
      key: 'primary_business_activity',
      label: 'Primary Business Activity',
      type: 'string',
      required: true,
      instructions: 'Describe the main business activity or industry.',
    },
    {
      key: 'registered_address',
      label: 'Registered Address',
      type: 'string',
      required: true,
      instructions: 'Find official registered business address.',
    },
    {
      key: 'key_principals',
      label: 'Key Principals',
      type: 'string[]',
      required: true,
      instructions: 'List CEO, CFO, and other key executives from leadership page.',
      sourceHints: ['/about', '/team', '/leadership'],
    },
    {
      key: 'publicly_traded',
      label: 'Publicly Traded',
      type: 'boolean',
      required: false,
      instructions: 'Check if company is publicly traded. Look for stock ticker or investor relations.',
    },
  ],
}

const investorDueDiligence: ExampleSchema = {
  id: 'investor-due-diligence',
  name: 'Investor Due Diligence',
  description: 'Gather company information for investment evaluation.',
  category: 'finance',
  tags: ['investment', 'startup'],
  fields: [
    {
      key: 'company_name',
      label: 'Company Name',
      type: 'string',
      required: true,
      instructions: 'Extract official company name.',
    },
    {
      key: 'founding_year',
      label: 'Founding Year',
      type: 'number',
      required: true,
      instructions: 'Find when the company was founded.',
    },
    {
      key: 'founders',
      label: 'Founders',
      type: 'string[]',
      required: true,
      instructions: 'List founder names from about or team page.',
    },
    {
      key: 'employee_count',
      label: 'Employee Count',
      type: 'number',
      required: false,
      instructions: 'Find current employee count from about or LinkedIn.',
    },
    {
      key: 'business_model',
      label: 'Business Model',
      type: 'enum',
      required: true,
      enumOptions: ['SaaS', 'Marketplace', 'E-commerce', 'Hardware', 'Services', 'Other'],
      instructions: 'Determine primary business model from product and pricing.',
    },
    {
      key: 'target_market',
      label: 'Target Market',
      type: 'enum',
      required: true,
      enumOptions: ['B2B Enterprise', 'B2B SMB', 'B2C', 'B2B2C'],
      instructions: 'Identify primary customer segment.',
    },
    {
      key: 'product_description',
      label: 'Product Description',
      type: 'string',
      required: true,
      instructions: 'Summarize the main product or service offering.',
    },
    {
      key: 'notable_customers',
      label: 'Notable Customers',
      type: 'string[]',
      required: false,
      instructions: 'Find recognizable customer logos or testimonials.',
    },
  ],
}

// =============================================================================
// CUSTOMER SUCCESS
// =============================================================================

const customerOnboarding: ExampleSchema = {
  id: 'customer-onboarding',
  name: 'Customer Onboarding',
  description: 'Gather customer context to personalize onboarding and drive adoption.',
  category: 'customer',
  tags: ['saas', 'onboarding'],
  fields: [
    {
      key: 'company_name',
      label: 'Company Name',
      type: 'string',
      required: true,
      instructions: 'Extract official company name.',
    },
    {
      key: 'industry',
      label: 'Industry',
      type: 'string',
      required: true,
      instructions: 'Determine primary industry from website content.',
    },
    {
      key: 'company_size',
      label: 'Company Size',
      type: 'enum',
      required: true,
      enumOptions: ['1-10', '11-50', '51-200', '201-1000', '1001+'],
      instructions: 'Estimate from about page, careers, or LinkedIn.',
    },
    {
      key: 'tech_stack',
      label: 'Technology Stack',
      type: 'string[]',
      required: false,
      instructions: 'Identify tools and platforms from careers page or job postings.',
      sourceHints: ['/careers', '/jobs', '/integrations'],
    },
    {
      key: 'growth_stage',
      label: 'Growth Stage',
      type: 'enum',
      required: false,
      enumOptions: ['Startup', 'Growth', 'Scale-up', 'Enterprise', 'Mature'],
      instructions: 'Assess growth stage from funding, team size, and market presence.',
    },
    {
      key: 'key_stakeholders',
      label: 'Key Stakeholders',
      type: 'string[]',
      required: false,
      instructions: 'Identify likely product champions from leadership team.',
    },
  ],
}

// =============================================================================
// NONPROFIT
// =============================================================================

const grantApplication: ExampleSchema = {
  id: 'grant-application',
  name: 'Grant Application',
  description: 'Collect nonprofit organization information for grant applications.',
  category: 'nonprofit',
  tags: ['grant', 'nonprofit'],
  fields: [
    {
      key: 'organization_name',
      label: 'Organization Name',
      type: 'string',
      required: true,
      instructions: 'Extract official nonprofit organization name.',
    },
    {
      key: 'mission_statement',
      label: 'Mission Statement',
      type: 'string',
      required: true,
      instructions: 'Extract the organization mission statement.',
      sourceHints: ['/about', '/mission'],
    },
    {
      key: 'year_founded',
      label: 'Year Founded',
      type: 'number',
      required: false,
      instructions: 'Find founding or establishment year.',
    },
    {
      key: 'cause_areas',
      label: 'Cause Areas',
      type: 'string[]',
      required: true,
      instructions: 'List primary cause areas (education, health, environment, etc.).',
    },
    {
      key: 'geographic_focus',
      label: 'Geographic Focus',
      type: 'string[]',
      required: false,
      instructions: 'Identify regions or communities served.',
    },
    {
      key: 'programs_offered',
      label: 'Programs Offered',
      type: 'string[]',
      required: true,
      instructions: 'List main programs or initiatives.',
      sourceHints: ['/programs', '/what-we-do'],
    },
    {
      key: 'leadership_team',
      label: 'Leadership Team',
      type: 'string[]',
      required: false,
      instructions: 'List executive director and key leadership.',
      sourceHints: ['/team', '/leadership'],
    },
  ],
}

// =============================================================================
// EXPORT ALL SCHEMAS
// =============================================================================

export const exampleSchemas: ExampleSchema[] = [
  // AI Assistant Context Packs (featured)
  aiAssistantContextPack,
  brandVoiceContext,
  productCatalogContext,
  complianceSecurityContext,
  supportContextPack,
  // Sales & Partnerships
  leadQualification,
  vendorAssessment,
  // HR & Recruiting
  candidateScreening,
  // Finance & Compliance
  kycVerification,
  investorDueDiligence,
  // Customer Success
  customerOnboarding,
  // Nonprofit
  grantApplication,
]

export function getSchemasByCategory(category: SchemaCategory): ExampleSchema[] {
  return exampleSchemas.filter((schema) => schema.category === category)
}

export function getSchemaById(id: string): ExampleSchema | undefined {
  return exampleSchemas.find((schema) => schema.id === id)
}

export function searchSchemas(query: string): ExampleSchema[] {
  const lowerQuery = query.toLowerCase()
  return exampleSchemas.filter(
    (schema) =>
      schema.name.toLowerCase().includes(lowerQuery) ||
      schema.description.toLowerCase().includes(lowerQuery) ||
      schema.tags.some((tag) => tag.includes(lowerQuery))
  )
}

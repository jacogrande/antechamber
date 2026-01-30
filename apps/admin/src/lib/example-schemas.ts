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
  | 'sales'
  | 'hr'
  | 'finance'
  | 'customer'
  | 'nonprofit'

export const categoryLabels: Record<SchemaCategory, string> = {
  sales: 'Sales & Partnerships',
  hr: 'HR & Recruiting',
  finance: 'Finance & Compliance',
  customer: 'Customer Success',
  nonprofit: 'Nonprofit',
}

export const categoryDescriptions: Record<SchemaCategory, string> = {
  sales: 'Qualify leads and assess vendors',
  hr: 'Streamline hiring and onboarding',
  finance: 'KYC verification and due diligence',
  customer: 'Customer intake and onboarding',
  nonprofit: 'Grant applications and donor management',
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
  leadQualification,
  vendorAssessment,
  candidateScreening,
  kycVerification,
  investorDueDiligence,
  customerOnboarding,
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

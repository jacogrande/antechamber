import { eq, and } from 'drizzle-orm';
import { submissions, schemas, schemaVersions } from '../../db/schema';
import { NotFoundError } from '../errors';
import { validateUrl } from '../crawl/url';
import { runCrawlPipeline } from '../crawl/pipeline';
import { extractAndSynthesize } from '../extraction/facade';
import { parseFieldDefinitions, type FieldDefinition } from '../validation';
import type { StepDefinition, WorkflowDefinition } from './types';

// ---------------------------------------------------------------------------
// Step name constants
// ---------------------------------------------------------------------------

export const STEP_NAMES = {
  VALIDATE: 'validate',
  CRAWL: 'crawl',
  EXTRACT: 'extract',
  PERSIST_DRAFT: 'persist_draft',
} as const;

// ---------------------------------------------------------------------------
// Step: validate
// ---------------------------------------------------------------------------

interface ValidateOutput {
  schemaId: string;
  schemaVersion: number;
  fields: FieldDefinition[];
  websiteUrl: string;
  tenantId: string;
}

export const validateStep: StepDefinition<ValidateOutput> = {
  name: STEP_NAMES.VALIDATE,
  retryPolicy: { maxAttempts: 1, timeoutMs: 10000 },
  async run(ctx) {
    const { db, submissionId, log } = ctx;

    log('Loading submission from database...');
    // Load submission
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId));

    if (!submission) {
      throw new NotFoundError('Submission not found');
    }
    log(`Submission loaded: ${submission.websiteUrl}`);

    // Load schema (tenant-scoped)
    log('Loading schema...');
    const [schema] = await db
      .select()
      .from(schemas)
      .where(
        and(
          eq(schemas.id, submission.schemaId),
          eq(schemas.tenantId, submission.tenantId),
        ),
      );

    if (!schema) {
      throw new NotFoundError('Schema not found');
    }
    log(`Schema loaded: ${schema.name}`);

    // Resolve version (use submission's schemaVersion)
    const [version] = await db
      .select()
      .from(schemaVersions)
      .where(
        and(
          eq(schemaVersions.schemaId, submission.schemaId),
          eq(schemaVersions.version, submission.schemaVersion),
        ),
      );

    if (!version) {
      throw new NotFoundError('Schema version not found');
    }

    const fields = parseFieldDefinitions(version.fields);
    log(`Schema version ${submission.schemaVersion} has ${fields.length} fields`);

    // Validate URL (SSRF prevention, normalization)
    log(`Validating URL: ${submission.websiteUrl}`);
    await validateUrl(submission.websiteUrl);
    log('URL validation passed');

    return {
      schemaId: submission.schemaId,
      schemaVersion: submission.schemaVersion,
      fields,
      websiteUrl: submission.websiteUrl,
      tenantId: submission.tenantId,
    };
  },
};

// ---------------------------------------------------------------------------
// Step: crawl
// ---------------------------------------------------------------------------

interface CrawlOutput {
  origin: string;
  extractedContent: Array<{
    url: string;
    title: string;
    metaDescription: string;
    headings: string[];
    bodyText: string;
    wordCount: number;
    fetchedAt: string;
  }>;
  artifactKeys: Array<{ url: string; rawHtml: string; text: string }>;
  skippedUrls: string[];
  pageCount: number;
}

export const crawlStep: StepDefinition<CrawlOutput> = {
  name: STEP_NAMES.CRAWL,
  retryPolicy: { maxAttempts: 3, timeoutMs: 180000 },
  async run(ctx) {
    const { log } = ctx;
    const validateOutput = ctx.getStepOutput<ValidateOutput>(STEP_NAMES.VALIDATE);

    log(`Starting crawl of ${validateOutput.websiteUrl}`);
    const result = await runCrawlPipeline(
      validateOutput.websiteUrl,
      ctx.runId,
      ctx.storage,
      undefined,
      ctx.fetchFn,
    );

    log(`Crawl complete: ${result.extractedContent.length} pages fetched, ${result.skippedUrls.length} skipped`);
    if (result.skippedUrls.length > 0) {
      log(`Skipped URLs: ${result.skippedUrls.slice(0, 5).join(', ')}${result.skippedUrls.length > 5 ? '...' : ''}`);
    }

    return {
      origin: result.origin,
      extractedContent: result.extractedContent,
      artifactKeys: result.artifactKeys,
      skippedUrls: result.skippedUrls,
      pageCount: result.extractedContent.length,
    };
  },
};

// ---------------------------------------------------------------------------
// Step: extract
// ---------------------------------------------------------------------------

interface ExtractOutput {
  fields: Array<{
    key: string;
    value: unknown;
    confidence: number;
    citations: Array<{
      url: string;
      snippet: string;
      pageTitle?: string;
      retrievedAt: string;
    }>;
    status: string;
    reason?: string;
  }>;
  pageResultCount: number;
  usage: { inputTokens: number; outputTokens: number };
}

export const extractStep: StepDefinition<ExtractOutput> = {
  name: STEP_NAMES.EXTRACT,
  retryPolicy: { maxAttempts: 2, timeoutMs: 300000 },
  async run(ctx) {
    const { log } = ctx;
    const validateOutput = ctx.getStepOutput<ValidateOutput>(STEP_NAMES.VALIDATE);
    const crawlOutput = ctx.getStepOutput<CrawlOutput>(STEP_NAMES.CRAWL);

    log(`Starting LLM extraction for ${validateOutput.fields.length} fields from ${crawlOutput.pageCount} pages`);
    const result = await extractAndSynthesize(
      {
        fields: validateOutput.fields,
        pages: crawlOutput.extractedContent,
      },
      ctx.llmClient,
    );

    const foundCount = result.fields.filter(f => f.confidence > 0 && f.value !== null).length;
    log(`Extraction complete: ${foundCount}/${result.fields.length} fields have values`);

    return {
      fields: result.fields,
      pageResultCount: result.pageResults.length,
      usage: result.usage,
    };
  },
};

// ---------------------------------------------------------------------------
// Step: persist_draft
// ---------------------------------------------------------------------------

interface PersistDraftOutput {
  submissionId: string;
  fieldCount: number;
  status: 'draft';
}

export const persistDraftStep: StepDefinition<PersistDraftOutput> = {
  name: STEP_NAMES.PERSIST_DRAFT,
  retryPolicy: { maxAttempts: 3, timeoutMs: 15000 },
  async run(ctx) {
    const { log } = ctx;
    const extractOutput = ctx.getStepOutput<ExtractOutput>(STEP_NAMES.EXTRACT);

    log(`Persisting ${extractOutput.fields.length} extracted fields to database`);
    log(`Fields: ${JSON.stringify(extractOutput.fields.map(f => ({ key: f.key, value: f.value, status: f.status })))}`);
    await ctx.db
      .update(submissions)
      .set({
        status: 'draft',
        fields: extractOutput.fields,
        updatedAt: new Date(),
      })
      .where(eq(submissions.id, ctx.submissionId));

    log('Submission status updated to draft');

    return {
      submissionId: ctx.submissionId,
      fieldCount: extractOutput.fields.length,
      status: 'draft' as const,
    };
  },
};

// ---------------------------------------------------------------------------
// Assembled workflow
// ---------------------------------------------------------------------------

export const generateOnboardingDraft: WorkflowDefinition = {
  name: 'generate_onboarding_draft',
  steps: [validateStep, crawlStep, extractStep, persistDraftStep],
};

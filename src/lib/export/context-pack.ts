import type { ContextPackResponse, ContextPackSource } from '@/types/api';

interface ExtractedField {
  key: string;
  value: unknown;
  confidence?: number;
  citations?: Array<{
    url?: string;
    snippet?: string;
    title?: string;
  }>;
  status?: string;
}

interface ConfirmedSubmission {
  id: string;
  schemaId: string;
  schemaVersion: number;
  websiteUrl: string;
  fields: ExtractedField[];
  confirmedAt: string | Date;
}

interface CrawlArtifact {
  url: string;
  title?: string;
  retrievedAt: string | Date;
}

const CONTEXT_PACK_VERSION = '1.0.0';

/**
 * Generate a context pack from a confirmed submission.
 * Flattens fields to key-value pairs and deduplicates sources.
 */
export function generateContextPack(
  submission: ConfirmedSubmission,
  artifacts: CrawlArtifact[],
): ContextPackResponse {
  // Flatten fields to key-value pairs
  const fields: Record<string, unknown> = {};
  for (const field of submission.fields) {
    fields[field.key] = field.value;
  }

  // Deduplicate sources across all citations
  const sourceMap = new Map<string, ContextPackSource>();

  for (const field of submission.fields) {
    if (!field.citations) continue;

    for (const citation of field.citations) {
      if (!citation.url) continue;

      const existing = sourceMap.get(citation.url);
      if (existing) {
        // Add snippet if not already present
        if (citation.snippet && !existing.snippets.includes(citation.snippet)) {
          existing.snippets.push(citation.snippet);
        }
      } else {
        // Find matching artifact for title and retrievedAt
        const artifact = artifacts.find((a) => a.url === citation.url);
        sourceMap.set(citation.url, {
          url: citation.url,
          title: citation.title || artifact?.title || '',
          retrievedAt: artifact?.retrievedAt instanceof Date
            ? artifact.retrievedAt.toISOString()
            : artifact?.retrievedAt || new Date().toISOString(),
          snippets: citation.snippet ? [citation.snippet] : [],
        });
      }
    }
  }

  // Also include artifacts that weren't referenced in citations
  for (const artifact of artifacts) {
    if (!sourceMap.has(artifact.url)) {
      sourceMap.set(artifact.url, {
        url: artifact.url,
        title: artifact.title || '',
        retrievedAt: artifact.retrievedAt instanceof Date
          ? artifact.retrievedAt.toISOString()
          : artifact.retrievedAt,
        snippets: [],
      });
    }
  }

  const confirmedAt = submission.confirmedAt instanceof Date
    ? submission.confirmedAt.toISOString()
    : submission.confirmedAt;

  return {
    context: {
      submissionId: submission.id,
      websiteUrl: submission.websiteUrl,
      schemaId: submission.schemaId,
      schemaVersion: submission.schemaVersion,
      fields,
      confirmedAt,
    },
    sources: Array.from(sourceMap.values()),
    metadata: {
      generatedAt: new Date().toISOString(),
      version: CONTEXT_PACK_VERSION,
    },
  };
}

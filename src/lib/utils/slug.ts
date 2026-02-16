/**
 * Generate a URL-friendly slug from a name.
 * Converts to lowercase, replaces spaces/special chars with hyphens,
 * removes consecutive hyphens, and trims leading/trailing hyphens.
 *
 * NOTE: This logic is also used in client/src/pages/setup/OrganizationSetup.tsx
 * for client-side preview. Keep them in sync if modifying.
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

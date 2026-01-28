// ---------------------------------------------------------------------------
// Pure normalization functions — no dependencies
// ---------------------------------------------------------------------------

const US_STATE_ABBREVS: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR',
  california: 'CA', colorado: 'CO', connecticut: 'CT', delaware: 'DE',
  florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID',
  illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS',
  kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS',
  missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM',
  'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND',
  ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA',
  'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD',
  tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV',
  wisconsin: 'WI', wyoming: 'WY', 'district of columbia': 'DC',
};

const STREET_ABBREVS: Record<string, string> = {
  street: 'St', avenue: 'Ave', boulevard: 'Blvd', drive: 'Dr',
  lane: 'Ln', road: 'Rd', court: 'Ct', place: 'Pl',
  circle: 'Cir', trail: 'Trl', way: 'Way', highway: 'Hwy',
  parkway: 'Pkwy', terrace: 'Ter', square: 'Sq',
};

const COMPANY_SUFFIXES = [
  'Inc.', 'Inc', 'LLC', 'Ltd.', 'Ltd', 'Corp.', 'Corp',
  'Co.', 'Co', 'LP', 'LLP', 'PLC', 'GmbH', 'S.A.',
  'AG', 'N.V.', 'Pty', 'Pty.', 'P.C.',
];

/**
 * Normalize a US phone number to +1 (XXX) XXX-XXXX format.
 * International numbers are returned trimmed but otherwise unchanged.
 */
export function normalizePhone(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  const trimmed = value.trim();

  // Strip all non-digit characters
  const digits = trimmed.replace(/\D/g, '');

  // US 10-digit
  if (digits.length === 10) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // US 11-digit starting with 1
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // International or unrecognized — return trimmed original
  return trimmed;
}

/**
 * Escape all regex special characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalize a company name: title case with preserved suffixes.
 */
export function normalizeCompanyName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  const trimmed = value.trim();

  // Find and preserve suffix
  let suffix = '';
  let baseName = trimmed;
  for (const s of COMPANY_SUFFIXES) {
    const pattern = new RegExp(`\\s+${escapeRegex(s)}$`, 'i');
    if (pattern.test(baseName)) {
      suffix = ' ' + s;
      baseName = baseName.replace(pattern, '');
      break;
    }
  }

  // Title case the base name
  const titleCased = baseName
    .split(/\s+/)
    .map((word) => {
      if (!word) return '';
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

  return titleCased + suffix;
}

/**
 * Normalize an address: abbreviate US states and street types.
 */
export function normalizeAddress(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  let result = value.trim().replace(/\s+/g, ' ');

  // Abbreviate street types (word boundary)
  for (const [full, abbr] of Object.entries(STREET_ABBREVS)) {
    const pattern = new RegExp(`\\b${full}\\b`, 'gi');
    result = result.replace(pattern, abbr);
  }

  // Abbreviate US states (word boundary)
  for (const [full, abbr] of Object.entries(US_STATE_ABBREVS)) {
    const pattern = new RegExp(`\\b${full}\\b`, 'gi');
    result = result.replace(pattern, abbr);
  }

  return result;
}

/**
 * Auto-detect field type from key pattern and normalize accordingly.
 */
export function normalizeFieldValue(key: string, value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'string') return value;

  if (/phone|tel|fax/i.test(key)) {
    return normalizePhone(value);
  }
  if (/address|location/i.test(key)) {
    return normalizeAddress(value);
  }
  if (/company.?name/i.test(key)) {
    return normalizeCompanyName(value);
  }

  return value;
}

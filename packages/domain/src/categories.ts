/**
 * Legal-matter categories. The platform funds any matter a person needs a fair
 * hearing on — not only public-interest litigation. Categories are kept broad and
 * label a *type of matter*, never a person's circumstances.
 */

export const VALID_CATEGORIES = [
  // Original PIL-flavoured set (kept for continuity with existing data).
  'CIVIL_LIBERTIES',
  'ENVIRONMENT',
  'LABOR',
  'CONSUMER',
  // Broader matters a fair-hearing platform should accept.
  'HOUSING',
  'FAMILY',
  'DISABILITY',
  'DISCRIMINATION',
  'CRIMINAL_BAIL',
  'DEBT_MONEY',
  'HEALTH',
  'EDUCATION',
  'SOCIAL_SECURITY',
  'LAND',
  'OTHER',
] as const

export type CategoryName = (typeof VALID_CATEGORIES)[number]

export function isCategory(value: string): value is CategoryName {
  return (VALID_CATEGORIES as readonly string[]).includes(value)
}

/**
 * Human-facing short label for each category. Deliberately plain and dignified —
 * the label names the kind of matter, nothing about the person asking.
 */
export const CATEGORY_LABELS: Record<CategoryName, string> = {
  CIVIL_LIBERTIES: 'Rights & liberties',
  ENVIRONMENT: 'Environment',
  LABOR: 'Work & labour',
  CONSUMER: 'Consumer',
  HOUSING: 'Housing & tenancy',
  FAMILY: 'Family',
  DISABILITY: 'Disability & access',
  DISCRIMINATION: 'Discrimination',
  CRIMINAL_BAIL: 'Wrongful detention / bail',
  DEBT_MONEY: 'Debt & money',
  HEALTH: 'Health & care',
  EDUCATION: 'Education',
  SOCIAL_SECURITY: 'Benefits & entitlements',
  LAND: 'Land & property',
  OTHER: 'Other',
}

export function categoryLabel(category: CategoryName): string {
  return CATEGORY_LABELS[category]
}

export const VALID_CATEGORIES = ['CIVIL_LIBERTIES', 'ENVIRONMENT', 'LABOR', 'CONSUMER', 'OTHER'] as const

export type CategoryName = (typeof VALID_CATEGORIES)[number]

export function isCategory(value: string): value is CategoryName {
  return (VALID_CATEGORIES as readonly string[]).includes(value)
}

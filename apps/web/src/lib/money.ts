export function formatRupees(paise: number): string {
  const rupees = paise / 100
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(rupees)}`
}

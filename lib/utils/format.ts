/**
 * Format currency in CAD
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amount);
}


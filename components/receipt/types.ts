export type ReceiptData = {
  productName: string;
  price: number;
  currency: string;
  userName: string;
  userEmail: string;
  orderNumber: number | null;
  paymentMethod: string;
  dateShort: string;
  dateLong: string;
  tps?: string | null;
  tvq?: string | null;
  tpsNumber?: string | null;
  tvqNumber?: string | null;
  /** Formatted discount amount (e.g. "-20,00 $") when coupon applied */
  discount?: string | null;
  /** Coupon code (e.g. "PROMO20") when discount applied */
  couponCode?: string | null;
  /** Original amount before discount; when set, receipt shows subtotal → discount → total */
  originalAmount?: number | null;
  status?: "Payé" | "Échoué" | "Remboursé";
};

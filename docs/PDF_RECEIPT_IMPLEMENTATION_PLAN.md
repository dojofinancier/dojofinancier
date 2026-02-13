# PDF Receipt – Implementation Plan

Users download a **PDF receipt** (not invoice) from their dashboard (Historique des paiements). The receipt is a standard layout with dynamic fields.

---

## Dynamic fields (receipt data)

| Field | Source |
|-------|--------|
| **Product name** | `enrollment.course.title` (course) or cohort title for cohort enrollments |
| **Price** | Final amount: `paymentIntent.amount` (or existing receipt amount) |
| **User name & email** | From `user` (e.g. `firstName`, `lastName`, `email`) |
| **Order number** | `enrollment.orderNumber` (e.g. 5190, 5191…) – add to receipt payload |
| **Mode of payment** | Stripe: `PaymentIntent` → `payment_method` → PaymentMethod (e.g. `card.brand`, `card.last4`) or charge `payment_method_details`; display e.g. "Carte (Visa •••• 4242)" or "Carte" |
| **TPS** (optional) | From payment record or computed tax breakdown |
| **TVQ** (optional) | From payment record or computed tax breakdown |
| **Numéro TPS** (optional) | From business settings (static value) |
| **Numéro TVQ** (optional) | From business settings (static value) |
| **Rabais** (optional) | From discounts/coupons applied to the payment |
| **Statut** (optional) | Derived from Stripe/payment state: `Payé`, `Échoué`, or `Remboursé` |

---

## Recommended approach

1. **Extend receipt data**  
   Add a dedicated `getReceiptDataAction(paymentIntentId)` (or extend `downloadReceiptAction`) that returns the above fields, including **order number**, **optional taxes/discounts/status**, and **payment method** from Stripe.  
   - Receipt number must remain unique and consistent across courses and cohorts.

2. **Server-side PDF generation**  
   One function that takes the receipt payload and returns a PDF buffer using **@react-pdf/renderer**.  
   One **API route** (e.g. `GET /api/receipt/[paymentIntentId].pdf`) that:
   - Ensures the user is authenticated and the payment belongs to them
   - Fetches receipt data and generates the PDF
   - Returns the PDF with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="receipt-{orderNumber}.pdf"`

3. **Dashboard UX**  
   On the payment history list, change (or add) a **“Télécharger reçu (PDF)”** button that requests the API route and triggers download (e.g. link or fetch + blob + temporary `<a download>`).  
   - Error UX: show a toast message when the download fails.

4. **Cohorts**  
   Same receipt payload shape; only product name and amount source change (cohort title + cohort payment). One template accepts “product name + amount” for both courses and cohorts.

5. **Security**  
   Always verify that the enrollment (by `paymentIntentId` or enrollmentId) belongs to the current user before generating or returning the PDF. Return 404 for unauthorized requests and log failures.

6. **Formatting rules**  
   - Amounts are stored in minor units; convert and format with `Intl.NumberFormat("fr-FR", { style: "currency", currency })`.
   - Dates must appear twice: short `dd/MM/yyyy` and long French format (e.g. `10 février 2026`).
   - Ensure time zone is consistent (e.g. business locale or payment timestamp time zone).

7. **Stripe payment method retrieval**  
   Expand `payment_method` (and/or `latest_charge.payment_method_details`) when fetching the PaymentIntent to avoid extra API calls and handle nulls gracefully.

---

## Where and how to edit the receipt template (React-PDF)

### Where the template lives

- **Suggested path:**  
  `components/receipt/receipt-pdf-document.tsx`  
  (or `app/receipt/receipt-pdf-document.tsx` if you prefer it under `app`.)

- This file should:
  - Export a **single React component** that uses only `@react-pdf/renderer` primitives (`Document`, `Page`, `View`, `Text`, `StyleSheet`, etc.).
  - Accept a **props object** with the receipt data (productName, price, userName, userEmail, orderNumber, paymentMethod, date, currency, etc.).
  - Be used only on the server (inside an API route or server action that calls `renderToBuffer()` or `renderToStream()`).

Example structure:

```
docs/
  PDF_RECEIPT_IMPLEMENTATION_PLAN.md   (this file)
components/
  receipt/
    receipt-pdf-document.tsx   ← EDIT THE TEMPLATE HERE
    types.ts                   (optional: ReceiptData type)
app/
  api/
    receipt/
      [paymentIntentId]/
        route.ts               (calls React-PDF, returns PDF response)
```

### How to edit the template

1. **Use only React-PDF components**  
   Import from `@react-pdf/renderer`:
   - `Document`, `Page` – structure
   - `View`, `Text` – layout and text
   - `StyleSheet.create()` – styles (similar to React Native: no CSS classes, no standard CSS)
    - Optional: `Font.register()` for custom fonts, `Image` for logo

2. **Styling**  
   - All styles are inline-like, via `StyleSheet.create()`.  
   - You can define a “theme” at the top of the file (margins, font sizes, colors) and pass it into the styles.  
   - Example: title font size, spacing between sections, a line above the total, etc.

3. **Dynamic content**  
   - The component receives one prop, e.g. `data: ReceiptData`.  
   - Every dynamic field is a `Text` (or nested `View`/`Text`) that uses `data.productName`, `data.price`, `data.userName`, `data.userEmail`, `data.orderNumber`, `data.paymentMethod`, `data.dateShort`, `data.dateLong`, `data.currency`, `data.tps`, `data.tvq`, `data.tpsNumber`, `data.tvqNumber`, `data.discount`, `data.status`, etc.  
   - To change layout or labels (e.g. “Order number” vs “Numéro de commande”), edit the JSX and the strings in this file only.

4. **Layout and structure**  
    - One `Document` → one `Page` (or more if you add a second page later).  
    - Use `View` as blocks (header, customer block, line items, total, footer).  
    - Use `Text` for every piece of text; wrap lines in `Text` when you need line breaks.

5. **Branding**  
   - Add the logo with `Image` and a static asset path. Suggested logo: `public/logo_dark.png`.  
   - Keep logo sizing fixed to avoid layout shifts in the PDF.

5. **No DOM or browser APIs**  
   - The template runs in Node when generating the PDF. Don’t use `window`, `document`, or browser-only hooks.  
   - Keep it a pure function of `data` and React-PDF components.

6. **Previewing while editing**  
    - Option A: Add a **dev-only** route (e.g. `GET /api/receipt/preview`) that builds mock `ReceiptData`, renders the same `receipt-pdf-document.tsx`, and returns the PDF so you can open it in the browser and refresh as you edit.  
    - Option B: Use a small script that imports the component and `renderToBuffer()` and writes the PDF to disk for a quick preview.  
    - Option C: Use Storybook with `@react-pdf/renderer` if you already have it (more setup).
    - Ensure the API route runs on the Node runtime (not Edge) for React-PDF compatibility.

### Minimal template sketch (for reference)

```tsx
// components/receipt/receipt-pdf-document.tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

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
  discount?: string | null;
  status?: "Payé" | "Échoué" | "Remboursé";
};

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 11 },
  title: { fontSize: 18, marginBottom: 20 },
  row: { flexDirection: "row", marginBottom: 8 },
  label: { width: 120 },
  value: { flex: 1 },
});

export function ReceiptPdfDocument({ data }: { data: ReceiptData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Reçu de paiement</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Produit</Text>
          <Text style={styles.value}>{data.productName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Montant</Text>
          <Text style={styles.value}>{data.price.toFixed(2)} {data.currency}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Client</Text>
          <Text style={styles.value}>{data.userName} – {data.userEmail}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Numéro de commande</Text>
          <Text style={styles.value}>{data.orderNumber ?? "—"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Mode de paiement</Text>
          <Text style={styles.value}>{data.paymentMethod}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{data.dateShort} ({data.dateLong})</Text>
        </View>
      </Page>
    </Document>
  );
}
```

To change the look of the receipt (labels, order of fields, fonts, spacing), edit this single file and the `styles` / JSX. The API route only needs to pass the same `ReceiptData` shape.

---

## Summary

- **Terminology:** Receipt (reçu), not invoice.
- **Data:** Extend receipt payload with order number, taxes, discounts, and status; keep one shape for both course and cohort.
- **Formatting:** Amounts use `Intl.NumberFormat("fr-FR")`; dates show `dd/MM/yyyy` and long French format.
- **PDF:** Server-side with @react-pdf/renderer; API route returns the PDF; dashboard button triggers download with toast on errors.
- **Template:** One component in `components/receipt/receipt-pdf-document.tsx`; edit that file to change layout, labels, styling, and logo (`public/logo_dark.png`); use only React-PDF primitives and a single `ReceiptData` prop.

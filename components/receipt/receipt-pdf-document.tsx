import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { ReceiptData } from "./types";

const GREEN = "#22c55e";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 11,
    flexDirection: "column",
  },
  contentWrapper: {
    flex: 1,
  },
  topLine: {
    height: 2,
    backgroundColor: GREEN,
    marginBottom: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 160,
    height: 52,
    objectFit: "contain",
    marginBottom: 8,
  },
  companyLine: {
    fontSize: 9,
    color: "#555",
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  metaSection: {
    marginBottom: 16,
    width: "100%",
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 6,
    width: "100%",
  },
  metaLabel: {
    width: 160,
    minWidth: 160,
    color: "#333",
  },
  metaValue: {
    flex: 1,
    color: "#333",
  },
  metaValueRight: {
    flex: 1,
    color: "#333",
    textAlign: "right",
  },
  greenDivider: {
    height: 1,
    backgroundColor: GREEN,
    marginVertical: 16,
  },
  tableHeader: {
    flexDirection: "row",
    width: "100%",
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: GREEN,
    marginBottom: 8,
  },
  tableHeaderDesc: {
    flex: 1,
    fontWeight: "bold",
    fontSize: 10,
  },
  tableHeaderAmount: {
    width: 100,
    fontWeight: "bold",
    fontSize: 10,
    textAlign: "right",
  },
  tableRow: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 6,
  },
  tableDesc: {
    flex: 1,
  },
  tableAmount: {
    width: 100,
    fontWeight: "bold",
    fontSize: 13,
    textAlign: "right",
  },
  discountRow: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 6,
  },
  taxSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  taxRow: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 6,
  },
  bottomLine: {
    height: 1,
    backgroundColor: GREEN,
    marginBottom: 16,
  },
  footer: {
    alignItems: "center",
    fontSize: 9,
    color: "#555",
  },
  footerDisclaimer: {
    textAlign: "center",
    marginBottom: 8,
  },
  pageNumber: {
    position: "absolute",
    bottom: 30,
    left: 40,
    fontSize: 9,
    color: "#888",
  },
});

type ReceiptPdfDocumentProps = {
  data: ReceiptData;
  /** Base64 data URL (data:image/png;base64,...) for reliable logo rendering across environments */
  logoSrc?: string | null;
};

const COMPANY_LINE = "Le Dojo Financier | dojofinancier.com | salut@dojofinancier.com";

export function ReceiptPdfDocument({ data, logoSrc }: ReceiptPdfDocumentProps) {
  const amountFormatted = `${data.price.toFixed(2)} ${data.currency}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.contentWrapper}>
          <View style={styles.topLine} />

          <View style={styles.header}>
          {logoSrc ? (
            <Image src={logoSrc} style={styles.logo} />
          ) : (
            <Text style={[styles.title, { marginBottom: 8 }]}>Le Dojo Financier</Text>
          )}
          <Text style={styles.companyLine}>{COMPANY_LINE}</Text>
          <Text style={styles.title}>REÇU DE TRANSACTION</Text>
        </View>

        <View style={styles.metaSection}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>{data.dateLong}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Numéro de commande</Text>
            <Text style={styles.metaValue}>{data.orderNumber ?? "—"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Nom</Text>
            <Text style={styles.metaValue}>{data.userName}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Courriel</Text>
            <Text style={styles.metaValue}>{data.userEmail}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Payé par</Text>
            <Text style={styles.metaValue}>{data.paymentMethod}</Text>
          </View>
        </View>

        <View style={styles.greenDivider} />

        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderDesc}>Description</Text>
          <Text style={styles.tableHeaderAmount}>Montant</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableDesc}>{data.productName}</Text>
          <Text style={styles.tableAmount}>{amountFormatted}</Text>
        </View>
        {data.discount != null && data.discount !== "" ? (
          <View style={styles.discountRow}>
            <Text style={styles.tableDesc}>Rabais</Text>
            <Text style={styles.tableAmount}>{data.discount}</Text>
          </View>
        ) : null}

        {(data.tps != null || data.tvq != null) && (
          <View style={styles.taxSection}>
            {data.tps != null && data.tps !== "" ? (
              <View style={styles.taxRow}>
                <Text style={styles.metaLabel}>TPS</Text>
                <Text style={styles.metaValue}>{data.tps}</Text>
              </View>
            ) : null}
            {data.tvq != null && data.tvq !== "" ? (
              <View style={styles.taxRow}>
                <Text style={styles.metaLabel}>TVQ</Text>
                <Text style={styles.metaValue}>{data.tvq}</Text>
              </View>
            ) : null}
            {data.tpsNumber != null && data.tpsNumber !== "" ? (
              <View style={styles.taxRow}>
                <Text style={styles.metaLabel}>Numéro TPS</Text>
                <Text style={styles.metaValue}>{data.tpsNumber}</Text>
              </View>
            ) : null}
            {data.tvqNumber != null && data.tvqNumber !== "" ? (
              <View style={styles.taxRow}>
                <Text style={styles.metaLabel}>Numéro TVQ</Text>
                <Text style={styles.metaValue}>{data.tvqNumber}</Text>
              </View>
            ) : null}
          </View>
        )}

        {data.status != null ? (
          <View style={[styles.metaRow, { marginTop: 12 }]}>
            <Text style={styles.metaLabel}>Statut</Text>
            <Text style={styles.metaValueRight}>{data.status}</Text>
          </View>
        ) : null}
        </View>

        <View style={styles.bottomLine} />

        <View style={styles.footer}>
          <Text style={styles.footerDisclaimer}>
            Ce document constitue un reçu de paiement. Conservez-le pour vos
            dossiers.
          </Text>
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} fixed />
      </Page>
    </Document>
  );
}

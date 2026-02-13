import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { ReceiptData } from "./types";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 11,
  },
  header: {
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 40,
    objectFit: "contain",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    marginBottom: 8,
  },
  label: {
    width: 140,
    color: "#374151",
  },
  value: {
    flex: 1,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginVertical: 12,
  },
  footer: {
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    fontSize: 9,
    color: "#6b7280",
  },
});

type ReceiptPdfDocumentProps = {
  data: ReceiptData;
  /** Absolute path to logo image (e.g. from path.join(process.cwd(), "public", "logo_dark.png")) */
  logoPath?: string | null;
};

export function ReceiptPdfDocument({ data, logoPath }: ReceiptPdfDocumentProps) {
  const amountFormatted = `${data.price.toFixed(2)} ${data.currency}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {logoPath ? (
            <Image src={logoPath} style={styles.logo} />
          ) : null}
          <Text style={styles.title}>Reçu de paiement</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Produit</Text>
            <Text style={styles.value}>{data.productName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Montant</Text>
            <Text style={styles.value}>{amountFormatted}</Text>
          </View>
          {data.discount != null && data.discount !== "" ? (
            <View style={styles.row}>
              <Text style={styles.label}>Rabais</Text>
              <Text style={styles.value}>{data.discount}</Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <Text style={styles.label}>Client</Text>
            <Text style={styles.value}>
              {data.userName} – {data.userEmail}
            </Text>
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
            <Text style={styles.value}>
              {data.dateShort} ({data.dateLong})
            </Text>
          </View>
          {data.status != null ? (
            <View style={styles.row}>
              <Text style={styles.label}>Statut</Text>
              <Text style={styles.value}>{data.status}</Text>
            </View>
          ) : null}
        </View>

        {(data.tps != null || data.tvq != null) && (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              {data.tps != null && data.tps !== "" ? (
                <View style={styles.row}>
                  <Text style={styles.label}>TPS</Text>
                  <Text style={styles.value}>{data.tps}</Text>
                </View>
              ) : null}
              {data.tvq != null && data.tvq !== "" ? (
                <View style={styles.row}>
                  <Text style={styles.label}>TVQ</Text>
                  <Text style={styles.value}>{data.tvq}</Text>
                </View>
              ) : null}
              {data.tpsNumber != null && data.tpsNumber !== "" ? (
                <View style={styles.row}>
                  <Text style={styles.label}>Numéro TPS</Text>
                  <Text style={styles.value}>{data.tpsNumber}</Text>
                </View>
              ) : null}
              {data.tvqNumber != null && data.tvqNumber !== "" ? (
                <View style={styles.row}>
                  <Text style={styles.label}>Numéro TVQ</Text>
                  <Text style={styles.value}>{data.tvqNumber}</Text>
                </View>
              ) : null}
            </View>
          </>
        )}

        <View style={styles.footer}>
          <Text>
            Ce document constitue un reçu de paiement. Conservez-le pour vos
            dossiers.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

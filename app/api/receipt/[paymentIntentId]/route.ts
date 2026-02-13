import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getReceiptDataAction } from "@/app/actions/payments";
import { ReceiptPdfDocument } from "@/components/receipt/receipt-pdf-document";
import { renderToBuffer } from "@react-pdf/renderer";
import { logServerError } from "@/lib/utils/error-logging";

type RouteParams = { params: Promise<{ paymentIntentId: string }> };

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { paymentIntentId } = await params;

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: "Numéro de transaction manquant" },
        { status: 400 }
      );
    }

    const result = await getReceiptDataAction(paymentIntentId);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error ?? "Reçu introuvable" },
        { status: 404 }
      );
    }

    const logoPath = path.join(process.cwd(), "public", "logo_dark.png");

    const pdfBuffer = await renderToBuffer(
      ReceiptPdfDocument({ data: result.data, logoPath })
    );

    const orderNum = result.data.orderNumber ?? paymentIntentId;
    const filename = `receipt-${orderNum}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    await logServerError({
      errorMessage: `Receipt PDF generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });
    return NextResponse.json(
      { error: "Erreur lors de la génération du reçu" },
      { status: 500 }
    );
  }
}

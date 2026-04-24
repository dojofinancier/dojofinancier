"use client";

import { useState, useMemo, useEffect, FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import type { StripeCardElementChangeEvent } from "@stripe/stripe-js";
import { toast } from "sonner";
import { getStripeClient } from "@/lib/stripe/client";
import { Loader2 } from "lucide-react";
import {
  createAccompagnementPaymentIntentAction,
  createAccompagnementEnrollmentAction,
} from "@/app/actions/accompagnement-payments";

interface AccompagnementPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productTitle: string;
  courseTitle: string;
  amount: number;
  userId: string;
  onSuccess: () => void;
}

function InnerForm({
  productId,
  productTitle,
  amount,
  userId,
  onSuccess,
}: {
  productId: string;
  productTitle: string;
  amount: number;
  userId: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [cardholderName, setCardholderName] = useState("");
  const [cardError, setCardError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await createAccompagnementPaymentIntentAction({
        accompagnementProductId: productId,
      });
      if (cancelled) return;
      if (res.success && res.data?.clientSecret) {
        setClientSecret(res.data.clientSecret);
        setPaymentIntentId(res.data.paymentIntentId);
      } else {
        setInitError(res.error || "Impossible de préparer le paiement.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const cardOptions = {
    style: {
      base: {
        fontSize: "14px",
        color: "hsl(var(--foreground))",
        fontFamily: "inherit",
        fontWeight: "400",
        lineHeight: "1.5",
        "::placeholder": { color: "hsl(var(--muted-foreground))", opacity: 1 },
      },
      invalid: {
        color: "hsl(var(--destructive))",
        iconColor: "hsl(var(--destructive))",
      },
    },
    hidePostalCode: true,
    disableLink: true,
  } as const;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret || !paymentIntentId) {
      toast.error("Paiement non prêt, veuillez patienter.");
      return;
    }
    if (!cardholderName.trim()) {
      toast.error("Veuillez saisir le nom du titulaire.");
      return;
    }
    setIsProcessing(true);
    try {
      const cardEl = elements.getElement(CardElement);
      if (!cardEl) {
        toast.error("Erreur de chargement du formulaire.");
        setIsProcessing(false);
        return;
      }
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardEl,
            billing_details: { name: cardholderName.trim() },
          },
        }
      );
      if (error) {
        toast.error(error.message || "Erreur de paiement.");
        setIsProcessing(false);
        return;
      }
      if (paymentIntent?.status === "succeeded") {
        const enrollRes = await createAccompagnementEnrollmentAction({
          userId,
          accompagnementProductId: productId,
          paymentIntentId: paymentIntent.id,
        });
        if (!enrollRes.success) {
          toast.error(
            enrollRes.error ||
              "Paiement accepté mais l'inscription a échoué. Notre équipe a été notifiée."
          );
          setIsProcessing(false);
          return;
        }
        toast.success(`Bienvenue dans ${productTitle} !`);
        setIsProcessing(false);
        onSuccess();
      } else {
        toast.error("Paiement non complété.");
        setIsProcessing(false);
      }
    } catch (err) {
      console.error("Accompagnement payment error:", err);
      toast.error("Erreur inattendue.");
      setIsProcessing(false);
    }
  }

  if (initError) {
    return (
      <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        {initError}
      </div>
    );
  }
  if (!clientSecret || !stripe) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cardholderName">Nom du titulaire</Label>
        <Input
          id="cardholderName"
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="Jean Dupont"
          disabled={isProcessing}
        />
      </div>

      <div className="space-y-2">
        <Label>Numéro de carte</Label>
        <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-hidden [&_.StripeElement]:h-full [&_.StripeElement_iframe]:h-full">
          <div className="flex-1 h-full max-h-[40px]">
            <CardElement
              options={cardOptions}
              onChange={(e: StripeCardElementChangeEvent) => {
                if (e.error) setCardError(e.error.message);
                else setCardError(null);
              }}
            />
          </div>
        </div>
        {cardError && (
          <p className="text-sm text-destructive">{cardError}</p>
        )}
      </div>

      <div className="flex justify-between border-t pt-4 text-lg font-bold">
        <span>Total</span>
        <span>{amount.toFixed(2)} $</span>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isProcessing || !stripe}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Traitement…
          </>
        ) : (
          `Payer ${amount.toFixed(2)} $`
        )}
      </Button>
    </form>
  );
}

export function AccompagnementPaymentDialog({
  open,
  onOpenChange,
  productId,
  productTitle,
  courseTitle,
  amount,
  userId,
  onSuccess,
}: AccompagnementPaymentDialogProps) {
  const stripePromise = useMemo(() => getStripeClient(), []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>S'inscrire à l'accompagnement</DialogTitle>
          <DialogDescription>
            {productTitle} — {courseTitle}
          </DialogDescription>
        </DialogHeader>
        {stripePromise ? (
          <Elements
            stripe={stripePromise}
            options={{ appearance: { theme: "stripe" }, locale: "fr" }}
          >
            <InnerForm
              productId={productId}
              productTitle={productTitle}
              amount={amount}
              userId={userId}
              onSuccess={() => {
                onOpenChange(false);
                onSuccess();
              }}
            />
          </Elements>
        ) : (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, FormEvent, useEffect } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { StripeCardElementChangeEvent } from "@stripe/stripe-js";
import { createCheckoutPaymentIntentAction } from "@/app/actions/checkout";
import { createEnrollmentFromPaymentIntentAction } from "@/app/actions/payments";
import { getCurrentUserInfoAction } from "@/app/actions/auth";
import { clearCart } from "@/lib/utils/cart";
import { trackEnrollment, trackCohortEnrollment } from "@/components/analytics/google-analytics";

type PaymentFormProps = {
  clientSecret?: string;
  courseId?: string;
  cohortId?: string;
  courseTitle?: string;
  cohortTitle?: string;
  amount: number;
  originalAmount?: number;
  discountAmount?: number;
  couponCode?: string;
  onClientSecretReady?: (clientSecret: string) => void;
  onSuccess?: () => void;
};

export function PaymentForm({
  clientSecret: initialClientSecret,
  courseId,
  cohortId,
  courseTitle,
  cohortTitle,
  amount,
  originalAmount,
  discountAmount,
  couponCode,
  onClientSecretReady,
  onSuccess,
}: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(initialClientSecret || null);
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [cardError, setCardError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  // Load current user info on mount
  useEffect(() => {
    async function loadUserInfo() {
      try {
        const result = await getCurrentUserInfoAction();
        if (result.success && result.data) {
          setIsLoggedIn(true);
          setFirstName(result.data.firstName || "");
          setLastName(result.data.lastName || "");
          setEmail(result.data.email || "");
          setPhone(result.data.phone || "");
        }
      } catch (error) {
        console.error("Error loading user info:", error);
      } finally {
        setIsLoadingUser(false);
      }
    }
    loadUserInfo();
  }, []);

  const handleCardChange = (event: StripeCardElementChangeEvent) => {
    if (event.error) {
      setCardError(event.error.message);
    } else {
      setCardError(null);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (value && !validateEmail(value)) {
      setEmailError("Veuillez entrer une adresse courriel valide");
    } else {
      setEmailError(null);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (value && value.length < 6) {
      setPasswordError("Le mot de passe doit contenir au moins 6 caractères");
    } else {
      setPasswordError(null);
    }
    // Re-validate confirm password when password changes
    if (confirmPassword && value !== confirmPassword) {
      setConfirmPasswordError("Les mots de passe ne correspondent pas");
    } else {
      setConfirmPasswordError(null);
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (value && value !== password) {
      setConfirmPasswordError("Les mots de passe ne correspondent pas");
    } else {
      setConfirmPasswordError(null);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast.error("Stripe n'est pas encore chargé");
      return;
    }

    // Validate all fields
    if (!firstName || !lastName) {
      toast.error("Veuillez remplir votre prénom et votre nom");
      setIsProcessing(false);
      return;
    }

    if (!email) {
      toast.error("Veuillez entrer votre adresse courriel");
      setIsProcessing(false);
      return;
    }

    if (!validateEmail(email)) {
      setEmailError("Veuillez entrer une adresse courriel valide");
      toast.error("Veuillez entrer une adresse courriel valide");
      setIsProcessing(false);
      return;
    }

    // Only validate password if user is not logged in
    if (!isLoggedIn) {
      if (!password) {
        toast.error("Veuillez entrer un mot de passe");
        setIsProcessing(false);
        return;
      }

      if (password.length < 6) {
        setPasswordError("Le mot de passe doit contenir au moins 6 caractères");
        toast.error("Le mot de passe doit contenir au moins 6 caractères");
        setIsProcessing(false);
        return;
      }

      if (!confirmPassword) {
        toast.error("Veuillez confirmer votre mot de passe");
        setIsProcessing(false);
        return;
      }

      if (password !== confirmPassword) {
        setConfirmPasswordError("Les mots de passe ne correspondent pas");
        toast.error("Les mots de passe ne correspondent pas");
        setIsProcessing(false);
        return;
      }
    }

    setIsProcessing(true);

    // Create payment intent with user account
    let paymentClientSecret = clientSecret;
    
    if (!paymentClientSecret) {
      try {
        const paymentResult = await createCheckoutPaymentIntentAction(
          courseId || null,
          cohortId || null,
          couponCode || null,
          email,
          isLoggedIn ? undefined : password, // Only pass password if not logged in
          firstName,
          lastName,
          phone || undefined
        );

        if (!paymentResult.success || !paymentResult.data) {
          console.error("Payment intent creation failed:", paymentResult);
          const errorMessage = paymentResult.error || "Erreur lors de la préparation du paiement";
          toast.error(errorMessage);
          setIsProcessing(false);
          return;
        }

        paymentClientSecret = paymentResult.data.clientSecret;
        setClientSecret(paymentClientSecret);
        
        if (onClientSecretReady && paymentClientSecret) {
          onClientSecretReady(paymentClientSecret);
        }
      } catch (error) {
        console.error("Payment intent creation error:", error);
        const errorMessage = error instanceof Error ? error.message : "Erreur lors de la création du compte";
        toast.error(errorMessage);
        setIsProcessing(false);
        return;
      }
    }

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        toast.error("Erreur de chargement du formulaire de paiement");
        setIsProcessing(false);
        return;
      }

      // Confirm payment with Stripe
      if (!paymentClientSecret) {
        toast.error("Erreur: secret de paiement manquant");
        setIsProcessing(false);
        return;
      }
      
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        paymentClientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              email,
              name: `${firstName} ${lastName}`.trim(),
              ...(phone && { phone }),
            },
          },
        }
      );

      if (confirmError) {
        // Handle specific Stripe errors in French
        let errorMessage = "Erreur de paiement";
        
        switch (confirmError.type) {
          case "card_error":
            switch (confirmError.code) {
              case "card_declined":
                errorMessage = "Votre carte a été refusée. Veuillez essayer une autre carte.";
                break;
              case "insufficient_funds":
                errorMessage = "Fonds insuffisants. Veuillez utiliser une autre carte.";
                break;
              case "expired_card":
                errorMessage = "Votre carte a expiré. Veuillez utiliser une autre carte.";
                break;
              case "incorrect_cvc":
                errorMessage = "Le code de sécurité de votre carte est incorrect.";
                break;
              case "processing_error":
                errorMessage = "Une erreur s'est produite lors du traitement de votre carte. Veuillez réessayer.";
                break;
              default:
                errorMessage = confirmError.message || "Erreur de paiement. Veuillez réessayer.";
            }
            break;
          case "validation_error":
            errorMessage = "Les informations de paiement sont invalides. Veuillez vérifier et réessayer.";
            break;
          default:
            errorMessage = confirmError.message || "Une erreur est survenue. Veuillez réessayer.";
        }

        toast.error(errorMessage);
        setIsProcessing(false);
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        // Create enrollment immediately (fallback if webhook hasn't fired)
        if (paymentIntent.id) {
          try {
            const enrollmentResult = await createEnrollmentFromPaymentIntentAction(paymentIntent.id);
            if (!enrollmentResult.success) {
              console.error("Failed to create enrollment:", enrollmentResult.error);
              // Don't block the flow, webhook might create it later
            }
          } catch (error) {
            console.error("Error creating enrollment:", error);
            // Don't block the flow, webhook might create it later
          }
        }

        // Clear cart and sessionStorage after successful payment
        clearCart();
        sessionStorage.removeItem("checkout_cart");
        sessionStorage.removeItem("checkout_coupon");
        
        // Track enrollment in Google Analytics
        if (courseId) {
          trackEnrollment(courseId, courseTitle || `Course ${courseId}`, amount);
        } else if (cohortId) {
          trackCohortEnrollment(cohortId, cohortTitle || `Cohort ${cohortId}`, amount);
        }
        
        toast.success("Paiement réussi! Redirection vers votre tableau de bord...");
        
        if (onSuccess) {
          onSuccess();
        }
        
        // Wait a moment for session to be established, then redirect to student dashboard
        // Users created during checkout are always students, so redirect directly to student dashboard
        setTimeout(() => {
          router.push("/tableau-de-bord/etudiant");
          router.refresh();
        }, 500);
      } else {
        toast.error("Le paiement n'a pas été complété");
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Une erreur inattendue s'est produite. Veuillez réessayer.");
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: "14px",
        color: "hsl(var(--foreground))",
        fontFamily: "inherit",
        fontWeight: "400",
        lineHeight: "1.5",
        letterSpacing: "0",
        "::placeholder": {
          color: "hsl(var(--muted-foreground))",
          opacity: 1,
        },
      },
      invalid: {
        color: "hsl(var(--destructive))",
        iconColor: "hsl(var(--destructive))",
      },
    },
    hidePostalCode: true, // Remove zip code field
    iconStyle: "default" as const,
    disableLink: true, // Disable Stripe Link autofill
  };

  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information Fields */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Prénom *</Label>
            <Input
              id="firstName"
              type="text"
              placeholder="Jean"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              disabled={isProcessing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Nom *</Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Dupont"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              disabled={isProcessing}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Courriel *</Label>
          <Input
            id="email"
            type="email"
            placeholder="votre@courriel.com"
            value={email}
            onChange={handleEmailChange}
            required
            disabled={isProcessing || isLoggedIn}
            className={emailError ? "border-destructive" : ""}
          />
          {isLoggedIn && (
            <p className="text-xs text-muted-foreground">
              Connecté avec ce courriel
            </p>
          )}
          {emailError && (
            <p className="text-sm text-destructive">{emailError}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="555-555-5555"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isProcessing}
          />
        </div>

        {/* Password fields - only show if user is not logged in */}
        {!isLoggedIn && (
          <>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe *</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={handlePasswordChange}
                required
                disabled={isProcessing}
                minLength={6}
                className={passwordError ? "border-destructive" : ""}
              />
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                required
                disabled={isProcessing}
                minLength={6}
                className={confirmPasswordError ? "border-destructive" : ""}
              />
              {confirmPasswordError && (
                <p className="text-sm text-destructive">{confirmPasswordError}</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Payment Card Element */}
      <div className="space-y-2">
        <Label>Numéro de carte</Label>
        <div className="relative z-0 flex h-10 w-full items-center overflow-hidden rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 [&_.StripeElement]:h-full [&_.StripeElement_iframe]:h-full [&_.StripeElement_iframe]:min-h-0">
          <div className="flex-1 h-full">
            <CardElement
              options={cardElementOptions}
              onChange={handleCardChange}
            />
          </div>
        </div>
        {cardError && (
          <p className="text-sm text-destructive">{cardError}</p>
        )}
      </div>

      {/* Price Summary */}
      <div className="space-y-2 border-t pt-4">
        {originalAmount && originalAmount !== amount && (
          <>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Prix original</span>
              <span>{originalAmount.toFixed(2)} $</span>
            </div>
            {discountAmount && discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Réduction {couponCode && `(${couponCode})`}</span>
                <span>-{discountAmount.toFixed(2)} $</span>
              </div>
            )}
          </>
        )}
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{amount.toFixed(2)} $</span>
        </div>
      </div>

        <Button
          type="submit"
          className="w-full cursor-pointer hover:scale-100 active:scale-100 relative z-10 touch-manipulation"
          disabled={isProcessing || !stripe}
        >

        {isProcessing ? "Traitement..." : `Payer ${amount.toFixed(2)} $`}
      </Button>
    </form>
  );
}


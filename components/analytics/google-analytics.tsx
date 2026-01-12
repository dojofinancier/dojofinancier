"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) {
      return;
    }

    // Track page views
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    
    // Use gtag if available
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("config", GA_MEASUREMENT_ID, {
        page_path: url,
      });
    }
  }, [pathname, searchParams]);

  if (!GA_MEASUREMENT_ID) {
    return null;
  }

  return (
    <>
      {/* Load GA script with lazy strategy to not block page load */}
      <Script
        strategy="lazyOnload"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}

/**
 * Track custom events in Google Analytics
 */
export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
) {
  if (typeof window === "undefined" || !(window as any).gtag || !GA_MEASUREMENT_ID) {
    return;
  }

  (window as any).gtag("event", action, {
    event_category: category,
    event_label: label,
    value: value,
  });
}

/**
 * Track page views manually (useful for client-side navigation)
 */
export function trackPageView(url: string) {
  if (typeof window === "undefined" || !(window as any).gtag || !GA_MEASUREMENT_ID) {
    return;
  }

  (window as any).gtag("config", GA_MEASUREMENT_ID, {
    page_path: url,
  });
}

/**
 * Track course enrollment
 */
export function trackEnrollment(courseId: string, courseTitle: string, price: number) {
  trackEvent("enrollment", "course", courseTitle, price);
  
  if (typeof window !== "undefined" && (window as any).gtag && GA_MEASUREMENT_ID) {
    (window as any).gtag("event", "purchase", {
      transaction_id: `enrollment_${courseId}_${Date.now()}`,
      value: price,
      currency: "CAD",
      items: [
        {
          item_id: courseId,
          item_name: courseTitle,
          item_category: "course",
          price: price,
          quantity: 1,
        },
      ],
    });
  }
}

/**
 * Track cohort enrollment
 */
export function trackCohortEnrollment(cohortId: string, cohortTitle: string, price: number) {
  trackEvent("enrollment", "cohort", cohortTitle, price);
  
  if (typeof window !== "undefined" && (window as any).gtag && GA_MEASUREMENT_ID) {
    (window as any).gtag("event", "purchase", {
      transaction_id: `cohort_enrollment_${cohortId}_${Date.now()}`,
      value: price,
      currency: "CAD",
      items: [
        {
          item_id: cohortId,
          item_name: cohortTitle,
          item_category: "cohort",
          price: price,
          quantity: 1,
        },
      ],
    });
  }
}

/**
 * Track course completion
 */
export function trackCourseCompletion(courseId: string, courseTitle: string) {
  trackEvent("complete", "course", courseTitle);
}

/**
 * Track quiz completion
 */
export function trackQuizCompletion(quizId: string, quizTitle: string, score: number) {
  trackEvent("complete", "quiz", quizTitle, score);
}

/**
 * Track video watch
 */
export function trackVideoWatch(videoId: string, videoTitle: string, duration: number) {
  trackEvent("video_watch", "content", videoTitle, duration);
}

/**
 * Track search
 */
export function trackSearch(searchTerm: string, resultsCount: number) {
  trackEvent("search", "engagement", searchTerm, resultsCount);
}


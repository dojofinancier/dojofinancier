# Google Analytics Setup Guide

## Overview

Google Analytics 4 (GA4) has been integrated into the application to track user behavior, conversions, and engagement.

## Setup Instructions

### 1. Get Your GA4 Measurement ID

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new GA4 property (or use an existing one)
3. Copy your **Measurement ID** (format: `G-XXXXXXXXXX`)

### 2. Add Environment Variable

Add the following to your `.env.local` file (or your deployment environment variables):

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Important**: 
- The variable must start with `NEXT_PUBLIC_` to be accessible in the browser
- Replace `G-XXXXXXXXXX` with your actual Measurement ID
- For production, add this to your hosting platform's environment variables

### 3. Verify Installation

1. Start your development server: `npm run dev`
2. Open your browser's Developer Tools (F12)
3. Go to the Network tab and filter for "gtag" or "analytics"
4. Navigate through your site - you should see requests to `www.google-analytics.com`
5. In Google Analytics, go to **Reports > Realtime** to see live traffic

## Features Implemented

### Automatic Page View Tracking

All page views are automatically tracked when users navigate through the site.

### Custom Event Tracking

The following custom events are tracked:

#### 1. **Enrollments**
- **Course Enrollment**: Tracks when a user enrolls in a course
- **Cohort Enrollment**: Tracks when a user enrolls in a cohort
- Includes purchase event with transaction details

#### 2. **Learning Activities**
- **Course Completion**: When a user completes a course
- **Quiz Completion**: When a user completes a quiz (with score)
- **Video Watch**: When a user watches a video (with duration)

#### 3. **Engagement**
- **Search**: When users search for courses/content

## Available Tracking Functions

You can use these functions anywhere in your client components:

```typescript
import { 
  trackEvent,
  trackPageView,
  trackEnrollment,
  trackCohortEnrollment,
  trackCourseCompletion,
  trackQuizCompletion,
  trackVideoWatch,
  trackSearch,
} from "@/lib/utils/analytics";
```

### Examples

```typescript
// Track a custom event
trackEvent("button_click", "navigation", "header_cta");

// Track course completion
trackCourseCompletion("course-123", "Introduction to Finance");

// Track quiz completion
trackQuizCompletion("quiz-456", "Chapter 1 Quiz", 85);

// Track video watch
trackVideoWatch("video-789", "Introduction Video", 120); // 120 seconds

// Track search
trackSearch("financial planning", 15); // 15 results
```

## Event Structure

### Purchase Events (Enrollments)

When a user enrolls, GA4 receives a purchase event with:
- `transaction_id`: Unique transaction identifier
- `value`: Purchase amount in CAD
- `currency`: "CAD"
- `items`: Array with course/cohort details

### Custom Events

All custom events include:
- `event_category`: Category of the event
- `event_label`: Optional label for the event
- `value`: Optional numeric value

## Privacy & GDPR Compliance

### Current Implementation

- Google Analytics is loaded on all pages
- No user identification is sent (anonymous tracking)
- IP anonymization is enabled by default in GA4

### For GDPR Compliance (EU Users)

If you need GDPR compliance, consider:

1. **Cookie Consent Banner**: Add a cookie consent banner before loading GA4
2. **Conditional Loading**: Only load GA4 after user consent
3. **Privacy Policy**: Update your privacy policy to mention Google Analytics

Example conditional loading:

```typescript
// Only load if user has consented
if (hasConsentedToAnalytics) {
  return <GoogleAnalytics />;
}
```

## Testing

### Test in Development

1. Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` in `.env.local`
2. Open browser console
3. Check for `gtag` function: `typeof window.gtag` should be `"function"`
4. Navigate through pages and check Network tab for GA requests

### Test in Production

1. Use Google Analytics DebugView:
   - Install [Google Analytics Debugger](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna) Chrome extension
   - Enable it and navigate your site
   - Check GA4 DebugView in real-time

2. Use GA4 Realtime Reports:
   - Go to GA4 > Reports > Realtime
   - Navigate your site and see events appear

## Common Issues

### GA4 Not Loading

1. **Check Environment Variable**:
   - Ensure `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set
   - Restart dev server after adding env variable
   - Check browser console for errors

2. **Ad Blockers**:
   - Ad blockers may block GA4
   - Test in incognito mode or disable ad blockers

3. **Network Issues**:
   - Check Network tab for failed requests to `google-analytics.com`
   - Ensure firewall isn't blocking GA4

### Events Not Showing

1. **Check Event Names**: Ensure event names match GA4 conventions
2. **Wait Time**: GA4 can take 24-48 hours to show data in standard reports
3. **Use DebugView**: Use GA4 DebugView for immediate event verification

## Next Steps

### Recommended Enhancements

1. **Enhanced E-commerce Tracking**:
   - Track add to cart events
   - Track checkout steps
   - Track coupon usage

2. **User Properties**:
   - Track user roles (student, admin, instructor)
   - Track subscription status
   - Track course progress

3. **Conversion Goals**:
   - Set up conversion goals in GA4
   - Track course completion as conversion
   - Track enrollment as conversion

4. **Custom Dimensions**:
   - Course category
   - Course difficulty
   - User segment

## Files Modified

- `components/analytics/google-analytics.tsx` - Main GA4 component
- `lib/utils/analytics.ts` - Utility exports
- `app/layout.tsx` - Added GoogleAnalytics component
- `components/payment/payment-form.tsx` - Added enrollment tracking

## Resources

- [Google Analytics 4 Documentation](https://developers.google.com/analytics/devguides/collection/ga4)
- [GA4 Event Reference](https://developers.google.com/analytics/devguides/collection/ga4/events)
- [Next.js Script Component](https://nextjs.org/docs/app/api-reference/components/script)


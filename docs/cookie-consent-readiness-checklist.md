# Cookie Consent Readiness Checklist

This checklist defines when FlowForge must move from the current essential-only baseline to a full cookie consent manager with preference controls.

## Current baseline

- Only strictly necessary cookies are in use for authentication/security (`ff_refresh`, `ff_csrf` defaults).
- No analytics SDK cookies.
- No marketing/ad-tech pixel cookies.
- No behavior-tracking cookies for profiling.

## Consent-trigger conditions

Implement full consent management before release if any of the following are introduced:

- Any analytics SDK or telemetry cookie/local storage that is not strictly necessary.
- Any marketing, advertising, or remarketing pixel/script.
- Any A/B testing or experimentation cookie/storage used for tracking behavior.
- Any non-essential browser storage tied to user behavior profiling, attribution, or measurement.

## Minimum implementation requirements once triggered

- Category-based preferences (for example: analytics, marketing, functional), with non-essential categories defaulting to off.
- Consent banner on first visit for applicable regions.
- Preference center accessible after initial choice.
- Script and storage gating so non-essential technologies remain disabled without consent.
- Consent decision persistence with a clear path to update/revoke choices.

## Engineering release gate

Before merging tracking-related changes:

- Confirm whether the change sets cookies/local storage/session storage.
- Classify each storage use as strictly necessary or non-essential.
- If any non-essential use exists, block release until consent UI + gating is merged.

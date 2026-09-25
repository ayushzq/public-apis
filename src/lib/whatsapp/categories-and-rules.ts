/**
 * ═══════════════════════════════════════════════════════════════════════════
 *   WHATSAPP CLOUD API — COMPLETE TEMPLATE CATEGORIES & RULES REFERENCE
 *   For SaaS Platform Development (Wati/Interakt/Twilio-style)
 *   Meta WhatsApp Business Platform — Latest Guidelines
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * SECTION 1: Template Categories Deep Dive
 * SECTION 2: Component Rules Summary
 * SECTION 3: Approval Process & Best Practices
 * SECTION 4: Quality Rating & Tier System
 */

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: TEMPLATE CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

export const TEMPLATE_CATEGORY_RULES = {

  /**
   * MARKETING
   * ─────────
   * Purpose  : Promotions, offers, product announcements, re-engagement
   * Use When : You are initiating a conversation to sell or promote.
   *
   * Rules:
   * ✅ Can include promotional/sales content
   * ✅ Supports all header types (Text, Image, Video, Document, Location)
   * ✅ Supports Carousel, Limited Time Offer, Copy Code buttons
   * ✅ Can use Quick Reply + CTA buttons
   * ✅ Can include emojis, bold (*text*), italics (_text_)
   * ❌ Must NOT include spam or misleading content
   * ❌ Must NOT collect sensitive data (use Utility for confirmations)
   * ❌ User must have opted in to receive marketing messages
   *
   * Pricing: Higher per-message cost than Utility (varies by country)
   * Conversation window: Opens a new 24-hour marketing conversation window
   *
   * Examples:
   *  - "Your 30% discount expires tonight! Shop now →"
   *  - "New collection drop! Swipe to see our top picks 🛍️"
   *  - "You left items in your cart. Complete your purchase for 10% off!"
   */
  MARKETING: {
    bodyMaxChars: 1024,
    headerTextMaxChars: 60,
    footerMaxChars: 60,
    headerVariablesMax: 1,
    supportsCarousel: true,
    supportsLimitedTimeOffer: true,
    requiresOptIn: true,
    pricingTier: "higher",
    allowedHeaderFormats: ["TEXT", "IMAGE", "VIDEO", "DOCUMENT", "LOCATION"],
    allowedButtonTypes: ["QUICK_REPLY", "URL", "PHONE_NUMBER", "COPY_CODE", "MPM", "CATALOG"],
  },

  /**
   * UTILITY
   * ───────
   * Purpose  : Transactional messages tied to a user action or event
   * Use When : A user has made a purchase, booked a service, or initiated an action.
   *
   * Rules:
   * ✅ Must be directly related to an ongoing transaction or customer request
   * ✅ Supports all header types
   * ✅ Supports URL and Phone Number CTA buttons
   * ✅ Can include account updates, payment confirmations, appointment reminders
   * ❌ Must NOT contain promotional or upsell content in the message body
   * ❌ Mixing promotional CTAs in utility body can get template rejected
   * ❌ Cannot use Limited Time Offer component
   *
   * Pricing: Lower per-message cost than Marketing
   * Note: Meta may re-categorize your template to Marketing if it detects
   *       promotional content in a Utility template (use allow_category_change: true)
   *
   * Examples:
   *  - "Your order ORD-12345 has been shipped. Track here →"
   *  - "Appointment confirmed for Dec 25 at 10:00 AM"
   *  - "Your payment of ₹1,499 was received. Invoice attached."
   *  - "Your OTP is 847392. Valid for 10 minutes."
   */
  UTILITY: {
    bodyMaxChars: 1024,
    headerTextMaxChars: 60,
    footerMaxChars: 60,
    headerVariablesMax: 1,
    supportsCarousel: false,
    supportsLimitedTimeOffer: false,
    requiresOptIn: false, // Can send even without explicit marketing opt-in
    pricingTier: "standard",
    allowedHeaderFormats: ["TEXT", "IMAGE", "VIDEO", "DOCUMENT", "LOCATION"],
    allowedButtonTypes: ["QUICK_REPLY", "URL", "PHONE_NUMBER"],
  },

  /**
   * AUTHENTICATION
   * ──────────────
   * Purpose  : One-time passwords (OTPs) and verification codes
   * Use When : You need to verify a user's identity.
   *
   * Rules:
   * ✅ Meta provides a fixed, pre-approved body text format:
   *    "{verification_code} is your verification code."
   * ✅ Can add optional security disclaimer footer automatically
   * ✅ Can set OTP expiry time (1–90 minutes)
   * ✅ Supports ONE_TAP (Android autofill), ZERO_TAP, or COPY_CODE buttons
   * ❌ Cannot have custom body text beyond the OTP code variable
   * ❌ Cannot have Header or Footer components (they are system-generated)
   * ❌ Cannot mix with marketing content
   * ❌ Cannot use Carousel or Location headers
   *
   * Pricing: Separate authentication conversation pricing (usually lowest)
   * Special: These templates are auto-approved by Meta (no manual review for standard OTP)
   *
   * Examples:
   *  - "847392 is your MyApp verification code."
   *  - "847392 is your verification code. For your security, do not share this code."
   */
  AUTHENTICATION: {
    bodyMaxChars: 150, // Meta controls the actual body text
    headerTextMaxChars: 0, // No custom header
    footerMaxChars: 0, // Meta controls footer
    headerVariablesMax: 0,
    supportsCarousel: false,
    supportsLimitedTimeOffer: false,
    requiresOptIn: false,
    pricingTier: "authentication",
    allowedHeaderFormats: [],
    allowedButtonTypes: ["OTP"], // OTP sub-types: COPY_CODE, ONE_TAP, ZERO_TAP
    specialFeatures: {
      autoApproved: true,
      addSecurityRecommendation: true, // Adds "For your security, do not share this code."
      codeExpirationMinutes: { min: 1, max: 90 },
    }
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: COMPONENT RULES QUICK REFERENCE
// ─────────────────────────────────────────────────────────────────────────────

export const COMPONENT_RULES = {
  HEADER: {
    TEXT: {
      maxChars: 60,
      maxVariables: 1,
      variableFormat: "{{1}} only",
      requiresExample: "Required if variable present",
    },
    IMAGE: {
      formats: ["JPEG", "PNG"],
      maxFileSizeMB: 5,
      requiresExampleHandle: "Media handle from resumable upload API",
    },
    VIDEO: {
      formats: ["MP4"],
      maxFileSizeMB: 16,
      requiresExampleHandle: true,
    },
    DOCUMENT: {
      formats: ["PDF"],
      maxFileSizeMB: 100,
      requiresExampleHandle: true,
    },
    LOCATION: {
      note: "No configuration needed at template level. Lat/lng/name/address provided at send-time.",
      requiresExampleHandle: false,
    },
  },

  BODY: {
    maxCharsMarketing: 1024,
    maxCharsUtility: 1024,
    maxCharsAuth: 150,
    variableFormat: "Sequential: {{1}}, {{2}}, {{3}}...",
    variableMaxCount: "No explicit limit, but practical max ~20",
    supportedFormatting: ["*bold*", "_italic_", "~strikethrough~", "```monospace```"],
    noHtml: true,
    requiresExampleForVariables: "Meta strongly recommends it (may reject without)",
  },

  FOOTER: {
    maxChars: 60,
    variablesAllowed: false,
    formattingAllowed: false,
    tip: "Commonly used for: 'Reply STOP to unsubscribe', brand taglines",
  },

  BUTTONS: {
    maxTotal: 10,
    quickReply: {
      maxCount: 3,
      maxTextChars: 25,
      note: "Button payload (for webhook) is set at send-time, not template creation time",
    },
    url: {
      maxCount: 1,
      maxTextChars: 25,
      maxUrlChars: 2000,
      dynamicSuffix: "Append {{1}} to URL for dynamic ends: https://example.com/track/{{1}}",
      requiresExample: "Required if URL contains {{1}}",
    },
    phoneNumber: {
      maxCount: 1,
      maxTextChars: 25,
      format: "E.164 (e.g., +919876543210)",
    },
    copyCode: {
      maxCount: 1,
      maxCodeChars: 15,
      note: "User taps to copy the offer code to clipboard",
    },
    mixing: {
      quickReplyWithCTA: "Allowed but renders differently on iOS vs Android",
      quickReplyWithCopyCode: "Allowed",
      urlWithPhone: "Both allowed simultaneously",
    },
  },

  CAROUSEL: {
    minCards: 2,
    maxCards: 10,
    cardBodyMaxChars: 160,
    cardMaxButtons: 2,
    headerFormats: ["IMAGE", "VIDEO"],
    note: "All cards must use the SAME button types. Card bodies can have variables.",
    limitation: "MARKETING category only",
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: APPROVAL PROCESS & TIPS
// ─────────────────────────────────────────────────────────────────────────────

export const APPROVAL_TIPS = [
  // Template Naming
  "Use descriptive snake_case names: 'order_shipped_v2' not 'template1'",
  "Append version: 'promo_summer_v3' (Meta creates a new template for each submission)",

  // Body Content
  "Always provide example values for every variable — Meta may auto-reject without them",
  "Avoid ALL CAPS text in body (spam signal)",
  "Don't start body with 'Click here' or 'Buy now' (promotional trigger)",
  "Use proper punctuation and grammar — poorly written templates get rejected faster",

  // Variables
  "Variables MUST be sequential: {{1}}, {{2}}, {{3}} — skipping numbers causes rejection",
  "Provide realistic example values that match your variable context",
  "Header text allows only 1 variable: {{1}}. Body has no practical limit.",

  // Categories
  "When in doubt between Marketing/Utility, use allow_category_change: true",
  "Don't put order IDs or transactional data in Marketing templates",
  "Don't put promotional discounts in Utility templates",

  // Media
  "Upload media examples using the Resumable Upload API before submitting template",
  "For image headers, use high-quality images (min 640x640px)",
  "Video headers: keep under 30 seconds for best delivery rates",

  // Authentication
  "Authentication templates with standard OTP format are usually auto-approved",
  "ONE_TAP autofill requires your Android app to be registered with Meta",

  // Review Time
  "Standard review: 1–3 business days",
  "Authentication templates: Often within minutes (auto-approved)",
  "Rejected templates can be re-submitted after fixing issues (new ID assigned)",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: QUALITY RATING & MESSAGE SENDING TIERS
// ─────────────────────────────────────────────────────────────────────────────

export const QUALITY_AND_TIER_SYSTEM = {
  /**
   * Template Quality Scores
   * Meta assigns quality based on user feedback (blocks, reports, low reads)
   */
  qualityScores: {
    GREEN:  "High quality — no issues detected",
    YELLOW: "Medium quality — some users are blocking or reporting",
    RED:    "Low quality — template may be paused soon. Review and improve content.",
  },

  /**
   * Business Phone Number Tiers
   * Your sending capacity grows as you send more messages with good quality
   */
  messagingTiers: {
    TIER_1:  "1,000 unique users per 24 hours (starting tier)",
    TIER_2:  "10,000 unique users per 24 hours",
    TIER_3:  "100,000 unique users per 24 hours",
    TIER_4:  "Unlimited (based on Meta review)",
  },

  /**
   * Tier Upgrade Conditions
   */
  tierUpgradeRules: [
    "Initiate ≥2x your current tier limit in rolling 7 days",
    "Phone number quality rating is HIGH (GREEN) or MEDIUM (YELLOW)",
    "No Policy violations or template rejections recently",
  ],
} as const;

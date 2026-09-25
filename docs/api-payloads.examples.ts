/**
 * WhatsApp Cloud API — Exact JSON Payload Examples
 * ─────────────────────────────────────────────────
 * Section A: POST /message_templates  (Create / Submit template to Meta)
 * Section B: POST /messages           (Send approved template to a user)
 *
 * All payloads are production-ready and follow Meta's latest spec.
 */

// ─────────────────────────────────────────────────────────────────────────────
// SECTION A: TEMPLATE CREATION PAYLOADS
// POST https://graph.facebook.com/v19.0/{WABA_ID}/message_templates
// Headers: Authorization: Bearer {SYSTEM_USER_ACCESS_TOKEN}
//          Content-Type: application/json
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A1. Marketing Template — Image Header + Body Variables + QR Buttons
 */
export const CREATE_MARKETING_WITH_IMAGE_HEADER = {
  name: "summer_sale_promo",
  category: "MARKETING",
  language: "en_US",
  components: [
    {
      type: "HEADER",
      format: "IMAGE",
      example: {
        header_handle: ["AQDuCv9mZz_EXAMPLE_HANDLE_FROM_RESUMABLE_UPLOAD"]
      }
    },
    {
      type: "BODY",
      text: "Hi {{1}}! 🎉 Get *{{2}}% OFF* on all orders above ₹{{3}} this summer. Use code *SUMMER{{4}}* at checkout. Valid till {{5}}.",
      example: {
        body_text: [
          ["Rahul", "30", "499", "30", "30th June 2024"]
        ]
      }
    },
    {
      type: "FOOTER",
      text: "Reply STOP to unsubscribe"
    },
    {
      type: "BUTTONS",
      buttons: [
        {
          type: "URL",
          text: "Shop Now",
          url: "https://mystore.com/sale/{{1}}",
          example: ["summer-collection"]
        },
        {
          type: "QUICK_REPLY",
          text: "Get 30% OFF"
        },
        {
          type: "QUICK_REPLY",
          text: "Not Interested"
        }
      ]
    }
  ]
};

/**
 * A2. Utility Template — Order Confirmation (Text Header + Body Variables)
 */
export const CREATE_UTILITY_ORDER_CONFIRMATION = {
  name: "order_confirmation_v2",
  category: "UTILITY",
  language: "en_US",
  components: [
    {
      type: "HEADER",
      format: "TEXT",
      text: "Order #{{1}} Confirmed ✅",
      example: {
        header_text: ["ORD-98765"]
      }
    },
    {
      type: "BODY",
      text: "Dear {{1}},\n\nYour order for *{{2}}* has been confirmed.\n\n📦 *Order Details:*\n• Items: {{3}}\n• Total: ₹{{4}}\n• Expected Delivery: {{5}}\n\nTrack your order using the button below.",
      example: {
        body_text: [
          ["Priya", "Nike Air Max 270", "2 items", "3,499", "Dec 25, 2024"]
        ]
      }
    },
    {
      type: "FOOTER",
      text: "MyStore — Happy Shopping!"
    },
    {
      type: "BUTTONS",
      buttons: [
        {
          type: "URL",
          text: "Track Order",
          url: "https://mystore.com/track/{{1}}",
          example: ["ORD-98765"]
        },
        {
          type: "PHONE_NUMBER",
          text: "Call Support",
          phone_number: "+919876543210"
        }
      ]
    }
  ]
};

/**
 * A3. Authentication Template — OTP with One-Tap Autofill
 */
export const CREATE_AUTHENTICATION_OTP = {
  name: "myapp_otp_v1",
  category: "AUTHENTICATION",
  language: "en_US",
  components: [
    {
      type: "BODY",
      add_security_recommendation: true
    },
    {
      type: "FOOTER",
      code_expiration_minutes: 10
    },
    {
      type: "BUTTONS",
      buttons: [
        {
          type: "OTP",
          otp_type: "ONE_TAP",
          text: "Autofill OTP",
          autofill_text: "Autofill",
          package_name: "com.myapp.android",
          signature_hash: "K8a%2FAINcGX7"
        }
      ]
    }
  ]
};

/**
 * A4. Marketing Template — Carousel (Product Cards)
 */
export const CREATE_CAROUSEL_TEMPLATE = {
  name: "product_carousel_oct",
  category: "MARKETING",
  language: "en_US",
  components: [
    {
      type: "BODY",
      text: "Check out our latest collection! 🛍️ Swipe to explore top picks just for you.",
    },
    {
      type: "CAROUSEL",
      cards: [
        {
          components: [
            {
              type: "HEADER",
              format: "IMAGE",
              example: {
                header_handle: ["AQD_CARD1_HANDLE"]
              }
            },
            {
              type: "BODY",
              text: "*Nike Air Max 270* — ₹3,499\nAvailable in 5 colors",
              example: { body_text: [[]] }
            },
            {
              type: "BUTTONS",
              buttons: [
                { type: "QUICK_REPLY", text: "Buy Now" },
                {
                  type: "URL",
                  text: "View Details",
                  url: "https://mystore.com/products/nike-air-max-270"
                }
              ]
            }
          ]
        },
        {
          components: [
            {
              type: "HEADER",
              format: "IMAGE",
              example: {
                header_handle: ["AQD_CARD2_HANDLE"]
              }
            },
            {
              type: "BODY",
              text: "*Adidas Ultra Boost* — ₹4,999\nFree delivery on this item",
              example: { body_text: [[]] }
            },
            {
              type: "BUTTONS",
              buttons: [
                { type: "QUICK_REPLY", text: "Buy Now" },
                {
                  type: "URL",
                  text: "View Details",
                  url: "https://mystore.com/products/adidas-ultra-boost"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

/**
 * A5. Marketing Template — Offer Code (Copy Code Button)
 */
export const CREATE_OFFER_CODE_TEMPLATE = {
  name: "exclusive_offer_code",
  category: "MARKETING",
  language: "en_US",
  components: [
    {
      type: "BODY",
      text: "Hi {{1}}! 🎁 Here's an exclusive offer just for you. Use code below to get *{{2}}% off* your next purchase. Valid for {{3}} hours only!",
      example: {
        body_text: [["Anjali", "25", "48"]]
      }
    },
    {
      type: "FOOTER",
      text: "Tap to copy and use at checkout"
    },
    {
      type: "BUTTONS",
      buttons: [
        {
          type: "COPY_CODE",
          example: "ANJALI25OFF"
        }
      ]
    }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION B: SEND TEMPLATE MESSAGE PAYLOADS
// POST https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages
// Headers: Authorization: Bearer {ACCESS_TOKEN}
//          Content-Type: application/json
// ─────────────────────────────────────────────────────────────────────────────

/**
 * B1. Send Marketing Template with Image Header + Body Variables + URL Button
 * Corresponds to template: summer_sale_promo
 */
export const SEND_MARKETING_WITH_IMAGE = {
  messaging_product: "whatsapp",
  recipient_type: "individual",
  to: "+919876543210",
  type: "template",
  template: {
    name: "summer_sale_promo",
    language: { code: "en_US" },
    components: [
      {
        // HEADER: pass the media ID or URL for this specific send
        type: "header",
        parameters: [
          {
            type: "image",
            image: {
              id: "1234567890123456"  // Use Media ID from upload API (preferred)
              // OR use link: "https://cdn.mystore.com/banners/summer-sale.jpg"
            }
          }
        ]
      },
      {
        // BODY: pass values for {{1}} {{2}} {{3}} {{4}} {{5}} in order
        type: "body",
        parameters: [
          { type: "text", text: "Rahul" },
          { type: "text", text: "30" },
          { type: "text", text: "499" },
          { type: "text", text: "30" },
          { type: "text", text: "30th June 2024" }
        ]
      },
      {
        // BUTTON at index 0 (URL button): pass the dynamic URL suffix
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [
          { type: "text", text: "summer-sale-2024" }
        ]
      }
    ]
  }
};

/**
 * B2. Send Utility Template with Text Header + Body Variables
 * Corresponds to template: order_confirmation_v2
 */
export const SEND_UTILITY_ORDER_CONFIRMATION = {
  messaging_product: "whatsapp",
  recipient_type: "individual",
  to: "+919876543210",
  type: "template",
  template: {
    name: "order_confirmation_v2",
    language: { code: "en_US" },
    components: [
      {
        type: "header",
        parameters: [
          { type: "text", text: "ORD-98765" }  // Fills {{1}} in header
        ]
      },
      {
        type: "body",
        parameters: [
          { type: "text", text: "Priya" },         // {{1}}
          { type: "text", text: "Nike Air Max 270" }, // {{2}}
          { type: "text", text: "2 items" },        // {{3}}
          { type: "text", text: "3,499" },          // {{4}}
          { type: "text", text: "Dec 25, 2024" }    // {{5}}
        ]
      },
      {
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [
          { type: "text", text: "ORD-98765" } // Dynamic part of tracking URL
        ]
      }
    ]
  }
};

/**
 * B3. Send Authentication OTP Template
 * Corresponds to template: myapp_otp_v1
 */
export const SEND_AUTHENTICATION_OTP = {
  messaging_product: "whatsapp",
  recipient_type: "individual",
  to: "+919876543210",
  type: "template",
  template: {
    name: "myapp_otp_v1",
    language: { code: "en_US" },
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: "847392" }  // The OTP code
        ]
      },
      {
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [
          { type: "text", text: "847392" }  // Same OTP for autofill
        ]
      }
    ]
  }
};

/**
 * B4. Send Carousel Template
 * Corresponds to template: product_carousel_oct
 */
export const SEND_CAROUSEL_TEMPLATE = {
  messaging_product: "whatsapp",
  recipient_type: "individual",
  to: "+919876543210",
  type: "template",
  template: {
    name: "product_carousel_oct",
    language: { code: "en_US" },
    components: [
      {
        type: "body",
        parameters: []
      },
      {
        type: "carousel",
        cards: [
          {
            card_index: 0,
            components: [
              {
                type: "header",
                parameters: [
                  {
                    type: "image",
                    image: { link: "https://cdn.mystore.com/nike-air-max.jpg" }
                  }
                ]
              },
              {
                type: "button",
                sub_type: "quick_reply",
                index: "0",
                parameters: [
                  { type: "payload", payload: "BUY_PRODUCT_SKU_001" }
                ]
              }
            ]
          },
          {
            card_index: 1,
            components: [
              {
                type: "header",
                parameters: [
                  {
                    type: "image",
                    image: { link: "https://cdn.mystore.com/adidas-ultraboost.jpg" }
                  }
                ]
              },
              {
                type: "button",
                sub_type: "quick_reply",
                index: "0",
                parameters: [
                  { type: "payload", payload: "BUY_PRODUCT_SKU_002" }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
};

/**
 * B5. Send Offer Code Template (Copy Code button)
 */
export const SEND_OFFER_CODE_TEMPLATE = {
  messaging_product: "whatsapp",
  recipient_type: "individual",
  to: "+919876543210",
  type: "template",
  template: {
    name: "exclusive_offer_code",
    language: { code: "en_US" },
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: "Anjali" },
          { type: "text", text: "25" },
          { type: "text", text: "48" }
        ]
      },
      {
        type: "button",
        sub_type: "copy_code",
        index: "0",
        parameters: [
          { type: "coupon_code", coupon_code: "ANJALI25OFF" }
        ]
      }
    ]
  }
};

/**
 * B6. Send template with Document Header
 */
export const SEND_DOCUMENT_HEADER_TEMPLATE = {
  messaging_product: "whatsapp",
  recipient_type: "individual",
  to: "+919876543210",
  type: "template",
  template: {
    name: "invoice_ready",
    language: { code: "en_US" },
    components: [
      {
        type: "header",
        parameters: [
          {
            type: "document",
            document: {
              id: "9876543210123456",  // Media ID of uploaded document
              filename: "Invoice_INV-2024-001.pdf"
            }
          }
        ]
      },
      {
        type: "body",
        parameters: [
          { type: "text", text: "Ravi Kumar" },
          { type: "text", text: "INV-2024-001" },
          { type: "text", text: "₹12,500" }
        ]
      }
    ]
  }
};

/**
 * B7. Send template with Location Header
 */
export const SEND_LOCATION_HEADER_TEMPLATE = {
  messaging_product: "whatsapp",
  recipient_type: "individual",
  to: "+919876543210",
  type: "template",
  template: {
    name: "store_location_share",
    language: { code: "en_US" },
    components: [
      {
        type: "header",
        parameters: [
          {
            type: "location",
            location: {
              latitude: 28.6139,
              longitude: 77.2090,
              name: "MyStore — Connaught Place",
              address: "Block A, Connaught Place, New Delhi 110001"
            }
          }
        ]
      },
      {
        type: "body",
        parameters: [
          { type: "text", text: "Neha" },
          { type: "text", text: "Monday to Saturday, 10AM–8PM" }
        ]
      }
    ]
  }
};

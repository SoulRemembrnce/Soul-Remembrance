# Soul Remembrance — App Store & Google Play Store Listing

## App Details

| Field | Value |
|-------|-------|
| **App Name** | Soul Remembrance |
| **Subtitle (iOS)** | Find Your Healer. Book. Heal. |
| **Short Description (Android)** | Discover spiritual practitioners, book sessions, and reconnect with yourself. |
| **Bundle ID** | com.soulremembrance.app |
| **Category (iOS)** | Health & Fitness |
| **Category (Android)** | Health & Fitness |
| **Content Rating** | 4+ (iOS) / Everyone (Android) |
| **Price** | Free (in-app purchases) |
| **Primary Language** | English (UK) |

---

## App Description (4,000 char limit — iOS & Android)

```
Remember who you are.

Soul Remembrance is the UK's leading platform for discovering and booking qualified spiritual wellness practitioners — from sound healers and breathwork facilitators to Reiki masters and somatic therapists.

Whether you're navigating grief, seeking clarity, or simply ready to go deeper into your own healing, Soul Remembrance connects you with verified practitioners who hold sacred space for your journey.

— DISCOVER YOUR HEALER —
Browse hundreds of verified spiritual wellness practitioners across every modality. Filter by specialty, location, and availability. Read genuine client reviews. Find the one who resonates.

— BOOK WITH EASE —
See real-time availability and book sessions in seconds — online or in-person. Secure payments through Stripe. Instant confirmation by email and push notification.

— COMMUNITY & EVENTS —
Join a growing community of seekers. Share your healing journey in the community feed. Discover live events, online circles, and sacred workshops happening near you.

— DIRECT MESSAGING —
Connect with your practitioner directly through the app. Ask questions before your session, share intentions, and maintain your healing relationship.

— YOUR HEALING JOURNEY —
Track your booked sessions in one place. Receive reminders before each session so you arrive prepared, present, and open.

— FOR PRACTITIONERS —
Soul Remembrance is also home to a thriving community of practitioners. Apply to list your profile, showcase your modalities, and grow your healing practice with clients who are truly ready.

Modalities on Soul Remembrance include:
• Sound Healing & Singing Bowls
• Breathwork & Pranayama
• Reiki & Energy Healing
• Somatic Therapy
• Spiritual Coaching
• Shamanic Healing
• Meditation Guidance
• Human Design & Gene Keys
• Past Life Regression
• Trauma-Informed Support
• And many more

Your healing is not a luxury. It is a remembrance.

Soul Remembrance — Remember who YOU are.
```

---

## Keywords (iOS — 100 chars max, comma-separated)

```
spiritual healing,reiki,breathwork,sound healing,wellness,meditation,holistic,energy healing,healer
```

---

## What's New (Version 1.0.0)

```
Welcome to Soul Remembrance ✨

We're so glad you're here. This is the beginning of something beautiful — a place where healing meets technology, and where you are always welcome exactly as you are.

Version 1.0 brings you the full Soul Remembrance experience:
• Discover and book verified spiritual practitioners
• Real-time availability and instant booking
• Community feed and live events
• Direct messaging with your practitioners
• Secure payments and booking reminders

Remember who you are.
```

---

## Support & Privacy URLs

| Field | Value |
|-------|-------|
| **Support URL** | https://soulremembrance.co.uk/support |
| **Privacy Policy URL** | https://soulremembrance.co.uk/privacy |
| **Marketing URL** | https://soulremembrance.co.uk |
| **Support Email** | soulremembrance@outlook.com |

---

## Age Rating Questionnaire (iOS)

| Category | Rating |
|----------|--------|
| Cartoon or Fantasy Violence | None |
| Realistic Violence | None |
| Sexual Content or Nudity | None |
| Profanity or Crude Humour | None |
| Alcohol, Tobacco, or Drug Use | None |
| Mature/Suggestive Themes | None |
| Simulated Gambling | None |
| Horror/Fear Themes | None |
| Prolonged Graphic Sadism | None |
| Unrestricted Web Access | None |

**Result: 4+**

---

## In-App Purchases (App Store Connect)

| Name | Type | Price |
|------|------|-------|
| Practitioner Monthly Subscription | Auto-Renewable Subscription | £3.99/month |
| Featured Practitioner Boost | Non-Consumable | £4.99/30 days |

---

## Screenshots Required

### iPhone (6.9" — required)
Minimum 3, maximum 10 screenshots at 1320×2868 or 1290×2796 px

Suggested shots:
1. **Home screen** — "Discover healers near you" — show the practitioner cards and modality filters
2. **Practitioner profile** — "Find the healer who resonates" — show star rating, bio, booking button
3. **Booking screen** — "Book in seconds" — show the calendar availability selector and time slots
4. **Community feed** — "Join a community of seekers" — show the post feed and circle filters
5. **Messages** — "Stay connected with your healer" — show a conversation thread

### iPad (optional)
Only required if `supportsTablet: true` — currently disabled.

### Google Play (required)
- **Feature Graphic**: 1024×500 px PNG/JPG (shown at top of Play Store listing)
- **Phone Screenshots**: 16:9 or 9:16, min 320px, max 3840px, minimum 2 required
- **Icon**: 512×512 px (auto-generated from adaptive icon config)

---

## App Store Review Notes (for Apple reviewer)

```
Soul Remembrance is a marketplace for spiritual wellness practitioners (e.g. breathwork, 
sound healing, Reiki). It is similar in concept to a therapy booking platform.

Test Account (if needed):
- The app requires Google Sign-In. You can create a test account using any Google account.
- No real payments are processed in the review build; Stripe is in test mode.

In-App Purchases:
- Practitioner subscriptions (£3.99/month) allow wellness practitioners to list their 
  profiles. End-users (clients) do not pay a subscription — only booking fees apply.
- The Featured Practitioner boost (£4.99) is a promotional placement for practitioners.

Push Notifications:
- Used only for booking confirmations and session reminders. Users opt-in via the 
  standard iOS permission prompt.

Calendar Access:
- Used to add booked sessions to the user's calendar and schedule reminders. Access 
  is requested only when the user completes a booking.

No content generated by users is displayed without passing through community guidelines.
```

---

## EAS Build Commands (run from `artifacts/mobile/`)

```bash
# First-time setup
npx eas-cli login
npx eas-cli init          # Creates your EAS project and fills in projectId

# Development build (iOS Simulator)
npx eas-cli build --profile development --platform ios

# Preview build (physical device, internal distribution)
npx eas-cli build --profile preview --platform all

# Production build
npx eas-cli build --profile production --platform all

# Submit to stores
npx eas-cli submit --profile production --platform ios
npx eas-cli submit --profile production --platform android
```

### Before building — fill in these placeholders in app.json & eas.json:

| Placeholder | Where to find it |
|-------------|-----------------|
| `REPLACE_WITH_YOUR_EXPO_USERNAME` | Your Expo account username at expo.dev |
| `REPLACE_WITH_YOUR_EAS_PROJECT_ID` | Run `npx eas-cli init` — it fills this in automatically |
| `REPLACE_WITH_YOUR_APPLE_ID` | Your Apple Developer account email |
| `REPLACE_WITH_APP_STORE_CONNECT_APP_ID` | App Store Connect → App → General → Apple ID |
| `REPLACE_WITH_YOUR_APPLE_TEAM_ID` | developer.apple.com → Membership → Team ID |
| `./google-service-account.json` | Google Play Console → API access → Service Accounts |
| `./google-services.json` | Firebase Console → Project Settings → Android app |

---

## Google Play Store Listing

**Title:** Soul Remembrance: Find Your Healer

**Short Description (80 chars):**
```
Discover & book spiritual wellness practitioners. Heal. Remember.
```

**Full Description (4,000 chars):**
*(Use the same text as the iOS description above — it meets Google's guidelines)*

**Tags / Target Audience:**
- Spirituality
- Wellness & Fitness
- Meditation
- Alternative Medicine
- Self-Care

---

*Generated for Soul Remembrance v1.0.0*

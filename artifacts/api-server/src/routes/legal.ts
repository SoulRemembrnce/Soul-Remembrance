import { Router, type IRouter } from "express";

const router: IRouter = Router();

const BRAND = "#2D1B69";
const GOLD = "#C9A84C";
const CONTACT_EMAIL = "soulremembrance@outlook.com";
const LAST_UPDATED = "June 2026";

function page(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — Soul Remembrance</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      background: #f8f5ff;
      color: #2c2c2c;
      line-height: 1.65;
    }
    header {
      background: ${BRAND};
      padding: 28px 24px 24px;
      text-align: center;
    }
    header h1 { color: #fff; font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    header p  { color: rgba(255,255,255,0.55); font-size: 13px; }
    main {
      max-width: 740px;
      margin: 32px auto;
      padding: 0 20px 80px;
    }
    .intro {
      background: #fff;
      border: 1px solid #e9e0ff;
      border-radius: 14px;
      padding: 20px 24px;
      margin-bottom: 20px;
      font-size: 14px;
      color: #555;
      text-align: center;
    }
    section {
      background: #fff;
      border: 1px solid #e9e0ff;
      border-radius: 14px;
      padding: 22px 24px;
      margin-bottom: 14px;
    }
    section h2 {
      font-size: 15px;
      font-weight: 700;
      color: ${BRAND};
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    section h2 .num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px; height: 24px;
      border-radius: 50%;
      background: #ede8ff;
      color: ${BRAND};
      font-size: 11px;
      flex-shrink: 0;
    }
    p { font-size: 13.5px; color: #3a3a3a; margin-bottom: 10px; }
    p:last-child { margin-bottom: 0; }
    ul { padding-left: 0; list-style: none; }
    ul li {
      font-size: 13.5px;
      color: #3a3a3a;
      padding: 5px 0 5px 18px;
      position: relative;
    }
    ul li::before {
      content: "";
      position: absolute;
      left: 0; top: 13px;
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #6B4FA8;
    }
    .contact {
      background: ${BRAND};
      border-radius: 14px;
      padding: 28px 24px;
      text-align: center;
      margin-top: 24px;
    }
    .contact p { color: rgba(255,255,255,0.75); font-size: 13px; margin-bottom: 8px; }
    .contact a {
      color: ${GOLD};
      font-weight: 600;
      font-size: 14px;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <header>
    <h1>${title}</h1>
    <p>Last updated ${LAST_UPDATED}</p>
  </header>
  <main>
    ${body}
  </main>
</body>
</html>`;
}

function section(num: number, title: string, content: string): string {
  return `<section>
    <h2><span class="num">${num}</span>${title}</h2>
    ${content}
  </section>`;
}

function paras(...texts: string[]): string {
  return texts.map((t) => `<p>${t.replace(/\n/g, "<br/>")}</p>`).join("\n");
}

function list(...items: string[]): string {
  return `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
}

// ── GET /privacy ───────────────────────────────────────────────────────────────
router.get("/privacy", (_req, res): void => {
  const body = `
  <div class="intro">Your privacy matters to us. This policy explains what personal data Soul Remembrance collects, why we collect it, and the rights you have under GDPR and UK GDPR.</div>

  ${section(1, "Who We Are", paras(
    `Soul Remembrance ("we", "us", "our") operates the Soul Remembrance mobile application. We are the data controller responsible for your personal data.`,
    `Questions or requests: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>`
  ))}

  ${section(2, "Data We Collect", list(
    "Account data — your name, email address, and profile photo when you sign in or create an account.",
    "Practitioner profile data — professional title, bio, location, modalities, hourly rate, qualifications, and subscription status.",
    "Booking & payment data — session dates, amounts, and Stripe payment tokens. We do not store full card numbers.",
    "Messages — conversation content between you and practitioners or clients, stored in Firebase Firestore.",
    "Location — approximate city/region you provide manually; GPS is used only locally to sort nearby practitioners and is never stored on our servers.",
    "Usage data — standard app diagnostics via Firebase which may include device type, OS version, and session length."
  ))}

  ${section(3, "How We Use Your Data", list(
    "To provide and personalise the Soul Remembrance service.",
    "To process bookings and payments through Stripe.",
    "To connect clients with practitioners.",
    "To send service-related notifications such as booking confirmations and reminders.",
    "To improve app performance and fix bugs via Firebase Analytics and Crashlytics.",
    "To comply with legal and regulatory obligations."
  ))}

  ${section(4, "Legal Basis (GDPR)", paras(
    "We process your data under the following legal bases:",
    "• <strong>Contract</strong> — processing needed to fulfil your bookings or subscription.<br/>• <strong>Legitimate interest</strong> — security, fraud prevention, and improving our service.<br/>• <strong>Consent</strong> — optional features such as location sorting and marketing communications. You can withdraw consent at any time in Settings.<br/>• <strong>Legal obligation</strong> — retaining financial records as required by law."
  ))}

  ${section(5, "Third-Party Processors", paras(
    "We share data only with trusted processors:",
    "• <strong>Google / Firebase</strong> — authentication, database (Firestore), file storage, and analytics. Data is processed under Google's Data Processing Agreement.<br/>• <strong>Stripe</strong> — payment processing and practitioner payouts (Stripe Connect). Stripe is PCI-DSS Level 1 certified.",
    "We do not sell your data to any third party for advertising purposes."
  ))}

  ${section(6, "Data Retention", paras(
    "We retain your account and profile data for as long as your account is active. If you delete your account:",
    "• Your profile is removed from the app within 30 days.<br/>• Financial records are retained for 7 years to meet legal obligations.<br/>• Backups may retain data for up to 90 days before being purged."
  ))}

  ${section(7, "Your Rights (GDPR)", list(
    "Right to access — request a copy of the personal data we hold about you.",
    "Right to rectification — ask us to correct inaccurate or incomplete data.",
    "Right to erasure — request deletion of your data, subject to legal retention obligations.",
    "Right to restriction — ask us to limit how we process your data.",
    "Right to data portability — receive your data in a structured, machine-readable format.",
    "Right to object — object to processing based on legitimate interest or for direct marketing.",
    "Right to withdraw consent — where we rely on consent, you can withdraw it at any time."
  ))}

  ${section(8, "How to Exercise Your Rights", paras(
    `Email us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> with your request and we will respond within 30 days. You also have the right to lodge a complaint with the Information Commissioner's Office at <a href="https://ico.org.uk" target="_blank">ico.org.uk</a>.`
  ))}

  ${section(9, "Security", paras(
    "We use industry-standard security measures including Firebase Security Rules, HTTPS/TLS for all data in transit, and Stripe's PCI-compliant infrastructure for payment data.",
    "No method of transmission or storage is 100% secure, but we are committed to protecting your data."
  ))}

  ${section(10, "Children", paras(
    "Soul Remembrance is not intended for users under the age of 18. We do not knowingly collect personal data from children. If you believe a child has provided us data, please contact us and we will delete it promptly."
  ))}

  ${section(11, "Changes to This Policy", paras(
    "We may update this Privacy Policy from time to time. We will notify you of significant changes via the app or by email. Continued use of the app after changes are posted constitutes acceptance of the updated policy."
  ))}

  <div class="contact">
    <p>Questions or requests about your data?</p>
    <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>
  </div>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(page("Privacy Policy", body));
});

// ── GET /terms ─────────────────────────────────────────────────────────────────
router.get("/terms", (_req, res): void => {
  const body = `
  <div class="intro">Please read these Terms carefully before using Soul Remembrance. They explain your rights and responsibilities as a user or practitioner on our platform.</div>

  ${section(1, "Acceptance of Terms", paras(
    `By downloading, installing, or using the Soul Remembrance app you agree to be bound by these Terms of Service. If you do not agree, please do not use the App.`,
    "We may update these Terms from time to time — continued use of the App after changes are posted constitutes acceptance."
  ))}

  ${section(2, "Eligibility", list(
    "You must be at least 18 years old to use Soul Remembrance.",
    "By using the App you confirm you have the legal capacity to enter into these Terms.",
    "Practitioners must hold any licences or qualifications required by their professional body to offer the services they list."
  ))}

  ${section(3, "Account Responsibilities", list(
    "You are responsible for keeping your login credentials secure. Do not share your account.",
    "You must provide accurate and complete information when creating your account or practitioner profile.",
    "You are responsible for all activity that occurs under your account.",
    `Notify us immediately at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> if you suspect unauthorised access.`
  ))}

  ${section(4, "Practitioner Listings", paras(
    "Practitioners who list services on Soul Remembrance are independent third parties and are not employees or agents of Soul Remembrance. They are solely responsible for the services they provide.",
    "Practitioners must hold appropriate professional indemnity insurance and any required DBS checks, and must only offer services within their scope of competence.",
    "Soul Remembrance does not endorse, warrant, or guarantee the services of any practitioner listed on the App."
  ))}

  ${section(5, "Bookings & Payments", list(
    "Bookings are agreements between you (the client) and the practitioner — Soul Remembrance facilitates but is not a party to the service.",
    "Payments are processed securely by Stripe. We do not store your card details.",
    "Practitioners receive 97% of each booking; Soul Remembrance retains a 3% platform fee.",
    "Cancellation and refund policies are set by each practitioner. Check their profile before booking.",
    "Soul Remembrance is not liable for disputes between clients and practitioners arising from a session."
  ))}

  ${section(6, "Practitioner Subscriptions", paras(
    "Practitioners pay a monthly subscription to maintain an active listing on Soul Remembrance.",
    "• A 30-day free trial is available to new subscribers.<br/>• Subscriptions renew automatically each month until cancelled.<br/>• You may cancel at any time via your practitioner dashboard; access continues until the end of the billing period.<br/>• No refunds are issued for partial billing periods."
  ))}

  ${section(7, "Vendor Marketplace", paras(
    "Soul Remembrance operates a vendor marketplace where approved sellers can list physical and digital wellness products.",
    "• Vendors apply for a listing tier: Basic (£1.99/month), Verified (£2.99/month), or Featured (£4.99/month).<br/>• Vendor subscriptions renew monthly and may be cancelled at any time.<br/>• Soul Remembrance retains a 3% commission on all vendor sales processed through the platform.<br/>• Soul Remembrance reserves the right to approve, reject, or remove vendor listings at its sole discretion.<br/>• Vendors are solely responsible for the accuracy of product descriptions, fulfilment, and compliance with consumer law.<br/>• Soul Remembrance is not liable for disputes between buyers and vendors arising from product purchases."
  ))}

  ${section(8, "Prohibited Conduct", list(
    "Use the App for any unlawful purpose or in violation of any regulations.",
    "Post false, misleading, or fraudulent information in your profile or listings.",
    "Harass, abuse, or threaten other users or practitioners.",
    "Attempt to reverse engineer, scrape, or interfere with the App or its infrastructure.",
    "Use the App to offer or solicit services that are illegal, harmful, or outside your professional scope.",
    "Circumvent the platform to take payments outside the App in order to avoid platform fees."
  ))}

  ${section(9, "Intellectual Property", paras(
    "All content within the App — including the Soul Remembrance name, logo, design, and original text — is owned by or licensed to Soul Remembrance and protected by applicable intellectual property laws.",
    "You retain ownership of content you upload but grant Soul Remembrance a non-exclusive, royalty-free licence to display that content within the App for the purpose of providing the service."
  ))}

  ${section(10, "Disclaimers", paras(
    "Soul Remembrance is a platform connecting clients with independent wellness practitioners. We are not a healthcare provider and the App does not constitute medical advice.",
    "Nothing in the App should be relied upon as professional medical, psychological, or therapeutic advice. The App is provided \"as is\" without warranties of any kind."
  ))}

  ${section(11, "Limitation of Liability", paras(
    "To the maximum extent permitted by law, Soul Remembrance shall not be liable for any indirect, incidental, special, or consequential damages, or any harm arising from sessions booked through the App.",
    "Our total liability to you in any circumstances shall not exceed the total fees paid by you to Soul Remembrance in the 12 months preceding the claim."
  ))}

  ${section(12, "Governing Law", paras(
    "These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.",
    "If you are a consumer in another jurisdiction, you may also have rights under local consumer protection laws that cannot be excluded by these Terms."
  ))}

  <div class="contact">
    <p>Questions about these Terms?</p>
    <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>
  </div>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(page("Terms of Service", body));
});

// ── GET /delete-account ────────────────────────────────────────────────────────
router.get("/delete-account", (_req, res): void => {
  const body = `
  <div class="intro">You can delete your Soul Remembrance account at any time. Account deletion is permanent and cannot be undone.</div>

  ${section(1, "Delete Account In-App (Recommended)", paras(
    "The fastest way to delete your account is directly inside the app:",
    "1. Open the <strong>Soul Remembrance</strong> app<br/>2. Tap <strong>Profile</strong> → <strong>Settings</strong><br/>3. Scroll to the bottom and tap <strong>Delete Account</strong><br/>4. Confirm deletion when prompted",
    "Your account and all associated data will be permanently removed."
  ))}

  ${section(2, "Request Deletion by Email", paras(
    `If you cannot access the app, email us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> with the subject line <strong>"Account Deletion Request"</strong> and include the email address associated with your account.`,
    "We will process your request within 30 days."
  ))}

  ${section(3, "What Gets Deleted", list(
    "Your account credentials and login access",
    "Your profile, bio, photo, and all personal information",
    "Your messages and conversation history",
    "Your bookings and session records",
    "Your practitioner or vendor listings (if applicable)",
    "Any active subscriptions will be cancelled immediately"
  ))}

  ${section(4, "What We Retain", paras(
    "To comply with legal and financial obligations, we retain:",
    "• <strong>Financial transaction records</strong> — retained for 7 years as required by UK law.<br/>• <strong>Backup copies</strong> — may persist for up to 90 days before being purged from backups."
  ))}

  <div class="contact">
    <p>Need help with account deletion?</p>
    <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>
  </div>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(page("Delete Your Account", body));
});

export default router;

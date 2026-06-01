import { Router, type IRouter } from "express";

const router: IRouter = Router();

interface BookingEmailData {
  clientEmail: string;
  clientName: string;
  practitionerEmail?: string;
  practitionerName: string;
  serviceName: string;
  sessionDate: string;
  sessionTime: string;
  duration: string;
  sessionFormat: string;
  amountPaid: string;
  bookingRef: string;
}

// ── Client confirmation email — exact brand template ──────────────────────────
function buildClientEmail(d: BookingEmailData): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#EDE0FF;font-family:Georgia,serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">

  <div style="background:linear-gradient(160deg,#2D1B69 0%,#1A0F3D 50%,#6B4FA8 100%);border-radius:24px 24px 0 0;padding:48px 40px;text-align:center;">
    <div style="width:60px;height:60px;border-radius:18px;background:rgba(255,255,255,0.1);border:1.5px solid rgba(255,255,255,0.2);display:inline-block;line-height:60px;font-size:28px;margin-bottom:16px;">&#10022;</div>
    <p style="font-family:Georgia,serif;font-size:13px;color:white;margin:0 0 8px;letter-spacing:3px;">SOUL REMEMBRANCE</p>
    <p style="color:rgba(255,255,255,0.6);font-size:12px;letter-spacing:3px;margin:0;">BOOKING CONFIRMED</p>
  </div>

  <div style="background:#FAF5FF;padding:40px;">
    <p style="font-family:Georgia,serif;font-size:22px;color:#2D1B69;margin:0 0 20px;">Your session is booked, ${d.clientName} &#10022;</p>

    <p style="font-size:15px;color:#4A3570;line-height:1.9;margin-bottom:24px;">
      Something beautiful is about to unfold. Your session has been confirmed and we cannot wait for you to experience it.
    </p>

    <div style="background:linear-gradient(135deg,#2D1B69,#7B5EA7);border-radius:18px;padding:24px;margin-bottom:24px;">
      <p style="font-size:11px;color:rgba(201,168,76,0.8);letter-spacing:3px;margin:0 0 16px;">&#10022; &nbsp; SESSION DETAILS &nbsp; &#10022;</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="font-size:13px;color:rgba(255,255,255,0.6);padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.1);">Practitioner</td><td style="font-size:13px;color:white;font-weight:700;text-align:right;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.1);">${d.practitionerName}</td></tr>
        <tr><td style="font-size:13px;color:rgba(255,255,255,0.6);padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.1);">Service</td><td style="font-size:13px;color:white;font-weight:700;text-align:right;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.1);">${d.serviceName}</td></tr>
        <tr><td style="font-size:13px;color:rgba(255,255,255,0.6);padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.1);">Date</td><td style="font-size:13px;color:white;font-weight:700;text-align:right;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.1);">${d.sessionDate}</td></tr>
        <tr><td style="font-size:13px;color:rgba(255,255,255,0.6);padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.1);">Time</td><td style="font-size:13px;color:white;font-weight:700;text-align:right;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.1);">${d.sessionTime}</td></tr>
        <tr><td style="font-size:13px;color:rgba(255,255,255,0.6);padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.1);">Duration</td><td style="font-size:13px;color:white;font-weight:700;text-align:right;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.1);">${d.duration}</td></tr>
        <tr><td style="font-size:13px;color:rgba(255,255,255,0.6);padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.1);">Format</td><td style="font-size:13px;color:white;font-weight:700;text-align:right;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.1);">${d.sessionFormat}</td></tr>
        <tr><td style="font-size:16px;color:#C9A84C;padding:10px 0 0;font-weight:700;">Total Paid</td><td style="font-size:18px;color:#C9A84C;font-weight:700;text-align:right;padding:10px 0 0;">${d.amountPaid}</td></tr>
      </table>
    </div>

    <div style="background:linear-gradient(135deg,rgba(45,27,105,0.06),rgba(123,94,167,0.08));border:1px solid #DDD0F0;border-radius:16px;padding:18px 20px;margin-bottom:24px;">
      <p style="font-family:Georgia,serif;font-size:14px;font-weight:bold;color:#2D1B69;margin:0 0 10px;">Before Your Session</p>
      <p style="font-size:13px;color:#4A3570;line-height:1.8;margin:0 0 6px;">&#10022; &nbsp; Find a quiet, comfortable space where you will not be disturbed</p>
      <p style="font-size:13px;color:#4A3570;line-height:1.8;margin:0 0 6px;">&#10022; &nbsp; Drink a glass of water and take a few gentle breaths</p>
      <p style="font-size:13px;color:#4A3570;line-height:1.8;margin:0 0 6px;">&#10022; &nbsp; Set an intention for what you wish to release or receive</p>
      <p style="font-size:13px;color:#4A3570;line-height:1.8;margin:0;">&#10022; &nbsp; You are ready. Trust the process.</p>
    </div>

    <div style="background:#EEE5FF;border-radius:14px;padding:14px 16px;margin-bottom:24px;">
      <p style="font-size:13px;color:#2D1B69;margin:0;line-height:1.7;">
        <strong>Need to cancel or reschedule?</strong><br>
        Please contact your practitioner directly through the Soul Remembrance app at least 48 hours before your session.
      </p>
    </div>

    <p style="text-align:center;color:#C9A84C;font-size:16px;letter-spacing:8px;margin:24px 0;">&#10022; &#10022; &#10022;</p>

    <div style="text-align:center;margin-bottom:32px;">
      <p style="font-size:15px;color:#4A3570;margin:0 0 6px;line-height:1.7;">We are holding space for your healing.</p>
      <p style="font-size:15px;color:#4A3570;margin:0;line-height:1.7;font-style:italic;">You deserve every moment of this.</p>
    </div>

    <hr style="border:none;border-top:1px solid #DDD0F0;margin:24px 0;">

    <div style="text-align:center;">
      <p style="font-size:14px;color:#6B4FA8;margin:0 0 8px;">With love,</p>
      <p style="font-family:Georgia,serif;font-size:19px;color:#2D1B69;font-weight:bold;margin:0 0 4px;letter-spacing:1px;">Remember who YOU are</p>
      <p style="font-family:Georgia,serif;font-size:12px;color:#9B7FD4;letter-spacing:2px;margin:0;">Soul Remembrance Team</p>
      <p style="font-size:12px;color:#C9A84C;margin:10px 0 0;letter-spacing:1px;">&#10022; &nbsp; soulremembrance@outlook.com &nbsp; &#10022;</p>
    </div>
  </div>

  <div style="background:#2D1B69;border-radius:0 0 24px 24px;padding:24px 40px;text-align:center;">
    <p style="font-size:11px;color:rgba(255,255,255,0.4);line-height:1.8;margin:0;">
      Booking reference: ${d.bookingRef}<br>
      &copy; 2025 Soul Remembrance &middot; All rights reserved
    </p>
  </div>
</div>
</body>
</html>`;
}

// ── Practitioner notification email ───────────────────────────────────────────
function buildPractitionerEmail(d: BookingEmailData): string {
  const numericAmount = parseFloat(d.amountPaid.replace(/[^0-9.]/g, ""));
  const earnings = isNaN(numericAmount)
    ? d.amountPaid
    : `£${(numericAmount * 0.975).toFixed(2)}`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#EDE0FF;font-family:Georgia,serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">

  <div style="background:linear-gradient(160deg,#2D1B69 0%,#1A0F3D 50%,#6B4FA8 100%);border-radius:24px 24px 0 0;padding:48px 40px;text-align:center;">
    <div style="width:60px;height:60px;border-radius:18px;background:rgba(255,255,255,0.1);border:1.5px solid rgba(255,255,255,0.2);display:inline-block;line-height:60px;font-size:28px;margin-bottom:16px;">&#10022;</div>
    <p style="font-family:Georgia,serif;font-size:13px;color:white;margin:0 0 8px;letter-spacing:3px;">SOUL REMEMBRANCE</p>
    <p style="color:rgba(255,255,255,0.6);font-size:12px;letter-spacing:3px;margin:0;">NEW BOOKING RECEIVED</p>
  </div>

  <div style="background:#FAF5FF;padding:40px;">
    <p style="font-family:Georgia,serif;font-size:22px;color:#2D1B69;margin:0 0 20px;">A new session awaits, ${d.practitionerName} &#10022;</p>

    <p style="font-size:15px;color:#4A3570;line-height:1.9;margin-bottom:24px;">
      A client has just confirmed a session with you. Everything is set — your next opportunity to hold healing space begins below.
    </p>

    <div style="background:linear-gradient(135deg,#2D1B69,#7B5EA7);border-radius:18px;padding:24px;margin-bottom:24px;">
      <p style="font-size:11px;color:rgba(201,168,76,0.8);letter-spacing:3px;margin:0 0 16px;">&#10022; &nbsp; SESSION DETAILS &nbsp; &#10022;</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="font-size:13px;color:rgba(255,255,255,0.6);padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.1);">Client</td><td style="font-size:13px;color:white;font-weight:700;text-align:right;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.1);">${d.clientName}</td></tr>
        <tr><td style="font-size:13px;color:rgba(255,255,255,0.6);padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.1);">Service</td><td style="font-size:13px;color:white;font-weight:700;text-align:right;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.1);">${d.serviceName}</td></tr>
        <tr><td style="font-size:13px;color:rgba(255,255,255,0.6);padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.1);">Date</td><td style="font-size:13px;color:white;font-weight:700;text-align:right;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.1);">${d.sessionDate}</td></tr>
        <tr><td style="font-size:13px;color:rgba(255,255,255,0.6);padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.1);">Time</td><td style="font-size:13px;color:white;font-weight:700;text-align:right;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.1);">${d.sessionTime}</td></tr>
        <tr><td style="font-size:13px;color:rgba(255,255,255,0.6);padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.1);">Duration</td><td style="font-size:13px;color:white;font-weight:700;text-align:right;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.1);">${d.duration}</td></tr>
        <tr><td style="font-size:13px;color:rgba(255,255,255,0.6);padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.1);">Format</td><td style="font-size:13px;color:white;font-weight:700;text-align:right;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.1);">${d.sessionFormat}</td></tr>
        <tr><td style="font-size:16px;color:#C9A84C;padding:10px 0 0;font-weight:700;">Your Earnings</td><td style="font-size:18px;color:#C9A84C;font-weight:700;text-align:right;padding:10px 0 0;">${earnings}</td></tr>
      </table>
    </div>

    <div style="background:linear-gradient(135deg,rgba(45,27,105,0.06),rgba(123,94,167,0.08));border:1px solid #DDD0F0;border-radius:16px;padding:18px 20px;margin-bottom:24px;">
      <p style="font-family:Georgia,serif;font-size:14px;font-weight:bold;color:#2D1B69;margin:0 0 10px;">Preparing for Your Client</p>
      <p style="font-size:13px;color:#4A3570;line-height:1.8;margin:0 0 6px;">&#10022; &nbsp; Review any notes or intentions shared by the client in the app</p>
      <p style="font-size:13px;color:#4A3570;line-height:1.8;margin:0 0 6px;">&#10022; &nbsp; Prepare your space — clear, calm and ready to hold healing</p>
      <p style="font-size:13px;color:#4A3570;line-height:1.8;margin:0 0 6px;">&#10022; &nbsp; If online, test your video link in the Soul Remembrance app</p>
      <p style="font-size:13px;color:#4A3570;line-height:1.8;margin:0;">&#10022; &nbsp; Trust your gifts. They chose you for a reason.</p>
    </div>

    <div style="background:#EEE5FF;border-radius:14px;padding:14px 16px;margin-bottom:24px;">
      <p style="font-size:13px;color:#2D1B69;margin:0;line-height:1.7;">
        <strong>Need to cancel?</strong><br>
        Please notify your client at least 48 hours in advance through the Soul Remembrance app so they can make alternative arrangements.
      </p>
    </div>

    <p style="text-align:center;color:#C9A84C;font-size:16px;letter-spacing:8px;margin:24px 0;">&#10022; &#10022; &#10022;</p>

    <div style="text-align:center;margin-bottom:32px;">
      <p style="font-size:15px;color:#4A3570;margin:0 0 6px;line-height:1.7;">Thank you for the healing you bring to the world.</p>
      <p style="font-size:15px;color:#4A3570;margin:0;line-height:1.7;font-style:italic;">Your work matters more than you know.</p>
    </div>

    <hr style="border:none;border-top:1px solid #DDD0F0;margin:24px 0;">

    <div style="text-align:center;">
      <p style="font-size:14px;color:#6B4FA8;margin:0 0 8px;">With gratitude,</p>
      <p style="font-family:Georgia,serif;font-size:19px;color:#2D1B69;font-weight:bold;margin:0 0 4px;letter-spacing:1px;">Remember who YOU are</p>
      <p style="font-family:Georgia,serif;font-size:12px;color:#9B7FD4;letter-spacing:2px;margin:0;">Soul Remembrance Team</p>
      <p style="font-size:12px;color:#C9A84C;margin:10px 0 0;letter-spacing:1px;">&#10022; &nbsp; soulremembrance@outlook.com &nbsp; &#10022;</p>
    </div>
  </div>

  <div style="background:#2D1B69;border-radius:0 0 24px 24px;padding:24px 40px;text-align:center;">
    <p style="font-size:11px;color:rgba(255,255,255,0.4);line-height:1.8;margin:0;">
      Booking reference: ${d.bookingRef}<br>
      &copy; 2025 Soul Remembrance &middot; All rights reserved
    </p>
  </div>
</div>
</body>
</html>`;
}

// ── Send via Resend ───────────────────────────────────────────────────────────
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  log: { info: (obj: object, msg: string) => void; error: (obj: object, msg: string) => void }
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    log.info({ to, subject }, "RESEND_API_KEY not set — email logged only");
    return false;
  }

  const from =
    process.env.RESEND_FROM_EMAIL ??
    "Soul Remembrance <noreply@soul-remembrance.co.uk>";

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Resend ${resp.status}: ${body}`);
  }
  return true;
}

// ── POST /api/emails/booking-confirmation ─────────────────────────────────────
router.post("/emails/booking-confirmation", async (req, res): Promise<void> => {
  const {
    clientEmail,
    clientName,
    practitionerEmail,
    practitionerName,
    serviceName,
    sessionDate,
    sessionTime,
    duration,
    sessionFormat,
    amountPaid,
    bookingRef,
  } = req.body as BookingEmailData;

  if (!clientEmail || !clientName || !practitionerName || !serviceName) {
    res.status(400).json({
      error: "clientEmail, clientName, practitionerName, and serviceName are required",
    });
    return;
  }

  const data: BookingEmailData = {
    clientEmail,
    clientName,
    practitionerEmail,
    practitionerName,
    serviceName: serviceName ?? "Healing Session",
    sessionDate: sessionDate ?? "",
    sessionTime: sessionTime ?? "",
    duration: duration ?? "",
    sessionFormat: sessionFormat ?? "",
    amountPaid: amountPaid ?? "",
    bookingRef: bookingRef ?? `SR-${Date.now().toString(36).toUpperCase().slice(-6)}`,
  };

  const results = { clientSent: false, practitionerSent: false };

  // Send to client
  try {
    results.clientSent = await sendEmail(
      clientEmail,
      `Your booking is confirmed — ${serviceName} with ${practitionerName}`,
      buildClientEmail(data),
      req.log
    );
    req.log.info({ to: clientEmail, ref: data.bookingRef }, "Client confirmation email sent");
  } catch (err) {
    req.log.error({ err }, "Failed to send client confirmation email");
  }

  // Send to practitioner (if email provided)
  if (practitionerEmail) {
    try {
      results.practitionerSent = await sendEmail(
        practitionerEmail,
        `New booking: ${serviceName} on ${sessionDate}`,
        buildPractitionerEmail(data),
        req.log
      );
      req.log.info(
        { to: practitionerEmail, ref: data.bookingRef },
        "Practitioner notification email sent"
      );
    } catch (err) {
      req.log.error({ err }, "Failed to send practitioner notification email");
    }
  }

  res.json({ success: true, ...results });
});

export default router;

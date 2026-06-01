import { Router, type IRouter } from "express";
import { sendPushToUser } from "../lib/sendPush";

const router: IRouter = Router();

interface BookingPushBody {
  clientUserId: string;
  practitionerUserId: string;
  practitionerName: string;
  clientName?: string;
  serviceName?: string;
  sessionDate?: string;
  sessionTime?: string;
}

/**
 * POST /api/notifications/booking-confirmed
 *
 * Sends push notifications to both parties after a booking is paid.
 * Called by the mobile app immediately after Stripe payment succeeds.
 *
 * Body: { clientUserId, practitionerUserId, practitionerName, clientName?,
 *         serviceName?, sessionDate?, sessionTime? }
 */
router.post("/notifications/booking-confirmed", async (req, res): Promise<void> => {
  const {
    clientUserId,
    practitionerUserId,
    practitionerName,
    clientName,
    serviceName,
    sessionDate,
    sessionTime,
  } = req.body as BookingPushBody;

  if (!clientUserId || !practitionerUserId || !practitionerName) {
    res.status(400).json({
      error: "clientUserId, practitionerUserId, and practitionerName are required",
    });
    return;
  }

  const dateStr =
    sessionDate && sessionTime ? ` on ${sessionDate} at ${sessionTime}` : "";
  const results = { clientPushed: false, practitionerPushed: false };

  // Notify the client that their booking is confirmed
  try {
    results.clientPushed = await sendPushToUser(
      clientUserId,
      "Booking confirmed! ✨",
      `Your ${serviceName ?? "session"} with ${practitionerName}${dateStr} is booked.`,
      { screen: "bookings" }
    );
    req.log.info({ userId: clientUserId, sent: results.clientPushed }, "Client booking push");
  } catch (err) {
    req.log.error({ err, userId: clientUserId }, "Failed to push booking confirmation to client");
  }

  // Notify the practitioner of the new booking
  try {
    results.practitionerPushed = await sendPushToUser(
      practitionerUserId,
      "New booking! 📅",
      `${clientName || "A client"} has booked${dateStr ? ` a session with you${dateStr}` : " a session with you"}.`,
      { screen: "sessions" }
    );
    req.log.info(
      { userId: practitionerUserId, sent: results.practitionerPushed },
      "Practitioner new-booking push"
    );
  } catch (err) {
    req.log.error({ err, userId: practitionerUserId }, "Failed to push new booking to practitioner");
  }

  res.json({ success: true, ...results });
});

export default router;

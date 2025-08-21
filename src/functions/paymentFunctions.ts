import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onCall } from "firebase-functions/v2/https";

const db = admin.firestore();

interface PaymentResult {
  success: boolean;
  paymentId: string;
}

// Payment Processing Function (Callable)
export const processPayment = onCall(async (request) => {
  try {
    const { appointmentId, amount, paymentMethod } = request.data;

    // Validate request
    if (!appointmentId || !amount || !paymentMethod) {
      throw new Error("Missing required payment information");
    }

    logger.info(`Processing payment for appointment ${appointmentId}`);

    // Here you would integrate with your payment processor
    // For now, we'll simulate a successful payment
    const paymentResult = (await simulatePaymentProcessing(
      amount,
      paymentMethod
    )) as PaymentResult;

    if (paymentResult.success) {
      // Update appointment with payment status
      await db.collection("appointments").doc(appointmentId).update({
        paymentStatus: "completed",
        paymentId: paymentResult.paymentId,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, paymentId: paymentResult.paymentId };
    } else {
      throw new Error("Payment processing failed");
    }
  } catch (error) {
    logger.error("Error in processPayment:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Payment processing failed: ${errorMessage}`);
  }
});

// Helper Functions
/**
 * Simulates payment processing (replace with actual payment processor)
 * @param {number} amount - Payment amount
 * @param {string} paymentMethod - Payment method used
 * @return {Promise<PaymentResult>} Payment processing result
 */
async function simulatePaymentProcessing(
  amount: number,
  paymentMethod: string
): Promise<PaymentResult> {
  // Simulate payment processing - replace with actual payment processor integration
  logger.info(`Processing ${amount} via ${paymentMethod}`);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        paymentId: `pay_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
      });
    }, 1000);
  });
}

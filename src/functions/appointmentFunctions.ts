import * as logger from "firebase-functions/logger";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";

interface AppointmentData {
  id: string;
  serviceProviderId?: string;
  customerId?: string;
  status: string;
}

// Appointment Notification Function
export const onAppointmentCreated = onDocumentCreated("appointments/{appointmentId}", async event => {
  try {
    const appointmentData = event.data?.data() as AppointmentData;
    if (!appointmentData) return;

    logger.info("New appointment created:", appointmentData);

    // Send notification to service provider
    if (appointmentData.serviceProviderId) {
      await sendNotificationToProvider(appointmentData);
    }

    // Send confirmation to customer
    if (appointmentData.customerId) {
      await sendConfirmationToCustomer(appointmentData);
    }
  } catch (error) {
    logger.error("Error in onAppointmentCreated:", error);
  }
});

// Appointment Status Update Function
export const onAppointmentUpdated = onDocumentUpdated("appointments/{appointmentId}", async event => {
  try {
    const beforeData = event.data?.before.data() as AppointmentData;
    const afterData = event.data?.after.data() as AppointmentData;

    if (!beforeData || !afterData) return;

    // Check if status changed
    if (beforeData.status !== afterData.status) {
      logger.info(`Appointment status changed from ${beforeData.status} to ${afterData.status}`);

      // Send status update notifications
      await sendStatusUpdateNotification(afterData);
    }
  } catch (error) {
    logger.error("Error in onAppointmentUpdated:", error);
  }
});

// Helper Functions
/**
 * Sends notification to service provider about new appointment
 * @param {AppointmentData} appointmentData - The appointment data
 */
async function sendNotificationToProvider(appointmentData: AppointmentData) {
  logger.info("Sending notification to provider:", appointmentData.serviceProviderId);
}

/**
 * Sends confirmation to customer about new appointment
 * @param {AppointmentData} appointmentData - The appointment data
 */
async function sendConfirmationToCustomer(appointmentData: AppointmentData) {
  logger.info("Sending confirmation to customer:", appointmentData.customerId);
}

/**
 * Sends status update notification for appointment
 * @param {AppointmentData} appointmentData - The appointment data
 */
async function sendStatusUpdateNotification(appointmentData: AppointmentData) {
  logger.info("Sending status update notification for appointment:", appointmentData.id);
}

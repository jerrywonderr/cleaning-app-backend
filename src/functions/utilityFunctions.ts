import * as logger from "firebase-functions/logger";
import { onRequest } from "firebase-functions/v2/https";

// Health Check Endpoint
/**
 * Health check endpoint for monitoring service status
 * @param {any} request - HTTP request object
 * @param {any} response - HTTP response object
 */
export const healthCheck = onRequest((request, response) => {
  response.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "Cleaning App Cloud Functions",
    version: "1.0.0",
  });
});

// System Status Endpoint
/**
 * System status endpoint for checking service health
 * @param {any} request - HTTP request object
 * @param {any} response - HTTP response object
 */
export const systemStatus = onRequest(async (request, response) => {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      firestore: "connected",
      functions: "running",
      environment: process.env.NODE_ENV || "development",
    };

    response.json(status);
  } catch (error) {
    logger.error("Error in systemStatus:", error);
    response.status(500).json({ error: "Internal server error" });
  }
});

// API Documentation Endpoint
/**
 * API documentation endpoint
 * @param {any} request - HTTP request object
 * @param {any} response - HTTP response object
 */
export const apiDocs = onRequest((request, response) => {
  response.json({
    name: "Cleaning App Cloud Functions API",
    version: "1.0.0",
    endpoints: {
      health: "/healthCheck",
      status: "/systemStatus",
      docs: "/apiDocs",
    },
    functions: {
      processPayment: "Callable function for processing payments",
      updateUserProfile: "Callable function for updating user profiles",
      onAppointmentCreated: "Firestore trigger for new appointments",
      onAppointmentUpdated: "Firestore trigger for appointment updates",
      onOfferCreated: "Firestore trigger for new offers",
    },
  });
});

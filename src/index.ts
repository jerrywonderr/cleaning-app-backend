/**
 * Firebase Cloud Functions for Cleaning App Backend
 *
 * This file serves as the main entry point for all cloud functions.
 * It initializes Firebase Admin and exports all function modules.
 *
 * @fileoverview Main entry point for Firebase Cloud Functions
 */

/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions";

// Initialize Firebase Admin
admin.initializeApp();

// Set global options for cost control
setGlobalOptions({ maxInstances: 10 });

// Import all functions from organized files
export {
  // Appointment Functions
  onAppointmentCreated,
  onAppointmentUpdated,
} from "./functions/appointmentFunctions";

export {
  // Offer Functions
  onOfferCreated,
} from "./functions/offerFunctions";

export {
  // User Functions
  updateUserProfile,
} from "./functions/userFunctions";

export {
  // Payment Functions
  processPayment,
} from "./functions/paymentFunctions";

export {
  apiDocs,
  // Utility Functions
  healthCheck,
  systemStatus,
} from "./functions/utilityFunctions";

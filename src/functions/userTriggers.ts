import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { OfferCategory, UserData, WorkingPreferences } from "../types";
import { generateGeohash } from "../utils/geohash";

const db = admin.firestore();

interface ServiceProviderProfile {
  id: string;
  userId: string;
  // Profile data is referenced from users collection, not duplicated
  services: Record<OfferCategory, boolean>;
  extraOptions: Record<string, boolean>;
  workingPreferences?: WorkingPreferences;
  isActive: boolean;
  rating: number;
  totalJobs: number;
  createdAt: admin.firestore.FieldValue | admin.firestore.Timestamp;
  updatedAt: admin.firestore.FieldValue | admin.firestore.Timestamp;
}

/**
 * Automatically create service provider profile when a new user is added
 */
export const onUserCreated = onDocumentCreated("users/{userId}", async event => {
  try {
    const userId = event.params.userId;
    const userData = event.data?.data() as UserData;

    if (!userData) {
      logger.error("No user data found for userId:", userId);
      return;
    }

    // Only create profile for service providers
    if (!userData.isServiceProvider) {
      logger.info(`User ${userId} is not a service provider, skipping profile creation`);
      return;
    }

    logger.info(`Creating service provider profile for new user: ${userId}`);

    // Create default service provider profile
    const serviceProviderProfile: ServiceProviderProfile = {
      id: userId,
      userId,
      // No profile duplication - reference the users collection
      services: {
        "classic-cleaning": false,
        "deep-cleaning": false,
        "end-of-tenancy": false,
      },
      extraOptions: {},
      workingPreferences: {
        serviceArea: {
          fullAddress: "",
          coordinates: {
            latitude: 0,
            longitude: 0,
          },
          country: "",
          countryCode: "",
          radius: 0,
          geohash: generateGeohash(0, 0, 7), // Default geohash for 0,0 coordinates
        },
        workingSchedule: {
          monday: { isActive: false, startTime: null, endTime: null },
          tuesday: { isActive: false, startTime: null, endTime: null },
          wednesday: { isActive: false, startTime: null, endTime: null },
          thursday: { isActive: false, startTime: null, endTime: null },
          friday: { isActive: false, startTime: null, endTime: null },
          saturday: { isActive: false, startTime: null, endTime: null },
          sunday: { isActive: false, startTime: null, endTime: null },
        },
      },
      isActive: false, // Default to inactive until they configure services
      rating: 0,
      totalJobs: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Save to serviceProviders collection (single source of truth)
    await db.collection("serviceProviders").doc(userId).set(serviceProviderProfile);

    logger.info(`Service provider profile created successfully for user: ${userId}`);
  } catch (error) {
    logger.error("Error creating service provider profile:", error);
  }
});

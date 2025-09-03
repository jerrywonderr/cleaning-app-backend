import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onCall } from "firebase-functions/v2/https";
import {
  OfferCategory,
  SearchServiceProvidersRequest,
  ServiceProviderResult,
  UpdateServiceProviderRequest,
  WorkingPreferences,
} from "../types";

const db = admin.firestore();

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - First latitude
 * @param {number} lon1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lon2 - Second longitude
 * @return {number} Distance in kilometers
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Update service provider settings and preferences
 * @param {UpdateServiceProviderRequest} request - The update request containing userId and provider data
 * @return {Promise<{success: boolean, message: string}>} Success status
 */
export const updateServiceProviderSettings = onCall(async (request): Promise<{ success: boolean; message: string }> => {
  try {
    const { userId, providerData }: UpdateServiceProviderRequest = request.data;

    // Validate authentication
    if (!request.auth || request.auth.uid !== userId) {
      throw new Error("Unauthorized");
    }

    logger.info(`Updating service provider profile for user: ${userId}`);

    // Update the serviceProviders collection (single source of truth)
    const updateData: {
      services: Record<OfferCategory, boolean>;
      extraOptions: Record<string, boolean>;
      workingPreferences?: WorkingPreferences;
      isActive: boolean;
      updatedAt: admin.firestore.FieldValue;
    } = {
      services: providerData.services,
      extraOptions: providerData.extraOptions,
      workingPreferences: providerData.workingPreferences,
      isActive: Object.values(providerData.services).some(service => service), // Active if any service is enabled
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("serviceProviders").doc(userId).update(updateData);

    logger.info(`Service provider profile updated successfully for user: ${userId}`);

    return { success: true, message: "Service provider profile updated successfully" };
  } catch (error) {
    logger.error("Error updating service provider profile:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to update service provider profile: ${errorMessage}`);
  }
});

/**
 * Search for service providers offering a specific service within a location
 * @param {SearchServiceProvidersRequest} request - The search request containing service type and location
 * @return {Promise<ServiceProviderResult[]>} Array of matching service providers
 */
export const searchServiceProviders = onCall(async (request): Promise<ServiceProviderResult[]> => {
  try {
    const { serviceType, location }: SearchServiceProvidersRequest = request.data;

    // Validate request
    if (!serviceType || !location || !location.latitude || !location.longitude) {
      throw new Error("Invalid request parameters");
    }

    logger.info(`Searching for ${serviceType} providers near ${location.latitude}, ${location.longitude}`);

    // Get service providers from Firestore
    const providersRef = db.collection("serviceProviders");

    // Query for active providers offering the specific service
    const snapshot = await providersRef
      .where("isActive", "==", true)
      .where(`services.${serviceType}`, "==", true)
      .get();

    const providers: ServiceProviderResult[] = [];

    for (const doc of snapshot.docs) {
      const provider = doc.data();

      // Check if location is within working area using serviceArea from workingPreferences
      if (provider.workingPreferences?.serviceArea) {
        const serviceArea = provider.workingPreferences.serviceArea;
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          serviceArea.latitude,
          serviceArea.longitude
        );

        // Check if the search location is within the provider's working area
        if (distance <= serviceArea.radius / 1000) {
          // Fetch user profile data from users collection
          const userDoc = await db.collection("users").doc(provider.userId).get();
          const userData = userDoc.data();

          providers.push({
            id: doc.id,
            userId: provider.userId,
            profile: {
              firstName: userData?.firstName || "",
              lastName: userData?.lastName || "",
              profileImage: userData?.profileImage,
              phone: userData?.phone || "",
            },
            services: provider.services,
            extraOptions: provider.extraOptions,
            workingPreferences: provider.workingPreferences,
            rating: provider.rating,
            totalJobs: provider.totalJobs,
            distance: Math.round(distance * 1000), // Distance in meters
          });
        }
      }
    }

    // Sort by distance
    providers.sort((a, b) => a.distance - b.distance);

    logger.info(`Found ${providers.length} service providers for ${serviceType}`);

    return providers;
  } catch (error) {
    logger.error("Error in searchServiceProviders:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to search service providers: ${errorMessage}`);
  }
});

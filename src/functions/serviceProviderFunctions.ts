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
import { calculateDistance, generateGeohash, getGeohashPrefixesForSearch } from "../utils/geohash";

const db = admin.firestore();

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
    let workingPreferences = providerData.workingPreferences;

    // Generate geohash if service area is provided
    if (workingPreferences?.serviceArea) {
      const serviceArea = workingPreferences.serviceArea;
      const geohash = generateGeohash(serviceArea.coordinates.latitude, serviceArea.coordinates.longitude, 7);

      workingPreferences = {
        ...workingPreferences,
        serviceArea: {
          ...serviceArea,
          geohash,
        },
      };
    }

    const updateData: {
      services: Record<OfferCategory, boolean>;
      extraOptions: Record<string, boolean>;
      workingPreferences?: WorkingPreferences;
      isActive: boolean;
      updatedAt: admin.firestore.FieldValue;
    } = {
      services: providerData.services,
      extraOptions: providerData.extraOptions,
      workingPreferences,
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

    // Get geohash prefixes for efficient spatial querying
    // We'll use a reasonable search radius (e.g., 50km) to get geohash prefixes
    const searchRadius = 50000; // 50km in meters
    const geohashPrefixes = getGeohashPrefixesForSearch(location.latitude, location.longitude, searchRadius);

    const providers: ServiceProviderResult[] = [];

    // Query providers using geohash prefixes for efficient spatial filtering
    for (const geohashPrefix of geohashPrefixes) {
      const providersRef = db.collection("serviceProviders");

      // Query for active providers offering the specific service with matching geohash prefix
      const snapshot = await providersRef
        .where("isActive", "==", true)
        .where(`services.${serviceType}`, "==", true)
        .where("workingPreferences.serviceArea.geohash", ">=", geohashPrefix)
        .where("workingPreferences.serviceArea.geohash", "<", geohashPrefix + "~") // ~ is the last character in base32
        .get();

      for (const doc of snapshot.docs) {
        const provider = doc.data();

        // Double-check location is within working area using precise distance calculation
        if (provider.workingPreferences?.serviceArea) {
          const serviceArea = provider.workingPreferences.serviceArea;
          const distance = calculateDistance(
            location.latitude,
            location.longitude,
            serviceArea.coordinates.latitude,
            serviceArea.coordinates.longitude
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

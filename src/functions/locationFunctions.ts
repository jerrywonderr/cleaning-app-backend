import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { defineSecret } from "firebase-functions/params";
import { onCall } from "firebase-functions/v2/https";

const db = admin.firestore();

// Define the Azure Maps API key as a secret parameter
const azureMapsKey = defineSecret("AZURE_MAPS_KEY");

interface LocationSearchRequest {
  query: string;
  countrySet?: string[];
  lat?: number;
  lon?: number;
  radius?: number;
  limit?: number;
}

interface AzureMapsResponse {
  results: Array<{
    id: string;
    type: string;
    score: number;
    address: {
      freeformAddress: string;
      country: string;
      countryCode: string;
      countryCodeISO3: string;
      countrySubdivision: string;
      countrySecondarySubdivision: string;
      municipality: string;
      municipalitySubdivision: string;
      streetName: string;
      streetNumber: string;
      postalCode: string;
      extendedPostalCode: string;
    };
    position: {
      lat: number;
      lon: number;
    };
    viewport: {
      topLeftPoint: {
        lat: number;
        lon: number;
      };
      btmRightPoint: {
        lat: number;
        lon: number;
      };
    };
  }>;
}

interface LocationAutocompleteResult {
  id: string;
  displayName: string;
  type: string;
  score: number;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    fullAddress: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Location autocomplete function using Azure Maps
 * @param {LocationSearchRequest} request - The search request parameters
 * @return {Promise<LocationAutocompleteResult[]>} Array of location suggestions
 */
export const locationAutocomplete = onCall({ secrets: [azureMapsKey] }, async request => {
  try {
    const { query, countrySet, lat, lon, radius = 50000, limit = 15 }: LocationSearchRequest = request.data;

    // Validate request
    if (!query || query.trim().length < 2) {
      throw new Error("Search query must be at least 2 characters long");
    }

    logger.info(`Location autocomplete search for: ${query}`);

    // Get Azure Maps API key from the new params system
    const mapsKey = azureMapsKey.value();
    if (!mapsKey) {
      throw new Error("Azure Maps API key not configured. Please set AZURE_MAPS_KEY secret.");
    }

    // Build Azure Maps API URL
    const baseUrl = "https://atlas.microsoft.com/search/address/json";
    const params = new URLSearchParams({
      "api-version": "1.0",
      query: query.trim(),
      limit: limit.toString(),
      radius: radius.toString(),
      "subscription-key": mapsKey,
    });

    // Add optional parameters
    if (countrySet && countrySet.length > 0) {
      params.append("countrySet", countrySet.join(","));
    }

    if (lat && lon) {
      params.append("lat", lat.toString());
      params.append("lon", lon.toString());
    }

    const url = `${baseUrl}?${params.toString()}`;

    // Make request to Azure Maps API
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Azure Maps API error: ${response.status} ${response.statusText}`);
    }

    const data: AzureMapsResponse = await response.json();

    // Transform Azure Maps response to our format
    const results: LocationAutocompleteResult[] = data.results.map(result => ({
      id: result.id,
      displayName: result.address.freeformAddress,
      type: result.type,
      score: result.score,
      address: {
        street: `${result.address.streetNumber || ""} ${result.address.streetName || ""}`.trim(),
        city: result.address.municipality || result.address.countrySecondarySubdivision || "",
        state: result.address.countrySubdivision || "",
        country: result.address.country || "",
        postalCode: result.address.postalCode || "",
        fullAddress: result.address.freeformAddress,
      },
      coordinates: {
        latitude: result.position.lat,
        longitude: result.position.lon,
      },
    }));

    // Log successful search
    logger.info(`Found ${results.length} location results for query: ${query}`);

    return results;
  } catch (error) {
    logger.error("Error in locationAutocomplete:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Location autocomplete failed: ${errorMessage}`);
  }
});

/**
 * Get location details from coordinates (reverse geocoding)
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @return {Promise<LocationAutocompleteResult>} Location details
 */
export const getLocationFromCoordinates = onCall({ secrets: [azureMapsKey] }, async request => {
  try {
    const { lat, lon } = request.data;

    // Validate coordinates
    if (!lat || !lon || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new Error("Invalid coordinates provided");
    }

    logger.info(`Getting location details for coordinates: ${lat}, ${lon}`);

    // Get Azure Maps API key from the new params system
    const mapsKey = azureMapsKey.value();
    if (!mapsKey) {
      throw new Error("Azure Maps API key not configured. Please set AZURE_MAPS_KEY secret.");
    }

    // Build Azure Maps reverse geocoding API URL
    const baseUrl = "https://atlas.microsoft.com/search/address/reverse/json";
    const params = new URLSearchParams({
      "api-version": "1.0",
      query: `${lat},${lon}`,
      "subscription-key": mapsKey,
    });

    const url = `${baseUrl}?${params.toString()}`;

    // Make request to Azure Maps API
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Azure Maps API error: ${response.status} ${response.statusText}`);
    }

    const data: AzureMapsResponse = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error("No location found for the provided coordinates");
    }

    // Get the first (most relevant) result
    const result = data.results[0];

    // Transform Azure Maps response to our format
    const locationDetails: LocationAutocompleteResult = {
      id: result.id,
      displayName: result.address.freeformAddress,
      type: result.type,
      score: result.score,
      address: {
        street: `${result.address.streetNumber || ""} ${result.address.streetName || ""}`.trim(),
        city: result.address.municipality || result.address.countrySecondarySubdivision || "",
        state: result.address.countrySubdivision || "",
        country: result.address.country || "",
        postalCode: result.address.postalCode || "",
        fullAddress: result.address.freeformAddress,
      },
      coordinates: {
        latitude: result.position.lat,
        longitude: result.position.lon,
      },
    };

    logger.info(`Found location: ${locationDetails.displayName}`);

    return locationDetails;
  } catch (error) {
    logger.error("Error in getLocationFromCoordinates:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to get location from coordinates: ${errorMessage}`);
  }
});

/**
 * Save user's preferred location to Firestore
 * @param {string} userId - The user ID
 * @param {LocationAutocompleteResult} location - The selected location
 * @return {Promise<{success: boolean, message: string}>} Success status
 */
export const saveUserLocation = onCall(async request => {
  try {
    const { userId, location } = request.data;

    // Validate user authentication
    if (!request.auth) {
      throw new Error("User must be authenticated");
    }

    if (request.auth.uid !== userId) {
      throw new Error("User can only update their own location");
    }

    // Validate location data
    if (!location || !location.coordinates || !location.address) {
      throw new Error("Invalid location data provided");
    }

    // Save location to Firestore
    await db
      .collection("users")
      .doc(userId)
      .update({
        preferredLocation: {
          ...location,
          savedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    logger.info(`Saved location for user ${userId}: ${location.displayName}`);

    return { success: true, message: "Location saved successfully" };
  } catch (error) {
    logger.error("Error in saveUserLocation:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to save location: ${errorMessage}`);
  }
});

/**
 * Get nearby service providers based on location
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} radius - Search radius in meters (default: 10000)
 * @param {number} limit - Maximum results (default: 20)
 * @return {Promise<Array<any>>} Array of nearby service providers
 */
export const getNearbyProviders = onCall(async request => {
  try {
    const { lat, lon, radius = 10000, limit = 20 } = request.data;

    // Validate coordinates
    if (!lat || !lon || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new Error("Invalid coordinates provided");
    }

    logger.info(`Searching for providers near ${lat}, ${lon} within ${radius}m`);

    // Get service providers from Firestore
    const providersRef = db.collection("serviceProviders");
    const snapshot = await providersRef.where("isActive", "==", true).limit(limit).get();

    const providers = [];
    for (const doc of snapshot.docs) {
      const provider = doc.data();
      if (provider.location && provider.location.coordinates) {
        const distance = calculateDistance(
          lat,
          lon,
          provider.location.coordinates.latitude,
          provider.location.coordinates.longitude
        );

        if (distance <= radius / 1000) {
          // Convert radius to km
          providers.push({
            id: doc.id,
            ...provider,
            distance: Math.round(distance * 1000), // Distance in meters
          });
        }
      }
    }

    // Sort by distance
    providers.sort((a, b) => a.distance - b.distance);

    logger.info(`Found ${providers.length} nearby providers`);

    return providers;
  } catch (error) {
    logger.error("Error in getNearbyProviders:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to get nearby providers: ${errorMessage}`);
  }
});

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

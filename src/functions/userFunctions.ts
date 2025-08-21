import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onCall } from "firebase-functions/v2/https";
import { isValidEmail, isValidPhone } from "../utils/validation";

const db = admin.firestore();

interface ProfileData {
  email?: string;
  phone?: string;
  name?: string;
}

// User Profile Update Function (Callable)
export const updateUserProfile = onCall(async request => {
  try {
    const { userId, profileData } = request.data;

    // Validate user authentication
    if (!request.auth) {
      throw new Error("User must be authenticated");
    }

    if (request.auth.uid !== userId) {
      throw new Error("User can only update their own profile");
    }

    // Validate profile data
    const validationResult = await validateProfileData(profileData);
    if (!validationResult.isValid) {
      const errorMsg = `Profile validation failed: ${validationResult.errors.join(", ")}`;
      throw new Error(errorMsg);
    }

    // Update user profile
    await db
      .collection("users")
      .doc(userId)
      .update({
        ...profileData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return { success: true, message: "Profile updated successfully" };
  } catch (error) {
    logger.error("Error in updateUserProfile:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Profile update failed: ${errorMessage}`);
  }
});

// Helper Functions
/**
 * Validates profile data for format and requirements
 * @param {ProfileData} profileData - The profile data to validate
 * @return {Promise<{isValid: boolean, errors: string[]}>} Validation result
 */
async function validateProfileData(profileData: ProfileData) {
  const errors: string[] = [];

  if (profileData.email && !isValidEmail(profileData.email)) {
    errors.push("Invalid email format");
  }

  if (profileData.phone && !isValidPhone(profileData.phone)) {
    errors.push("Invalid phone number format");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

import { isValidPrice, isValidString, validateRequiredFields } from "../utils/validation";

interface OfferData extends Record<string, unknown> {
  title: string;
  description: string;
  price: number;
  serviceProviderId: string;
}

// Offer Creation Validation Function
export const onOfferCreated = onDocumentCreated("offers/{offerId}", async event => {
  try {
    const offerData = event.data?.data() as OfferData;
    if (!offerData) return;

    logger.info("New offer created:", offerData);

    // Validate offer data
    const validationResult = await validateOffer(offerData);

    if (!validationResult.isValid) {
      // Update offer with validation errors
      await event.data?.ref.update({
        validationErrors: validationResult.errors,
        isValid: false,
      });
    } else {
      // Mark offer as valid
      await event.data?.ref.update({
        isValid: true,
        validatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    logger.error("Error in onOfferCreated:", error);
  }
});

// Helper Functions
/**
 * Validates offer data for required fields and format
 * @param {OfferData} offerData - The offer data to validate
 * @return {Promise<{isValid: boolean, errors: string[]}>} Validation result
 */
async function validateOffer(offerData: OfferData) {
  const errors: string[] = [];

  // Validate required fields
  const requiredErrors = validateRequiredFields(offerData, ["title", "description", "price", "serviceProviderId"]);
  errors.push(...requiredErrors);

  // Validate specific field requirements
  if (!isValidString(offerData.title, 3)) {
    errors.push("Offer title must be at least 3 characters long");
  }

  if (!isValidString(offerData.description, 10)) {
    errors.push("Offer description must be at least 10 characters long");
  }

  if (!isValidPrice(offerData.price)) {
    errors.push("Offer price must be greater than 0");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

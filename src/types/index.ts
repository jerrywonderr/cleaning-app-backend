/**
 * Type definitions for the Rehoboth Backend
 *
 * This file contains all shared interfaces and types used across the application.
 * Centralizing types here makes them reusable and easier to maintain.
 */

// Core business types
export type OfferCategory = "classic-cleaning" | "deep-cleaning" | "end-of-tenancy";

// Location and geographic types
export interface SearchLocation {
  latitude: number;
  longitude: number;
}

export interface ServiceAreaData {
  fullAddress: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  country: string;
  countryCode: string;
  radius: number; // in meters
  geohash: string; // for efficient spatial queries
}

// Working schedule types
export interface WorkingSchedule {
  [day: string]: {
    isActive: boolean;
    startTime: string | null; // ISO string from database
    endTime: string | null; // ISO string from database
  };
}

export interface WorkingPreferences {
  serviceArea?: ServiceAreaData;
  workingSchedule?: WorkingSchedule;
}

// Service provider types
export interface ServiceProviderData {
  services: Record<OfferCategory, boolean>;
  extraOptions: Record<string, boolean>;
  workingPreferences?: WorkingPreferences;
}

export interface ServiceProviderProfile {
  firstName: string;
  lastName: string;
  profileImage?: string;
  phone: string;
}

export interface ServiceProviderResult {
  id: string;
  userId: string;
  profile: ServiceProviderProfile;
  services: Record<OfferCategory, boolean>;
  extraOptions: Record<string, boolean>;
  workingPreferences?: WorkingPreferences;
  rating?: number;
  totalJobs?: number;
  distance: number; // Distance in meters
}

// Request/Response types
export interface UpdateServiceProviderRequest {
  userId: string;
  providerData: ServiceProviderData;
}

export interface SearchServiceProvidersRequest {
  serviceType: OfferCategory;
  location: SearchLocation;
}

// User types
export interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  dob: string;
  isServiceProvider: boolean;
  createdAt: Date;
  updatedAt: Date;
  profileImage?: string;
}

// Location autocomplete types
export interface LocationSearchRequest {
  query: string;
  countrySet?: string[];
  lat?: number;
  lon?: number;
  radius?: number;
  limit?: number;
}

export interface LocationAutocompleteResult {
  id: string;
  displayName: string;
  type: string;
  score: number;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    countryCode: string;
    postalCode: string;
    fullAddress: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

// Azure Maps API types
export interface AzureMapsResponse {
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

export interface AzureMapsReverseGeocodingResponse {
  summary: {
    queryTime: number;
    numResults: number;
  };
  addresses: Array<{
    id: string;
    position: string; // "lat,lon" format
    address: {
      routeNumbers: string[];
      street: string;
      streetName: string;
      countryCode: string;
      countrySubdivision: string;
      municipality: string;
      municipalitySubdivision: string;
      country: string;
      countryCodeISO3: string;
      freeformAddress: string;
      boundingBox: {
        northEast: string; // "lat,lon" format
        southWest: string; // "lat,lon" format
        entity: string;
      };
      countrySubdivisionName: string;
      countrySubdivisionCode: string;
      localName: string;
      postalCode?: string;
    };
  }>;
}

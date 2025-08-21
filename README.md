# Firebase Cloud Functions - Cleaning App

This directory contains Firebase Cloud Functions for the cleaning app backend services.

## Functions Overview

### 1. **onAppointmentCreated** (Firestore Trigger)

- **Trigger**: When a new appointment document is created
- **Purpose**: Sends notifications to service providers and confirmation to customers
- **Collection**: `appointments`

### 2. **onAppointmentUpdated** (Firestore Trigger)

- **Trigger**: When an appointment document is updated
- **Purpose**: Sends status update notifications when appointment status changes
- **Collection**: `appointments`

### 3. **processPayment** (Callable Function)

- **Type**: HTTPS Callable
- **Purpose**: Processes payments for appointments
- **Parameters**: `appointmentId`, `amount`, `paymentMethod`
- **Returns**: Payment result with success status and payment ID

### 4. **onOfferCreated** (Firestore Trigger)

- **Trigger**: When a new offer document is created
- **Purpose**: Validates offer data and marks offers as valid/invalid
- **Collection**: `offers`

### 5. **updateUserProfile** (Callable Function)

- **Type**: HTTPS Callable
- **Purpose**: Updates user profile with validation
- **Parameters**: `userId`, `profileData`
- **Returns**: Success status and message

### 6. **healthCheck** (HTTP Function)

- **Type**: HTTP Request
- **Purpose**: Health check endpoint for monitoring
- **Endpoint**: `/healthCheck`

## Development

### Prerequisites

- Node.js 18+
- Firebase CLI installed globally
- Firebase project configured

### Local Development

```bash
# Install dependencies
npm install

# Start local emulator
firebase emulators:start --only functions

# Build functions
npm run build

# Run linting
npm run lint
```

### Deployment

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:functionName
```

## Configuration

### Environment Variables

Set these in Firebase Console > Functions > Configuration:

- `PAYMENT_API_KEY`: Your payment processor API key
- `NOTIFICATION_API_KEY`: Push notification service API key

### Firestore Rules

Ensure your Firestore rules allow the functions to read/write necessary collections:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow functions to access all documents
    match /{document=**} {
      allow read, write: if request.auth != null && request.auth.token.firebase.sign_in_provider == 'firebase';
    }
  }
}
```

## Usage Examples

### Client-side Payment Processing

```typescript
import { processPayment } from "../services/cloudFunctionsService";

try {
  const result = await processPayment(
    "appointment123",
    5000, // Amount in kobo
    "card"
  );
  console.log("Payment successful:", result);
} catch (error) {
  console.error("Payment failed:", error);
}
```

### Profile Update

```typescript
import { updateUserProfile } from "../services/cloudFunctionsService";

try {
  const result = await updateUserProfile("user123", {
    name: "John Doe",
    phone: "+2348012345678",
  });
  console.log("Profile updated:", result);
} catch (error) {
  console.error("Profile update failed:", error);
}
```

## Monitoring and Logs

- **Function Logs**: Firebase Console > Functions > Logs
- **Performance**: Firebase Console > Functions > Usage
- **Errors**: Firebase Console > Functions > Errors

## Security

- All functions validate user authentication
- Input validation is performed on all parameters
- Rate limiting is configured via `maxInstances`
- Functions only access authorized data based on user permissions

## Cost Optimization

- Functions are configured with `maxInstances: 10` to limit concurrent executions
- Use Firestore triggers sparingly to avoid unnecessary function invocations
- Monitor function execution times and optimize accordingly

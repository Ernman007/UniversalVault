# Card Component Backend Integration Plan

This document outlines the plan to integrate the card component in the frontend with the backend services.

## 1. Schema Design

We need a schema to represent card information. This could be a new Mongoose model or an extension of the existing `Account` or `User` models. Given the distinct nature of cards (multiple cards per account, card-specific settings like limits, freeze status), a new `Card` model seems appropriate.

**Potential `Card` Schema:**

```javascript
const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  cardNumber: {
    type: String,
    required: true,
    unique: true
  },
  cardType: {
    type: String, // e.g., 'Visa', 'Mastercard', 'Debit', 'Credit'
    required: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  cvv: {
    type: String, // Store securely, maybe encrypted or not stored directly
    required: true
  },
  isFrozen: {
    type: Boolean,
    default: false
  },
  dailyLimit: {
    type: Number,
    default: null // Or a default value
  },
  transactionHistory: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    }
  ],
  // Add other relevant card details like billing address, etc.
});

const Card = mongoose.model('Card', cardSchema);

module.exports = Card;
```

This schema links cards to accounts and includes fields for card details, freeze status, limits, and a reference to transactions.

## 2. API Endpoints

We will need to create new API endpoints or modify existing ones to handle card-related operations.

**Proposed Endpoints:**

*   **GET `/api/cards/:accountId`**: Get all cards associated with a specific account.
*   **POST `/api/cards/request`**: Request a new card for a user/account.
    *   Request body: `{ accountId, cardType, ... }`
*   **PUT `/api/cards/:cardId/freeze`**: Freeze or unfreeze a specific card.
    *   Request body: `{ isFrozen: boolean }`
*   **PUT `/api/cards/:cardId/settings`**: Update card settings (e.g., limits).
    *   Request body: `{ dailyLimit: number, ... }`
*   **GET `/api/cards/:cardId/transactions`**: Get transaction history for a specific card.
*   **GET `/api/cards/:cardId/available-credit`**: Get available credit for a credit card (if applicable).
*   **GET `/api/cards/:cardId/credit-limit`**: Get credit limit for a credit card (if applicable).

## 3. Implementation Steps

1.  **Create the `Card` model:** Define the Mongoose schema and model for cards.
2.  **Create Card Controller:** Implement the logic for the proposed API endpoints in a new controller file (e.g., `cardController.js`).
3.  **Create Card Routes:** Define the routes for the card endpoints in a new routes file (e.g., `cardRoutes.js`).
4.  **Update Account/User Models (if necessary):** Add references to the `Card` model if needed (e.g., an array of card ObjectIds in the `Account` model).
5.  **Implement Controller Logic:** Write the functions in `cardController.js` to handle requests for each endpoint, interacting with the `Card` and `Transaction` models.
6.  **Integrate Routes:** Include the `cardRoutes.js` in the main backend application file (e.g., `index.js`).
7.  **Frontend Integration:** Once the backend endpoints are ready, update the frontend card component to fetch and display data from these new APIs and send requests for actions like freezing or setting limits.

## 4. Feature Breakdown

*   **Request New Card:**
    *   Backend: Create a new `Card` document in the database linked to the user's account. Generate a unique card number and CVV (handle securely).
    *   Frontend: Form to request a new card, call the `/api/cards/request` endpoint.
*   **Freeze Card:**
    *   Backend: Update the `isFrozen` field for the specified card in the database.
    *   Frontend: Button to toggle freeze status, call the `/api/cards/:cardId/freeze` endpoint.
*   **Settings (Set Limits):**
    *   Backend: Update limit fields (e.g., `dailyLimit`) for the specified card.
    *   Frontend: Form or input fields to set limits, call the `/api/cards/:cardId/settings` endpoint.
*   **Transactions:**
    *   Backend: Retrieve transactions associated with the specific card (either by referencing `Card` in `Transaction` or filtering `Transaction` by card details).
    *   Frontend: Display the list of transactions fetched from `/api/cards/:cardId/transactions`.
*   **Available Credit / Credit Limit:**
    *   Backend: For credit cards, calculate available credit based on credit limit and outstanding balance. Retrieve the credit limit.
    *   Frontend: Display these values fetched from the respective endpoints.

This plan provides a roadmap for integrating the card component with the backend, starting with the necessary data structures and API endpoints.
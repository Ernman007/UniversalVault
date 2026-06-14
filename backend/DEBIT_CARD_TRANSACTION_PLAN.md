# Debit Card Transaction Processing Plan

This document outlines the proposed structure for handling debit card transactions within the backend of the banking system.

## Endpoint

A dedicated endpoint will be created to receive transaction requests initiated by a debit card.

*   **Method:** `POST`
*   **Path:** `/api/transactions/card` (or similar, e.g., `/api/card/transactions`)

## Request Body

The request body sent from the frontend should contain the necessary information to process the transaction.

```json
{
  "cardNumber": "string",
  "expiryDate": "string", // e.g., "MM/YY"
  "cvv": "string",
  "amount": "number",
  "merchantDetails": "string", // Description of the merchant or transaction
  "transactionType": "string" // e.g., "purchase", "withdrawal"
}
```

## Backend Logic Flow

The backend logic, likely within a controller (e.g., `cardController.js` or `transactionController.js`) and potentially utilizing services and models, will follow these steps:

1.  **Receive Request:** The endpoint receives the `POST` request with transaction details.
2.  **Input Validation:** Validate the incoming request body to ensure all required fields are present and in the correct format.
3.  **Card Validation:**
    *   Query the database (`Card` model) to find the card using the provided `cardNumber`, `expiryDate`, and `cvv`.
    *   Check if the card exists, is active, and not expired.
    *   If the card is not found, inactive, or expired, return an appropriate error response (e.g., 400 Bad Request or 404 Not Found).
4.  **Identify Linked Account:**
    *   If the card is valid, retrieve the `accountId` associated with this card from the `Card` model.
5.  **Account and Fund Check:**
    *   Query the database (`Account` model) using the retrieved `accountId`.
    *   Check if the account exists and is active.
    *   Check if the account balance is greater than or equal to the `amount` of the transaction.
    *   If the account is not found, inactive, or has insufficient funds, return an appropriate error response (e.g., 400 Bad Request).
6.  **Process Transaction (If Valid and Sufficient Funds):**
    *   **Create Transaction Record:** Create a new transaction entry in the database (`Transaction` model) with details like `accountId`, `amount`, `type` (e.g., 'debit'), `description` (`merchantDetails`), and status (e.g., 'completed').
    *   **Update Account Balance:** Deduct the `amount` from the `balance` of the linked account in the database (`Account` model).
    *   **Log Activity (Optional but Recommended):** Create an entry in the activity log (`ActivityLog` model) detailing the transaction.
    *   **Return Success Response:** Send a success response back to the frontend (e.g., 201 Created or 200 OK) with details of the created transaction.
7.  **Handle Errors:** If any step fails (validation, card check, fund check, database operation), catch the error and return an appropriate error response to the frontend (e.g., 400, 404, 500 Internal Server Error) with a descriptive error message.

## Potential Responses

*   **Success:** 201 Created or 200 OK with the transaction details.
*   **Failure:**
    *   400 Bad Request (Invalid input, insufficient funds)
    *   404 Not Found (Card or Account not found)
    *   500 Internal Server Error (Database error or other backend issue)
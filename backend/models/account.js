const mongoose = require("mongoose");
const Transaction = require("./transaction");
const { BANK_NAME } = require("../config/bankConfig");

/**
 * @swagger
 * components:
 *   schemas:
 *     Account:
 *       type: object
 *       required:
 *         - user
 *         - type
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the account.
 *         user:
 *           type: string
 *           format: objectId
 *           description: Reference to the owning user.
 *         type:
 *           type: string
 *           enum: [savings, checking, investment]
 *           description: Account category.
 *         balance:
 *           type: number
 *           description: Current balance of the account.
 *         accountNumber:
 *           type: string
 *           description: Unique account number.
 *         IBAN:
 *           type: string
 *           description: International Bank Account Number.
 *         swiftCode:
 *           type: string
 *           description: SWIFT code associated with the account.
 *         isActive:
 *           type: boolean
 *           description: Indicates if the account is active.
 *         cards:
 *           type: array
 *           items:
 *             type: string
 *             format: objectId
 *           description: Linked card identifiers.
 *         bankName:
 *           type: string
 *           description: Bank name for the account.
 *         accountHolderName:
 *           type: string
 *           description: Name of the account holder when different from the user.
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
const accountSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["savings", "checking", "investment"],
      required: true,
    },
    balance: { type: Number, default: 0 },
    accountNumber: { type: String, unique: true },
    IBAN: { type: String, unique: true },
    swiftCode: { type: String, default: "SPLYBN688", immutable: true },
    isActive: { type: Boolean, default: true },
    cards: [{ type: mongoose.Schema.Types.ObjectId, ref: "Card" }],
    bankName: { type: String, default: BANK_NAME },
    accountHolderName: { type: String }, // Optional field for external accounts
  },
  { timestamps: true },
);

// Generate account number and IBAN before saving
accountSchema.pre("save", function (next) {
  if (this.isNew) {
    // Simple generation logic (can be made more sophisticated)
    const generateRandomNumber = (length) => {
      let result = "";
      const characters = "0123456789";
      for (let i = 0; i < length; i++) {
        result += characters.charAt(
          Math.floor(Math.random() * characters.length),
        );
      }
      return result;
    };

    let prefix;
    switch (this.type) {
      case "savings":
        prefix = "11";
        break;
      case "checking":
        prefix = "54";
        break;
      case "investment":
        prefix = "38";
        break;
      default:
        prefix = ""; // Or handle error appropriately
    }
    this.accountNumber = prefix + generateRandomNumber(10 - prefix.length); // Generate a 10-digit account number with prefix
    this.IBAN = "LT" + generateRandomNumber(18); // Generate a simple IBAN (LT + 18 digits)
  }
  next();
});

// Static method to get the total system-wide balance using aggregation
accountSchema.statics.getTotalSystemBalance = async function () {
  const result = await this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: "$balance" },
      },
    },
  ]);
  return result.length > 0 ? result[0].total : 0;
};

module.exports = mongoose.model("Account", accountSchema);

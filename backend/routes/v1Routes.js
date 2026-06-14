const express = require("express");
const router = express.Router();
const Account = require("../models/account");
const { protect } = require("../middleware/authMiddleware");
const { BANK_NAME, BANK_CODE } = require("../config/bankConfig");

const TRANSFER_VALIDATE_WINDOW_MS = 60 * 1000;
const TRANSFER_VALIDATE_MAX_PER_TARGET = 5;
const transferValidationAttempts = new Map();

const pruneTransferValidationAttempts = (windowStart) => {
  if (transferValidationAttempts.size < 1000) {
    return;
  }

  Array.from(transferValidationAttempts.entries()).forEach(([key, attempts]) => {
    const recentAttempts = attempts.filter((time) => time >= windowStart);
    if (recentAttempts.length === 0) {
      transferValidationAttempts.delete(key);
    } else {
      transferValidationAttempts.set(key, recentAttempts);
    }
  });
};

const isTransferValidationRateLimited = (userId, targetAccount) => {
  const now = Date.now();
  const key = `${String(userId)}:${targetAccount}`;
  const windowStart = now - TRANSFER_VALIDATE_WINDOW_MS;
  pruneTransferValidationAttempts(windowStart);
  const attempts = transferValidationAttempts.get(key) || [];
  const recentAttempts = attempts.filter((time) => time >= windowStart);

  if (recentAttempts.length >= TRANSFER_VALIDATE_MAX_PER_TARGET) {
    transferValidationAttempts.set(key, recentAttempts);
    return true;
  }

  recentAttempts.push(now);
  transferValidationAttempts.set(key, recentAttempts);
  return false;
};

/**
 * @swagger
 * /api/v1/transfer/validate:
 *   post:
 *     summary: Validate if an account belongs to the bank and return account holder name
 *     tags: [Transfer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [accountNumber]
 *             properties:
 *               accountNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 accountName:
 *                   type: string
 *                 bankCode:
 *                   type: string
 *                 bankName:
 *                   type: string
 */
router.post("/transfer/validate", protect, async (req, res) => {
  try {
    const { accountNumber } = req.body;
    if (!accountNumber) {
      return res.status(200).json({ valid: false });
    }

    // Clean account number
    const normalized = accountNumber.trim();
    if (isTransferValidationRateLimited(req.user._id, normalized)) {
      return res.status(429).json({
        valid: false,
        error: "Too many validation attempts for this account target. Please try again later.",
      });
    }

    // Search by accountNumber or IBAN
    const account = await Account.findOne({
      $or: [{ accountNumber: normalized }, { IBAN: normalized }],
    }).populate("user", "name");

    if (account) {
      return res.json({
        valid: true,
        accountName: account.user
          ? account.user.name
          : account.accountHolderName || `${BANK_NAME} Customer`,
        bankCode: BANK_CODE,
        bankName: BANK_NAME,
      });
    }

    // Not found in our bank
    return res.json({ valid: false });
  } catch (error) {
    // console.error('Transfer validation error:', error);
    res.status(500).json({ valid: false, error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/v1/banks:
 *   get:
 *     summary: Get bank directory
 *     tags: [Transfer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of banks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   code:
 *                     type: string
 *                   name:
 *                     type: string
 */
router.get("/banks", protect, (req, res) => {
  const banks = [
    { code: BANK_CODE, name: BANK_NAME },
    { code: "BOFAUS3N", name: "Bank of America (US)" },
    { code: "CHASUS33", name: "JPMorgan Chase (US)" },
    { code: "CITIUS33", name: "Citibank (US)" },
    { code: "DEUTDEFF", name: "Deutsche Bank (DE)" },
    { code: "BNPAFRPP", name: "BNP Paribas (FR)" },
    { code: "BARCGB22", name: "Barclays (UK)" },
    { code: "HSBCGB2L", name: "HSBC (UK)" },
    { code: "NWBKGB2L", name: "NatWest (UK)" },
    { code: "UBSWCHZH80A", name: "UBS (CH)" },
    { code: "SMBCJPJT", name: "Sumitomo Mitsui Banking Corporation (JP)" },
  ];
  res.json(banks);
});

module.exports = router;

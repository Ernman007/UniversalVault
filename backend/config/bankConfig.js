/**
 * Bank Configuration
 * Central source for bank name and code across the entire system.
 * Change BANK_NAME and BANK_CODE in .env to rebrand the application.
 */

const BANK_NAME = process.env.BANK_NAME || "UniversalVault";
const BANK_CODE = process.env.BANK_CODE || "UNIVAULT";

module.exports = {
  BANK_NAME,
  BANK_CODE,
};

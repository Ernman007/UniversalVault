const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');
const {
  getBeneficiaries,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary
} = require('../controllers/beneficiaryController');

router.use(protect);

const beneficiaryCreateValidators = [
  body('nickname')
    .isString()
    .trim()
    .notEmpty()
    .isLength({ max: 100 }),
  body('accountNumber')
    .isString()
    .trim()
    .notEmpty()
    .matches(/^[A-Za-z0-9]{6,34}$/),
  body('bankName')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 120 }),
  body('swiftCode')
    .optional()
    .isString()
    .trim()
    .matches(/^[A-Za-z0-9]{8,11}$/),
  body('accountHolderName')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 120 })
];

const beneficiaryUpdateValidators = [
  param('id').isMongoId(),
  body().custom((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Request body must be an object');
    }
    const keys = ['nickname', 'accountNumber', 'bankName', 'swiftCode', 'accountHolderName'];
    const hasAtLeastOneField = keys.some((key) => Object.prototype.hasOwnProperty.call(value, key));
    if (!hasAtLeastOneField) {
      throw new Error('At least one updatable field is required');
    }
    return true;
  }),
  body('nickname')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .isLength({ max: 100 }),
  body('accountNumber')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .matches(/^[A-Za-z0-9]{6,34}$/),
  body('bankName')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 120 }),
  body('swiftCode')
    .optional()
    .isString()
    .trim()
    .matches(/^[A-Za-z0-9]{8,11}$/),
  body('accountHolderName')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 120 })
];

const beneficiaryIdValidator = [param('id').isMongoId()];

router.get('/', getBeneficiaries);
router.post('/', beneficiaryCreateValidators, validateRequest, createBeneficiary);
router.put('/:id', beneficiaryUpdateValidators, validateRequest, updateBeneficiary);
router.delete('/:id', beneficiaryIdValidator, validateRequest, deleteBeneficiary);

module.exports = router;

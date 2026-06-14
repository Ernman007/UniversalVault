const User = require('../models/user');
const SystemSettings = require('../models/systemSettings');

const toPlainObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : null
);

const buildSystemSettingsResponse = (settingsDoc) => ({
  maintenance: settingsDoc.maintenance,
  version: settingsDoc.version,
  features: settingsDoc.features,
  limits: settingsDoc.limits,
  revision: settingsDoc.revision,
  updatedAt: settingsDoc.updatedAt
});

const ensureSystemSettingsDocument = async () => SystemSettings.findOneAndUpdate(
  { key: 'system' },
  { $setOnInsert: { key: 'system' } },
  { new: true, upsert: true, setDefaultsOnInsert: true }
);

// Get user settings
const getUserSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('settings');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user.settings || {});
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user settings', error: error.message });
  }
};

// Update user settings
const updateUserSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { settings },
      { new: true, runValidators: true }
    ).select('settings');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user.settings);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user settings', error: error.message });
  }
};

// Get system settings (admin only)
const getSystemSettings = async (req, res) => {
  try {
    const systemSettings = await ensureSystemSettingsDocument();
    res.json(buildSystemSettingsResponse(systemSettings));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching system settings', error: error.message });
  }
};

// Update system settings (admin only)
const updateSystemSettings = async (req, res) => {
  try {
    const currentSettings = await ensureSystemSettingsDocument();
    const payload = toPlainObject(req.body) || {};
    const updateDoc = {};

    if (Object.prototype.hasOwnProperty.call(payload, 'maintenance')) {
      if (typeof payload.maintenance !== 'boolean') {
        return res.status(400).json({ message: 'maintenance must be a boolean' });
      }
      updateDoc.maintenance = payload.maintenance;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'version')) {
      if (typeof payload.version !== 'string' || !payload.version.trim()) {
        return res.status(400).json({ message: 'version must be a non-empty string' });
      }
      updateDoc.version = payload.version.trim();
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'features')) {
      const featuresPatch = toPlainObject(payload.features);
      if (!featuresPatch) {
        return res.status(400).json({ message: 'features must be an object' });
      }
      updateDoc.features = {
        ...currentSettings.features,
        ...featuresPatch
      };
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'limits')) {
      const limitsPatch = toPlainObject(payload.limits);
      if (!limitsPatch) {
        return res.status(400).json({ message: 'limits must be an object' });
      }
      const mergedLimits = {
        ...currentSettings.limits,
        ...limitsPatch
      };
      if (
        !Number.isFinite(mergedLimits.maxAccounts)
        || !Number.isFinite(mergedLimits.maxDailyTransfers)
        || !Number.isFinite(mergedLimits.minTransferAmount)
        || mergedLimits.maxAccounts < 1
        || mergedLimits.maxDailyTransfers < 1
        || mergedLimits.minTransferAmount < 0
      ) {
        return res.status(400).json({ message: 'limits contain invalid values' });
      }
      updateDoc.limits = mergedLimits;
    }

    if (!Object.keys(updateDoc).length) {
      return res.json(buildSystemSettingsResponse(currentSettings));
    }

    const updatedSettings = await SystemSettings.findOneAndUpdate(
      { key: 'system' },
      {
        $set: {
          ...updateDoc,
          updatedBy: req.user._id
        },
        $inc: { revision: 1 },
        $setOnInsert: { key: 'system' }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    res.json(buildSystemSettingsResponse(updatedSettings));
  } catch (error) {
    res.status(500).json({ message: 'Error updating system settings', error: error.message });
  }
};

// Get settings by ID (admin only)
const getSettingsById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('settings');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const normalizedSettings =
      user.settings && typeof user.settings === 'object' ? user.settings : {};
    res.json({ id: req.params.id, settings: normalizedSettings });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user settings', error: error.message });
  }
};

module.exports = {
  getUserSettings,
  updateUserSettings,
  getSystemSettings,
  updateSystemSettings,
  getSettingsById
};

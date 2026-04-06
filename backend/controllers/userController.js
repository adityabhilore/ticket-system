const {
  getUsersByCompany,
  getUsersByCompanyAndRole,
  updateUserProfile,
} = require('../services/userService');

/**
 * Get users in company
 */
const getCompanyUsers = async (req, res) => {
  try {
    const { companyId } = req;

    const users = await getUsersByCompany(companyId);

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (err) {
    console.error('Get company users error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
    });
  }
};

/**
 * Get engineers in company
 */
const getEngineers = async (req, res) => {
  try {
    const { companyId } = req;

    const engineers = await getUsersByCompanyAndRole(companyId, 'Engineer');

    res.status(200).json({
      success: true,
      data: engineers,
    });
  } catch (err) {
    console.error('Get engineers error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch engineers',
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const { userId } = req;
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required',
      });
    }

    const success = await updateUserProfile(userId, name, email);

    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update profile',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (err) {
    console.error('Update profile error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
};

module.exports = {
  getCompanyUsers,
  getEngineers,
  updateProfile,
};

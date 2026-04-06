const {
  getCompanyById,
  getAllCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
} = require('../services/companyService');

/**
 * Get company details by route parameter
 */
const getCompanyDetailsById = async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await getCompanyById(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (err) {
    console.error('Get company details by ID error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company details',
    });
  }
};

/**
 * Get company details
 */
const getCompanyDetails = async (req, res) => {
  try {
    const { companyId } = req;

    const company = await getCompanyById(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (err) {
    console.error('Get company details error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company details',
    });
  }
};

/**
 * Get all companies (admin only)
 */
const getAllCompaniesData = async (req, res) => {
  try {
    const companies = await getAllCompanies();

    res.status(200).json({
      success: true,
      data: companies.map((company) => ({
        ...company,
        CompanyId: company.CompanyID,
        CompanyName: company.Name,
      })),
    });
  } catch (err) {
    console.error('Get all companies error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch companies',
    });
  }
};

/**
 * Create new company (admin only)
 */
const createNewCompany = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required',
      });
    }

    const success = await createCompany(name, email);

    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to create company',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
    });
  } catch (err) {
    console.error('Create company error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create company',
    });
  }
};

/**
 * Update company (admin only)
 */
const updateCompanyDetails = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { name, email, status } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required',
      });
    }

    const success = await updateCompany(companyId, name, email, status);

    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update company',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Company updated successfully',
    });
  } catch (err) {
    console.error('Update company error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update company',
    });
  }
};

/**
 * Delete company (admin only)
 */
const deleteCompanyDetails = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required',
      });
    }

    const success = await deleteCompany(companyId);

    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to delete company',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Company deleted successfully',
    });
  } catch (err) {
    console.error('Delete company error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete company',
    });
  }
};

module.exports = {
  getCompanyDetails,
  getCompanyDetailsById,
  getAllCompaniesData,
  createNewCompany,
  updateCompanyDetails,
  deleteCompanyDetails,
};

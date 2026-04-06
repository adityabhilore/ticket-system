const db = require('../config/database');

/**
 * Get all products (Admin only)
 */
const getAllProducts = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT ProductID, ProductName, ProductVersion, Category, TechStack, Description, CreatedAt
      FROM Products
      WHERE IFNULL(IsDeleted, 0) = 0
      ORDER BY ProductName ASC
    `);
    const products = Array.isArray(result[0]) ? result[0] : [];
    res.json({ success: true, data: products });
  } catch (err) {
    console.error('Get products error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
};

/**
 * Get single product by ID
 */
const getProductById = async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await db.query(`
      SELECT ProductID, ProductName, ProductVersion, Category, TechStack, Description, CreatedAt
      FROM Products
      WHERE ProductID = ? AND IFNULL(IsDeleted, 0) = 0
    `, [productId]);
    
    const products = Array.isArray(result[0]) ? result[0] : [];
    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    res.json({ success: true, data: products[0] });
  } catch (err) {
    console.error('Get product error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch product' });
  }
};

/**
 * Create product (Admin only)
 */
const createProduct = async (req, res) => {
  try {
    const { productName, productVersion, category, techStack, description } = req.body;
    
    if (!productName || !productVersion) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product name and version are required' 
      });
    }

    const result = await db.query(`
      INSERT INTO Products (ProductName, ProductVersion, Category, TechStack, Description, CreatedAt, UpdatedAt)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `, [productName, productVersion, category || null, techStack || null, description || null]);

    const productId = result[0]?.insertId;
    res.status(201).json({ 
      success: true, 
      message: 'Product created successfully',
      data: { productId }
    });
  } catch (err) {
    console.error('Create product error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
};

/**
 * Update product (Admin only)
 */
const updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { productName, productVersion, category, techStack, description } = req.body;

    // Verify product exists
    const checkResult = await db.query(
      'SELECT ProductID FROM Products WHERE ProductID = ? AND IFNULL(IsDeleted, 0) = 0',
      [productId]
    );
    
    if (!Array.isArray(checkResult[0]) || checkResult[0].length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const updates = [];
    const values = [];
    
    if (productName !== undefined) {
      updates.push('ProductName = ?');
      values.push(productName);
    }
    if (productVersion !== undefined) {
      updates.push('ProductVersion = ?');
      values.push(productVersion);
    }
    if (category !== undefined) {
      updates.push('Category = ?');
      values.push(category);
    }
    if (techStack !== undefined) {
      updates.push('TechStack = ?');
      values.push(techStack);
    }
    if (description !== undefined) {
      updates.push('Description = ?');
      values.push(description);
    }

    if (updates.length === 0) {
      return res.json({ success: true, message: 'No updates provided' });
    }

    updates.push('UpdatedAt = NOW()');
    values.push(productId);

    await db.query(`
      UPDATE Products
      SET ${updates.join(', ')}
      WHERE ProductID = ? AND IFNULL(IsDeleted, 0) = 0
    `, values);

    res.json({ success: true, message: 'Product updated successfully' });
  } catch (err) {
    console.error('Update product error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
};

/**
 * Delete product (soft delete - Admin only)
 */
const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    // Verify product exists
    const checkResult = await db.query(
      'SELECT ProductID FROM Products WHERE ProductID = ? AND IFNULL(IsDeleted, 0) = 0',
      [productId]
    );
    
    if (!Array.isArray(checkResult[0]) || checkResult[0].length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await db.query(`
      UPDATE Products
      SET IsDeleted = 1, UpdatedAt = NOW()
      WHERE ProductID = ?
    `, [productId]);

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Delete product error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
};

/**
 * Get products assigned to a company
 */
const getCompanyProducts = async (req, res) => {
  try {
    const { companyId } = req.params;

    const result = await db.query(`
      SELECT p.ProductID, p.ProductName, p.ProductVersion, p.Category, p.TechStack, p.Description
      FROM Products p
      INNER JOIN CompanyProducts cp ON p.ProductID = cp.ProductID
      WHERE cp.ClientCompanyID = ? 
        AND IFNULL(p.IsDeleted, 0) = 0
      ORDER BY p.ProductName ASC
    `, [companyId]);

    const products = Array.isArray(result[0]) ? result[0] : [];
    res.json({ success: true, data: products });
  } catch (err) {
    console.error('Get company products error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch company products' });
  }
};

/**
 * Assign product to company
 */
const assignProductToCompany = async (req, res) => {
  try {
    const { companyId, productId } = req.params;
    console.log(`🔗 Assigning product ${productId} to company ${companyId}`);

    // Check if already assigned and not deleted
    const checkResult = await db.query(`
      SELECT ID FROM CompanyProducts
      WHERE ClientCompanyID = ? AND ProductID = ? AND IFNULL(IsDeleted, 0) = 0
    `, [companyId, productId]);

    if (Array.isArray(checkResult[0]) && checkResult[0].length > 0) {
      console.log(`⚠️ Product ${productId} already assigned to company ${companyId}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Product already assigned to this company' 
      });
    }

    // Check if it exists but was deleted, restore it
    const deletedResult = await db.query(`
      SELECT ID FROM CompanyProducts
      WHERE ClientCompanyID = ? AND ProductID = ? AND IFNULL(IsDeleted, 0) = 1
    `, [companyId, productId]);

    if (Array.isArray(deletedResult[0]) && deletedResult[0].length > 0) {
      console.log(`✅ Restoring deleted assignment for product ${productId} to company ${companyId}`);
      await db.query(`
        UPDATE CompanyProducts
        SET IsDeleted = 0, Status = 'Active', UpdatedAt = NOW()
        WHERE ClientCompanyID = ? AND ProductID = ?
      `, [companyId, productId]);
    } else {
      // Create new assignment
      console.log(`✅ Creating new assignment for product ${productId} to company ${companyId}`);
      const insertResult = await db.query(`
        INSERT INTO CompanyProducts (ClientCompanyID, ProductID, StartDate, Status, CreatedAt, UpdatedAt)
        VALUES (?, ?, NOW(), 'Active', NOW(), NOW())
      `, [companyId, productId]);
      console.log(`✅ Insert result:`, insertResult[0]);
    }

    res.json({ success: true, message: 'Product assigned to company successfully' });
  } catch (err) {
    console.error('Assign product error:', err);
    console.error('Error details:', err.message, err.code, err.sqlMessage);
    res.status(500).json({ success: false, message: 'Failed to assign product: ' + err.message });
  }
};

/**
 * Unassign product from company
 */
const unassignProductFromCompany = async (req, res) => {
  try {
    const { companyId, productId } = req.params;

    const checkResult = await db.query(`
      SELECT ID FROM CompanyProducts
      WHERE ClientCompanyID = ? AND ProductID = ? AND IFNULL(IsDeleted, 0) = 0
    `, [companyId, productId]);

    if (!Array.isArray(checkResult[0]) || checkResult[0].length === 0) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    await db.query(`
      UPDATE CompanyProducts
      SET IsDeleted = 1, UpdatedAt = NOW()
      WHERE ClientCompanyID = ? AND ProductID = ?
    `, [companyId, productId]);

    res.json({ success: true, message: 'Product unassigned from company successfully' });
  } catch (err) {
    console.error('Unassign product error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to unassign product' });
  }
};

/**
 * Get product statistics (Admin only)
 */
const getProductStatistics = async (req, res) => {
  try {
    // Total products count
    const totalResult = await db.query(`
      SELECT COUNT(*) as total FROM Products WHERE IFNULL(IsDeleted, 0) = 0
    `);
    const totalProducts = totalResult[0]?.[0]?.total || 0;

    // Products by category
    const categoryResult = await db.query(`
      SELECT Category, COUNT(*) as count 
      FROM Products 
      WHERE IFNULL(IsDeleted, 0) = 0 AND Category IS NOT NULL
      GROUP BY Category
      ORDER BY count DESC
    `);
    const productsByCategory = Array.isArray(categoryResult[0]) ? categoryResult[0] : [];

    // Most assigned products
    const mostAssignedResult = await db.query(`
      SELECT p.ProductID, p.ProductName, COUNT(cp.CompanyProductID) as assignmentCount
      FROM Products p
      LEFT JOIN CompanyProducts cp ON p.ProductID = cp.ProductID AND IFNULL(cp.IsDeleted, 0) = 0
      WHERE IFNULL(p.IsDeleted, 0) = 0
      GROUP BY p.ProductID, p.ProductName
      ORDER BY assignmentCount DESC
      LIMIT 5
    `);
    const mostAssignedProducts = Array.isArray(mostAssignedResult[0]) ? mostAssignedResult[0] : [];

    // Products by tech stack
    const techStackResult = await db.query(`
      SELECT TechStack, COUNT(*) as count 
      FROM Products 
      WHERE IFNULL(IsDeleted, 0) = 0 AND TechStack IS NOT NULL
      GROUP BY TechStack
      ORDER BY count DESC
    `);
    const productsByTechStack = Array.isArray(techStackResult[0]) ? techStackResult[0] : [];

    // Total assignments
    const assignmentsResult = await db.query(`
      SELECT COUNT(*) as total FROM CompanyProducts WHERE IFNULL(IsDeleted, 0) = 0
    `);
    const totalAssignments = assignmentsResult[0]?.[0]?.total || 0;

    // Unassigned products
    const unassignedResult = await db.query(`
      SELECT COUNT(p.ProductID) as count
      FROM Products p
      LEFT JOIN CompanyProducts cp ON p.ProductID = cp.ProductID AND IFNULL(cp.IsDeleted, 0) = 0
      WHERE IFNULL(p.IsDeleted, 0) = 0 AND cp.CompanyProductID IS NULL
    `);
    const unassignedProducts = unassignedResult[0]?.[0]?.count || 0;

    res.json({
      success: true,
      data: {
        totalProducts,
        totalAssignments,
        unassignedProducts,
        productsByCategory,
        productsByTechStack,
        mostAssignedProducts
      }
    });
  } catch (err) {
    console.error('Get statistics error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
};

/**
 * Bulk assign products to company
 */
const bulkAssignProductsToCompany = async (req, res) => {
  try {
    const { companyId, productIds } = req.body;

    if (!companyId || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'CompanyID and product IDs array are required' 
      });
    }

    let successCount = 0;
    let failureCount = 0;
    const errors = [];

    for (const productId of productIds) {
      try {
        // Check if already assigned and not deleted
        const checkResult = await db.query(`
          SELECT ID FROM CompanyProducts
          WHERE ClientCompanyID = ? AND ProductID = ? AND IFNULL(IsDeleted, 0) = 0
        `, [companyId, productId]);

        if (Array.isArray(checkResult[0]) && checkResult[0].length > 0) {
          console.log(`Product ${productId} already assigned to company ${companyId}`);
          continue;
        }

        // Check if it exists but was deleted, restore it
        const deletedResult = await db.query(`
          SELECT ID FROM CompanyProducts
          WHERE ClientCompanyID = ? AND ProductID = ? AND IFNULL(IsDeleted, 0) = 1
        `, [companyId, productId]);

        if (Array.isArray(deletedResult[0]) && deletedResult[0].length > 0) {
          await db.query(`
            UPDATE CompanyProducts
            SET IsDeleted = 0, Status = 'Active', UpdatedAt = NOW()
            WHERE ClientCompanyID = ? AND ProductID = ?
          `, [companyId, productId]);
        } else {
          // Create new assignment
          await db.query(`
            INSERT INTO CompanyProducts (ClientCompanyID, ProductID, StartDate, Status, CreatedAt, UpdatedAt)
            VALUES (?, ?, NOW(), 'Active', NOW(), NOW())
          `, [companyId, productId]);
        }
        successCount++;
      } catch (err) {
        console.error(`Error assigning product ${productId}:`, err.message);
        failureCount++;
        errors.push({ productId, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Bulk assignment completed. Success: ${successCount}, Failed: ${failureCount}`,
      data: { successCount, failureCount, errors }
    });
  } catch (err) {
    console.error('Bulk assign error:', err);
    res.status(500).json({ success: false, message: 'Failed to bulk assign products: ' + err.message });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCompanyProducts,
  assignProductToCompany,
  unassignProductFromCompany,
  getProductStatistics,
  bulkAssignProductsToCompany,
};

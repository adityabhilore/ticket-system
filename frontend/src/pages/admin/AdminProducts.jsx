import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [companyProducts, setCompanyProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [formData, setFormData] = useState({
    productName: '',
    productVersion: '',
    category: '',
    techStack: '',
    description: '',
  });

  useEffect(() => {
    fetchProducts();
    fetchCompanies();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      alert('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/companies');
      setCompanies(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    }
  };

  const fetchCompanyProducts = async (companyId) => {
    try {
      const res = await api.get(`/products/company/${companyId}`);
      const productIds = (res.data?.data || []).map(p => p.ProductID);
      setCompanyProducts({ ...companyProducts, [companyId]: productIds });
    } catch (err) {
      console.error('Failed to fetch company products:', err);
    }
  };

  const handleCreate = async () => {
    try {
      if (!formData.productName || !formData.productVersion) {
        alert('Product name and version are required');
        return;
      }

      await api.post('/products', formData);
      alert('Product created successfully');
      setFormData({ productName: '', productVersion: '', category: '', techStack: '', description: '' });
      setEditMode(false);
      fetchProducts();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to create product');
    }
  };

  const handleUpdate = async () => {
    try {
      if (!selectedProduct?.ProductID) return;
      await api.put(`/products/${selectedProduct.ProductID}`, formData);
      alert('Product updated successfully');
      setEditMode(false);
      setSelectedProduct(null);
      setFormData({ productName: '', productVersion: '', category: '', techStack: '', description: '' });
      fetchProducts();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to update product');
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await api.delete(`/products/${productId}`);
      alert('Product deleted successfully');
      fetchProducts();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setFormData({
      productName: product.ProductName,
      productVersion: product.ProductVersion,
      category: product.Category || '',
      techStack: product.TechStack || '',
      description: product.Description || '',
    });
    setEditMode(true);
  };

  const handleSelectCompany = (companyId) => {
    setSelectedCompany(companyId);
    if (companyId && !companyProducts[companyId]) {
      fetchCompanyProducts(companyId);
    }
  };

  const handleAssignProduct = async (productId) => {
    if (!selectedCompany) {
      alert('Please select a company');
      return;
    }
    try {
      await api.post(`/products/company/${selectedCompany}/assign/${productId}`);
      alert('Product assigned successfully');
      fetchCompanyProducts(selectedCompany);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to assign product');
    }
  };

  const handleUnassignProduct = async (productId) => {
    if (!selectedCompany) return;
    try {
      await api.delete(`/products/company/${selectedCompany}/assign/${productId}`);
      alert('Product unassigned successfully');
      fetchCompanyProducts(selectedCompany);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to unassign product');
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'Inter, sans-serif',
        color: '#9CA3AF'
      }}>
        Loading products...
      </div>
    );
  }

  const assignedProductIds = companyProducts[selectedCompany] || [];
  const unassignedProducts = products.filter(p => !assignedProductIds.includes(p.ProductID));

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Product Management</h1>
          <p className="admin-page-sub">Create and manage products assigned to your companies</p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* SECTION 1: Product Management */}
        <div style={{
          background: '#fff',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '28px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
        }}>
          {editMode ? (
            // EDIT/CREATE FORM
            <div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#1E293B',
                marginBottom: '20px',
                letterSpacing: '-0.3px'
              }}>
                {selectedProduct ? 'Edit Product' : 'Create New Product'}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#64748B',
                    display: 'block',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px'
                  }}>Product Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., My Application"
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    style={{
                      padding: '11px 13px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      width: '100%',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s',
                      background: '#FFFFFF'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#64748B',
                    display: 'block',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px'
                  }}>Version *</label>
                  <input
                    type="text"
                    placeholder="e.g., 1.0.0"
                    value={formData.productVersion}
                    onChange={(e) => setFormData({ ...formData, productVersion: e.target.value })}
                    style={{
                      padding: '11px 13px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      width: '100%',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s',
                      background: '#FFFFFF'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#64748B',
                    display: 'block',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px'
                  }}>Category</label>
                  <input
                    type="text"
                    placeholder="e.g., Web, Mobile, Desktop"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{
                      padding: '11px 13px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      width: '100%',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s',
                      background: '#FFFFFF'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#64748B',
                    display: 'block',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px'
                  }}>Tech Stack</label>
                  <input
                    type="text"
                    placeholder="e.g., React, Node.js, MySQL"
                    value={formData.techStack}
                    onChange={(e) => setFormData({ ...formData, techStack: e.target.value })}
                    style={{
                      padding: '11px 13px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      width: '100%',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s',
                      background: '#FFFFFF'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#64748B',
                  display: 'block',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px'
                }}>Description</label>
                <textarea
                  placeholder="Add product description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    padding: '11px 13px',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    width: '100%',
                    boxSizing: 'border-box',
                    minHeight: '100px',
                    resize: 'vertical',
                    transition: 'all 0.2s',
                    background: '#FFFFFF'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={selectedProduct ? handleUpdate : handleCreate}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: '#4F46E5',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.2)'
                  }}
                >
                  {selectedProduct ? 'Update Product' : 'Create Product'}
                </button>
                <button
                  onClick={() => {
                    setEditMode(false);
                    setSelectedProduct(null);
                    setFormData({ productName: '', productVersion: '', category: '', techStack: '', description: '' });
                  }}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: '#F3F4F6',
                    color: '#64748B',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Products List */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#1E293B',
                    margin: 0
                  }}>Products</h3>
                  <button
                    onClick={() => {
                      setEditMode(true);
                      setSelectedProduct(null);
                      setFormData({ productName: '', productVersion: '', category: '', techStack: '', description: '' });
                    }}
                    style={{
                      padding: '8px 16px',
                      background: '#4F46E5',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    + New Product
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '13px'
                  }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                        <th style={{
                          padding: '12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: '#64748B'
                        }}>Product Name</th>
                        <th style={{
                          padding: '12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: '#64748B'
                        }}>Version</th>
                        <th style={{
                          padding: '12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: '#64748B'
                        }}>Category</th>
                        <th style={{
                          padding: '12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: '#64748B'
                        }}>Tech Stack</th>
                        <th style={{
                          padding: '12px',
                          textAlign: 'right',
                          fontWeight: '600',
                          color: '#64748B'
                        }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{
                            padding: '32px 24px',
                            textAlign: 'center',
                            color: '#94A3B8',
                            background: '#F8FAFC',
                            border: '1px dashed #E2E8F0'
                          }}>
                            No products found
                          </td>
                        </tr>
                      ) : (
                        products.map(product => (
                          <tr key={product.ProductID} style={{
                            borderBottom: '1px solid #E2E8F0',
                            background: '#FFFFFF'
                          }}>
                            <td style={{ padding: '12px', textAlign: 'left', fontWeight: '500', color: '#1E293B' }}>
                              {product.ProductName}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'left', color: '#64748B' }}>
                              {product.ProductVersion}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'left', color: '#64748B' }}>
                              {product.Category || '-'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'left', color: '#64748B' }}>
                              {product.TechStack || '-'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>
                              <button
                                onClick={() => handleSelectProduct(product)}
                                style={{
                                  padding: '6px 12px',
                                  background: '#E0E7FF',
                                  color: '#4F46E5',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  marginRight: '6px'
                                }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(product.ProductID)}
                                style={{
                                  padding: '6px 12px',
                                  background: '#FEE2E2',
                                  color: '#DC2626',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: Assign Products to Companies */}
        <div style={{
          background: '#fff',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '28px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '700',
            color: '#1E293B',
            marginBottom: '20px'
          }}>Assign Products to Companies</h3>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#64748B',
              display: 'block',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.4px'
            }}>Select Company</label>
            <select
              value={selectedCompany}
              onChange={(e) => handleSelectCompany(e.target.value)}
              style={{
                padding: '11px 13px',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '13px',
                fontFamily: 'inherit',
                width: '100%',
                boxSizing: 'border-box',
                background: '#FFFFFF'
              }}
            >
              <option value="">-- Choose a company --</option>
              {companies.map(company => (
                <option key={company.CompanyID} value={company.CompanyID}>
                  {company.Name}
                </option>
              ))}
            </select>
          </div>

          {selectedCompany && (
            <div>
              {/* Assigned Products */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#1E293B',
                  marginBottom: '12px'
                }}>Assigned Products ({assignedProductIds.length})</h4>
                
                {assignedProductIds.length === 0 ? (
                  <div style={{
                    padding: '16px',
                    background: '#F8FAFC',
                    border: '1px dashed #E2E8F0',
                    borderRadius: '8px',
                    color: '#94A3B8',
                    fontSize: '13px'
                  }}>
                    No products assigned
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {products
                      .filter(p => assignedProductIds.includes(p.ProductID))
                      .map(product => (
                        <div
                          key={product.ProductID}
                          style={{
                            padding: '12px',
                            background: '#F0FDF4',
                            border: '1px solid #DCFCE7',
                            borderRadius: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: '500', color: '#1E293B' }}>
                              {product.ProductName} v{product.ProductVersion}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748B' }}>
                              {product.Category} • {product.TechStack}
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnassignProduct(product.ProductID)}
                            style={{
                              padding: '6px 12px',
                              background: '#FEE2E2',
                              color: '#DC2626',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Unassign
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Unassigned Products */}
              <div>
                <h4 style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#1E293B',
                  marginBottom: '12px'
                }}>Available Products ({unassignedProducts.length})</h4>
                
                {unassignedProducts.length === 0 ? (
                  <div style={{
                    padding: '16px',
                    background: '#F8FAFC',
                    border: '1px dashed #E2E8F0',
                    borderRadius: '8px',
                    color: '#94A3B8',
                    fontSize: '13px'
                  }}>
                    All products assigned
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {unassignedProducts.map(product => (
                      <div
                        key={product.ProductID}
                        style={{
                          padding: '12px',
                          background: '#FFF7ED',
                          border: '1px solid #FEDBA8',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',  
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '500', color: '#1E293B' }}>
                            {product.ProductName} v{product.ProductVersion}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>
                            {product.Category} • {product.TechStack}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAssignProduct(product.ProductID)}
                          style={{
                            padding: '6px 12px',
                            background: '#E0E7FF',
                            color: '#4F46E5',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Assign
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

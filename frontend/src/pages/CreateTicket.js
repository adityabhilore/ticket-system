import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ticketService from '../services/ticketService';
import api from '../services/api';
import { showError } from '../utils/helpers';
import '../styles/main.css';

const emptyAttachment = {
  fileName: '',
  filePath: '',
};

const CreateTicket = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priorityId: '3',
    productId: '',
    attachments: [{ ...emptyAttachment }],
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch products assigned to the user's company
  useEffect(() => {
    const fetchCompanyProducts = async () => {
      try {
        if (user?.companyId) {
          const res = await api.get(`/products/company/${user.companyId}`);
          setProducts(res.data?.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch company products:', err);
      }
    };

    fetchCompanyProducts();
  }, [user?.companyId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAttachmentChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.map((attachment, attachmentIndex) =>
        attachmentIndex === index
          ? { ...attachment, [field]: value }
          : attachment
      ),
    }));
  };

  const addAttachmentField = () => {
    setFormData((prev) => ({
      ...prev,
      attachments: [...prev.attachments, { ...emptyAttachment }],
    }));
  };

  const removeAttachmentField = (index) => {
    setFormData((prev) => ({
      ...prev,
      attachments:
        prev.attachments.length === 1
          ? [{ ...emptyAttachment }]
          : prev.attachments.filter((_, attachmentIndex) => attachmentIndex !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!formData.title.trim()) {
      setError('Title is required');
      setLoading(false);
      return;
    }

    if (!formData.description.trim()) {
      setError('Description is required');
      setLoading(false);
      return;
    }

    try {
      const attachments = formData.attachments
        .filter((attachment) => attachment.fileName.trim() && attachment.filePath.trim())
        .map((attachment) => ({
          fileName: attachment.fileName.trim(),
          filePath: attachment.filePath.trim(),
        }));

      const response = await ticketService.createTicket(
        formData.title,
        formData.description,
        parseInt(formData.priorityId, 10),
        attachments,
        formData.productId ? parseInt(formData.productId, 10) : null
      );

      if (response.success) {
        setSuccess('Ticket created successfully! Redirecting...');
        const createdTicketId = response.ticketId || response.data?.ticketId || response.data?.TicketId;
        setTimeout(() => {
          navigate(`/tickets/${createdTicketId}`);
        }, 1500);
      }
    } catch (err) {
      setError(showError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="card-header">
        <div>
          <h1 className="card-title">Create New Ticket</h1>
          <p className="card-subtitle">Add issue details, choose a priority, and attach shared file links or paths.</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Ticket Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter short title for the issue"
              disabled={loading}
              maxLength="255"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Provide detailed description of the issue"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="priorityId">Priority Level</label>
            <select
              id="priorityId"
              name="priorityId"
              value={formData.priorityId}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="4">Low (48 hours)</option>
              <option value="3">Medium (24 hours)</option>
              <option value="2">High (8 hours)</option>
              <option value="1">Critical (4 hours)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="productId">Product (Optional)</label>
            <select
              id="productId"
              name="productId"
              value={formData.productId}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="">-- Select a product --</option>
              {products.map((product) => (
                <option key={product.ProductID} value={product.ProductID}>
                  {product.ProductName} (v{product.ProductVersion})
                </option>
              ))}
            </select>
            {products.length === 0 && (
              <p style={{ color: '#94A3B8', fontSize: '12px', marginTop: '4px' }}>
                No products assigned to your company
              </p>
            )}
          </div>

          <div className="form-group">
            <div className="section-header-row">
              <div>
                <label style={{ marginBottom: '4px' }}>Attachments</label>
                <p className="field-hint">Optional. Add a file name and its accessible path or URL.</p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={addAttachmentField}
                disabled={loading}
              >
                Add Attachment
              </button>
            </div>

            <div className="attachment-list">
              {formData.attachments.map((attachment, index) => (
                <div key={`attachment-${index}`} className="attachment-row">
                  <input
                    type="text"
                    value={attachment.fileName}
                    onChange={(e) => handleAttachmentChange(index, 'fileName', e.target.value)}
                    placeholder="File name"
                    disabled={loading}
                  />
                  <input
                    type="text"
                    value={attachment.filePath}
                    onChange={(e) => handleAttachmentChange(index, 'filePath', e.target.value)}
                    placeholder="File path or URL"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => removeAttachmentField(index)}
                    disabled={loading}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Ticket'}
            </button>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => navigate('/tickets')}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicket;

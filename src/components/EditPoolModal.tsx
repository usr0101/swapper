import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { updatePool } from '../lib/supabase';
import { PoolConfig } from '../lib/supabase';

interface EditPoolModalProps {
  pool: PoolConfig;
  onClose: () => void;
  onSave: (updatedPool: PoolConfig) => void;
}

export const EditPoolModal: React.FC<EditPoolModalProps> = ({ pool, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    collection_name: pool.collection_name,
    collection_image: pool.collection_image,
    swap_fee: pool.swap_fee.toString(),
    description: pool.description || '',
  });
  
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.collection_name.trim()) {
      newErrors.collection_name = 'Collection name is required';
    }

    if (!formData.collection_image.trim()) {
      newErrors.collection_image = 'Collection image URL is required';
    } else if (!isValidUrl(formData.collection_image)) {
      newErrors.collection_image = 'Invalid image URL format';
    }

    const swapFee = parseFloat(formData.swap_fee);
    if (isNaN(swapFee) || swapFee < 0 || swapFee > 10) {
      newErrors.swap_fee = 'Swap fee must be between 0 and 10 SOL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const updates = {
        collection_name: formData.collection_name,
        collection_image: formData.collection_image,
        swap_fee: parseFloat(formData.swap_fee),
        description: formData.description,
      };

      const updatedPool = await updatePool(pool.collection_id, updates);
      onSave(updatedPool);
    } catch (error) {
      console.error('Error updating pool:', error);
      setErrors({ general: 'Failed to update pool. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/20 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Edit Pool</h2>
              <p className="text-gray-400 mt-1">Update pool information</p>
              <p className="text-blue-200 text-sm mt-1">
                Pool ID: {pool.collection_id} • Address: {pool.pool_address.slice(0, 8)}...{pool.pool_address.slice(-8)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* General Error */}
          {errors.general && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="text-red-200 font-medium">Error</p>
                  <p className="text-red-100/80 text-sm mt-1">{errors.general}</p>
                </div>
              </div>
            </div>
          )}

          {/* Read-only fields */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">Pool Information (Read-only)</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-gray-400 mb-1">Collection ID</label>
                <p className="text-white font-mono">{pool.collection_id}</p>
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Collection Symbol</label>
                <p className="text-white font-mono">{pool.collection_symbol}</p>
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Pool Address</label>
                <p className="text-white font-mono">{pool.pool_address}</p>
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Collection Address</label>
                <p className="text-white font-mono">{pool.collection_address}</p>
              </div>
            </div>
          </div>

          {/* Editable fields */}
          
          {/* Collection Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Collection Name *
            </label>
            <input
              type="text"
              value={formData.collection_name}
              onChange={(e) => handleInputChange('collection_name', e.target.value)}
              className={`w-full px-4 py-2 bg-white/10 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.collection_name ? 'border-red-500' : 'border-white/20'
              }`}
              placeholder="e.g., My NFT Collection"
            />
            {errors.collection_name && (
              <p className="text-red-400 text-sm mt-1">{errors.collection_name}</p>
            )}
          </div>

          {/* Collection Image */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Collection Image URL *
            </label>
            <input
              type="url"
              value={formData.collection_image}
              onChange={(e) => handleInputChange('collection_image', e.target.value)}
              className={`w-full px-4 py-2 bg-white/10 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.collection_image ? 'border-red-500' : 'border-white/20'
              }`}
              placeholder="https://example.com/collection-image.jpg"
            />
            {errors.collection_image && (
              <p className="text-red-400 text-sm mt-1">{errors.collection_image}</p>
            )}
            {formData.collection_image && isValidUrl(formData.collection_image) && (
              <div className="mt-2">
                <img 
                  src={formData.collection_image} 
                  alt="Collection preview" 
                  className="w-20 h-20 rounded-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Swap Fee */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Swap Fee (SOL) *
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              max="10"
              value={formData.swap_fee}
              onChange={(e) => handleInputChange('swap_fee', e.target.value)}
              className={`w-full px-4 py-2 bg-white/10 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.swap_fee ? 'border-red-500' : 'border-white/20'
              }`}
            />
            {errors.swap_fee && (
              <p className="text-red-400 text-sm mt-1">{errors.swap_fee}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              Fee charged for each swap in this pool
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="Optional description for this collection pool"
            />
          </div>

          {/* Warning */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="text-blue-200 font-medium mb-1">Pool Update</p>
                <p className="text-blue-100/80">
                  Changes will be applied immediately. Pool address and collection settings cannot be modified for security reasons.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white py-3 rounded-xl font-medium transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 rounded-xl font-bold transition-all duration-200 hover:shadow-lg transform hover:scale-105 disabled:transform-none flex items-center justify-center space-x-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
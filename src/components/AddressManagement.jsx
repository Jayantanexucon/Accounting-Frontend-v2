import React, { useState, useEffect } from 'react';
import {
  Plus, Edit, Trash2, MapPin, CheckCircle, XCircle,
  Building2, Globe, Hash, FileText, Tag
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const ADDRESS_TYPES = {
  DEFAULT: { label: 'Default/Billing Address', color: 'bg-blue-100 text-blue-800' },
  SHIP_TO: { label: 'Ship To Address', color: 'bg-green-100 text-green-800' },
  BILL_TO: { label: 'Bill To Address', color: 'bg-purple-100 text-purple-800' },
  BRANCH: { label: 'Branch Address', color: 'bg-orange-100 text-orange-800' }
};

const TAX_TYPES = [
  'GST', 'PAN', 'VAT', 'EIN', 'SSN',
  'CompanyNumber', 'NationalID', 'TIN',
  'ABN', 'ACN', 'UEN', 'BN', 'GST_HST',
  'CorporateNumber', 'SIREN', 'Steuernummer', 'TRN'
];

const COUNTRIES = [
  'India', 'USA', 'UK', 'Canada', 'Australia',
  'Germany', 'France', 'Singapore', 'UAE', 'Saudi Arabia'
];

const AddressManagement = ({
  entityType, // 'client' or 'vendor'
  entityId,
  addresses: initialAddresses = [],
  onAddressesChange,
  readOnly = false
}) => {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [loading, setLoading] = useState(false);

  const api = entityType === 'client'
    ? {
        add: window.clientApi?.addClientAddressApi,
        update: window.clientApi?.updateClientAddressApi,
        delete: window.clientApi?.deleteClientAddressApi,
        get: window.clientApi?.getClientAddressesApi
      }
    : {
        add: window.vendorApi?.addVendorAddressApi,
        update: window.vendorApi?.updateVendorAddressApi,
        delete: window.vendorApi?.deleteVendorAddressApi,
        get: window.vendorApi?.getVendorAddressesApi
      };

  useEffect(() => {
    setAddresses(initialAddresses);
  }, [initialAddresses]);

  const handleAddAddress = () => {
    setEditingAddress(null);
    setShowForm(true);
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setShowForm(true);
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;

    try {
      setLoading(true);
      await api.delete(entityId, addressId);
      const updatedAddresses = addresses.filter(addr => addr._id !== addressId);
      setAddresses(updatedAddresses);
      onAddressesChange?.(updatedAddresses);
      toast.success('Address deleted successfully');
    } catch (error) {
      toast.error('Failed to delete address');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (addressData) => {
    try {
      setLoading(true);
      let result;

      if (editingAddress) {
        result = await api.update(entityId, editingAddress._id, addressData);
        const updatedAddresses = addresses.map(addr =>
          addr._id === editingAddress._id ? result.data : addr
        );
        setAddresses(updatedAddresses);
        onAddressesChange?.(updatedAddresses);
        toast.success('Address updated successfully');
      } else {
        result = await api.add(entityId, addressData);
        const updatedAddresses = [...addresses, result.data];
        setAddresses(updatedAddresses);
        onAddressesChange?.(updatedAddresses);
        toast.success('Address added successfully');
      }

      setShowForm(false);
      setEditingAddress(null);
    } catch (error) {
      toast.error(`Failed to ${editingAddress ? 'update' : 'add'} address`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingAddress(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Addresses</h3>
          <span className="text-sm text-gray-500">({addresses.length})</span>
        </div>
        {!readOnly && (
          <button
            onClick={handleAddAddress}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={loading}
          >
            <Plus className="w-4 h-4" />
            Add Address
          </button>
        )}
      </div>

      {/* Address List */}
      <div className="space-y-3">
        {addresses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No addresses added yet</p>
            {!readOnly && (
              <button
                onClick={handleAddAddress}
                className="mt-2 text-blue-600 hover:text-blue-800"
              >
                Add your first address
              </button>
            )}
          </div>
        ) : (
          addresses.map((address) => (
            <AddressCard
              key={address._id}
              address={address}
              onEdit={() => handleEditAddress(address)}
              onDelete={() => handleDeleteAddress(address._id)}
              readOnly={readOnly}
              loading={loading}
            />
          ))
        )}
      </div>

      {/* Address Form Modal */}
      {showForm && (
        <AddressForm
          address={editingAddress}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          loading={loading}
        />
      )}
    </div>
  );
};

const AddressCard = ({ address, onEdit, onDelete, readOnly, loading }) => {
  const typeInfo = ADDRESS_TYPES[address.type] || ADDRESS_TYPES.DEFAULT;

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
            {address.label && (
              <span className="text-sm font-medium text-gray-900">{address.label}</span>
            )}
            {address.type === 'DEFAULT' && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="w-3 h-3" />
                Primary
              </span>
            )}
          </div>

          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <Building2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                {[address.line1, address.line2].filter(Boolean).join(', ')}
                {address.city && `, ${address.city}`}
                {address.state && `, ${address.state}`}
                {address.country && `, ${address.country}`}
                {address.pinCode && ` - ${address.pinCode}`}
              </span>
            </div>

            {address.stateCode && (
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                <span>State Code: {address.stateCode}</span>
              </div>
            )}

            {address.gstStateCode && (
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                <span>GST State Code: {address.gstStateCode}</span>
              </div>
            )}

            {address.taxNumber && (
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>{address.taxType || 'Tax ID'}: {address.taxNumber}</span>
              </div>
            )}
          </div>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-1 ml-4">
            <button
              onClick={onEdit}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
              disabled={loading}
              title="Edit address"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              disabled={loading}
              title="Delete address"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const AddressForm = ({ address, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    type: 'SHIP_TO',
    label: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    country: 'India',
    pinCode: '',
    stateCode: '',
    gstStateCode: '',
    taxNumber: '',
    taxType: '',
    notes: '',
    ...address
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {address ? 'Edit Address' : 'Add New Address'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type and Label */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {Object.entries(ADDRESS_TYPES).map(([key, info]) => (
                    <option key={key} value={key}>{info.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Label (Optional)
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => handleChange('label', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Head Office, Warehouse"
                />
              </div>
            </div>

            {/* Address Lines */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 1 *
              </label>
              <input
                type="text"
                value={formData.line1}
                onChange={(e) => handleChange('line1', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 2
              </label>
              <input
                type="text"
                value={formData.line2}
                onChange={(e) => handleChange('line2', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* City, State, Country */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country *
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {COUNTRIES.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* PIN Code and State Codes */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PIN/ZIP Code
                </label>
                <input
                  type="text"
                  value={formData.pinCode}
                  onChange={(e) => handleChange('pinCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State Code
                </label>
                <input
                  type="text"
                  value={formData.stateCode}
                  onChange={(e) => handleChange('stateCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GST State Code
                </label>
                <input
                  type="text"
                  value={formData.gstStateCode}
                  onChange={(e) => handleChange('gstStateCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Tax Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax Type
                </label>
                <select
                  value={formData.taxType}
                  onChange={(e) => handleChange('taxType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Tax Type</option>
                  {TAX_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax Number
                </label>
                <input
                  type="text"
                  value={formData.taxNumber}
                  onChange={(e) => handleChange('taxNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes about this address"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Saving...' : (address ? 'Update Address' : 'Add Address')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddressManagement;
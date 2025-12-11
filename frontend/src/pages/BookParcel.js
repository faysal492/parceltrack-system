import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';

const libraries = ['places'];

const BookParcel = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    pickupAddress: '',
    pickupLatitude: 0,
    pickupLongitude: 0,
    deliveryAddress: '',
    deliveryLatitude: 0,
    deliveryLongitude: 0,
    size: 'medium',
    type: '',
    paymentType: 'prepaid',
    codAmount: '',
    shippingCost: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePickupPlaceSelect = (place) => {
    if (place && place.geometry && place.formatted_address) {
      setFormData((prevData) => ({
        ...prevData,
        pickupAddress: place.formatted_address,
        pickupLatitude: place.geometry.location.lat(),
        pickupLongitude: place.geometry.location.lng(),
      }));
    }
  };

  const handleDeliveryPlaceSelect = (place) => {
    if (place && place.geometry && place.formatted_address) {
      setFormData((prevData) => ({
        ...prevData,
        deliveryAddress: place.formatted_address,
        deliveryLatitude: place.geometry.location.lat(),
        deliveryLongitude: place.geometry.location.lng(),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.pickupLatitude || !formData.deliveryLatitude) {
      setError('Please select valid pickup and delivery addresses');
      setLoading(false);
      return;
    }

    // Convert string numbers to actual numbers for backend validation
    const submitData = {
      ...formData,
      pickupLatitude: parseFloat(formData.pickupLatitude),
      pickupLongitude: parseFloat(formData.pickupLongitude),
      deliveryLatitude: parseFloat(formData.deliveryLatitude),
      deliveryLongitude: parseFloat(formData.deliveryLongitude),
      shippingCost: parseFloat(formData.shippingCost) || 0,
      codAmount: formData.paymentType === 'cod' ? (parseFloat(formData.codAmount) || 0) : undefined,
    };

    try {
      const response = await axios.post('/parcels', submitData);
      alert('Parcel booked successfully! Tracking Number: ' + response.data.trackingNumber);
      navigate('/customer');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                          (Array.isArray(error.response?.data?.message) 
                            ? error.response.data.message.join(', ') 
                            : 'Error booking parcel');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Book a Parcel</h1>
          <p className="mt-2 text-sm text-gray-600">Fill in the details to schedule a pickup</p>
        </div>

        <div className="card">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Pickup Address</label>
                <Autocomplete
                  onLoad={(autocomplete) => {
                    autocomplete.addListener('place_changed', () => {
                      const place = autocomplete.getPlace();
                      if (place && place.geometry) {
                        handlePickupPlaceSelect(place);
                      }
                    });
                  }}
                  onPlaceChanged={() => {
                    // This ensures the place is selected
                  }}
                >
                  <input
                    type="text"
                    name="pickupAddress"
                    placeholder="Enter pickup address"
                    value={formData.pickupAddress}
                    onChange={(e) => setFormData((prevData) => ({ ...prevData, pickupAddress: e.target.value }))}
                    required
                    className="form-input"
                  />
                </Autocomplete>
              </div>

              <div>
                <label className="form-label">Delivery Address</label>
                <Autocomplete
                  onLoad={(autocomplete) => {
                    autocomplete.addListener('place_changed', () => {
                      const place = autocomplete.getPlace();
                      if (place && place.geometry) {
                        handleDeliveryPlaceSelect(place);
                      }
                    });
                  }}
                  onPlaceChanged={() => {
                    // This ensures the place is selected
                  }}
                >
                  <input
                    type="text"
                    name="deliveryAddress"
                    placeholder="Enter delivery address"
                    value={formData.deliveryAddress}
                    onChange={(e) => setFormData((prevData) => ({ ...prevData, deliveryAddress: e.target.value }))}
                    required
                    className="form-input"
                  />
                </Autocomplete>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Parcel Size</label>
                <select
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  required
                  className="form-input"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="extra_large">Extra Large</option>
                </select>
              </div>

              <div>
                <label className="form-label">Parcel Type (Optional)</label>
                <input
                  type="text"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  placeholder="e.g., Documents, Electronics"
                  className="form-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Payment Type</label>
                <select
                  name="paymentType"
                  value={formData.paymentType}
                  onChange={handleChange}
                  required
                  className="form-input"
                >
                  <option value="prepaid">Prepaid</option>
                  <option value="cod">Cash on Delivery (COD)</option>
                </select>
              </div>

              {formData.paymentType === 'cod' && (
                <div>
                  <label className="form-label">COD Amount</label>
                  <input
                    type="number"
                    name="codAmount"
                    value={formData.codAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData((prevData) => ({ ...prevData, codAmount: value }));
                    }}
                    onBlur={(e) => {
                      const numValue = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                      setFormData((prevData) => ({ ...prevData, codAmount: numValue }));
                    }}
                    min="0"
                    step="0.01"
                    required={formData.paymentType === 'cod'}
                    className="form-input"
                    placeholder="0.00"
                  />
                </div>
              )}

              <div>
                <label className="form-label">Shipping Cost</label>
                <input
                  type="number"
                  name="shippingCost"
                  value={formData.shippingCost}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData((prevData) => ({ ...prevData, shippingCost: value }));
                  }}
                  onBlur={(e) => {
                    const numValue = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                    setFormData((prevData) => ({ ...prevData, shippingCost: numValue }));
                  }}
                  min="0"
                  step="0.01"
                  required
                  className="form-input"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Notes (Optional)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any special instructions..."
                rows={4}
                className="form-input"
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Booking...' : 'Book Parcel'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/customer')}
                className="btn btn-secondary px-6"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookParcel;

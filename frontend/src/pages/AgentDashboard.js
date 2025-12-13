import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from '../config/api';
import { GoogleMap, LoadScript, Marker, DirectionsRenderer } from '@react-google-maps/api';

const AgentDashboard = () => {
  const [parcels, setParcels] = useState([]);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchParcels();
  }, []);

  useEffect(() => {
    if (selectedParcel) {
      fetchRoute();
    }
  }, [selectedParcel]);

  const fetchParcels = async () => {
    try {
      const response = await axiosInstance.get('/parcels');
      setParcels(response.data);
    } catch (error) {
      console.error('Error fetching parcels:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoute = async () => {
    try {
      const response = await axiosInstance.get('/parcels/agent/route');
      if (response.data.routes && response.data.routes.length > 0) {
        setRoute(response.data);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  const updateStatus = async (parcelId, status, failureReason = '') => {
    setUpdating(true);
    try {
      await axiosInstance.patch(`/parcels/${parcelId}/status`, {
        status,
        failureReason,
      });
      alert('Status updated successfully!');
      fetchParcels();
      setSelectedParcel(null);
    } catch (error) {
      alert('Error updating status: ' + (error.response?.data?.message || error.message));
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const activeParcels = parcels.filter(
    (p) => p.status !== 'delivered' && p.status !== 'failed',
  );

  const mapContainerStyle = {
    width: '100%',
    height: '400px',
    borderRadius: '0.75rem',
  };

  const center = selectedParcel
    ? {
        lat: parseFloat(selectedParcel.pickupLatitude),
        lng: parseFloat(selectedParcel.pickupLongitude),
      }
    : { lat: 0, lng: 0 };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Deliveries</h1>
          <p className="mt-2 text-sm text-gray-600">Manage your assigned parcels and delivery routes</p>
        </div>

        <div className="card mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Assigned Parcels</h2>
          {activeParcels.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No active deliveries assigned.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tracking</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pickup</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activeParcels.map((parcel) => (
                    <tr key={parcel.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {parcel.trackingNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {parcel.customer?.firstName} {parcel.customer?.lastName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {parcel.pickupAddress}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {parcel.deliveryAddress}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge badge-${parcel.status}`}>
                          {parcel.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => setSelectedParcel(parcel)}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          View Route
                        </button>
                        <button
                          onClick={() => navigate(`/parcel/${parcel.id}`)}
                          className="text-green-600 hover:text-green-800"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedParcel && (
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Parcel Details & Route</h3>
              <button
                onClick={() => setSelectedParcel(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <p><span className="font-semibold text-gray-700">Tracking:</span> <span className="text-gray-900">{selectedParcel.trackingNumber}</span></p>
                <p><span className="font-semibold text-gray-700">Status:</span> <span className={`badge badge-${selectedParcel.status}`}>{selectedParcel.status.replace('_', ' ').toUpperCase()}</span></p>
                <p><span className="font-semibold text-gray-700">Pickup:</span> <span className="text-gray-900">{selectedParcel.pickupAddress}</span></p>
                <p><span className="font-semibold text-gray-700">Delivery:</span> <span className="text-gray-900">{selectedParcel.deliveryAddress}</span></p>
              </div>
            </div>

            <div className="mb-6">
              <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''}>
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={center}
                  zoom={12}
                >
                  <Marker
                    position={{
                      lat: parseFloat(selectedParcel.pickupLatitude),
                      lng: parseFloat(selectedParcel.pickupLongitude),
                    }}
                    label="Pickup"
                  />
                  <Marker
                    position={{
                      lat: parseFloat(selectedParcel.deliveryLatitude),
                      lng: parseFloat(selectedParcel.deliveryLongitude),
                    }}
                    label="Delivery"
                  />
                  {route && route.routes && route.routes[0] && (
                    <DirectionsRenderer directions={route} />
                  )}
                </GoogleMap>
              </LoadScript>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h4>
              <div className="flex flex-wrap gap-3">
                <button
                  className="btn btn-success"
                  onClick={() => updateStatus(selectedParcel.id, 'picked_up')}
                  disabled={updating || selectedParcel.status === 'picked_up'}
                >
                  Mark as Picked Up
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => updateStatus(selectedParcel.id, 'in_transit')}
                  disabled={updating || selectedParcel.status === 'in_transit'}
                >
                  Mark as In Transit
                </button>
                <button
                  className="btn btn-success"
                  onClick={() => updateStatus(selectedParcel.id, 'delivered')}
                  disabled={updating || selectedParcel.status === 'delivered'}
                >
                  Mark as Delivered
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    const reason = prompt('Enter failure reason:');
                    if (reason) {
                      updateStatus(selectedParcel.id, 'failed', reason);
                    }
                  }}
                  disabled={updating}
                >
                  Mark as Failed
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentDashboard;

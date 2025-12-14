import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useLoadScript, GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import io from 'socket.io-client';

const ParcelDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [parcel, setParcel] = useState(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [failureReason, setFailureReason] = useState('');
  const [socket, setSocket] = useState(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'],
  });

  const fetchRoute = useCallback(async (parcelId) => {
    try {
      const response = await axios.get(`/parcels/${parcelId}/route`);
      setRoute(response.data);
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  }, []);

  const fetchParcel = useCallback(async () => {
    try {
      const response = await axios.get(`/parcels/${id}`);
      setParcel(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching parcel:', error);
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchParcel();
    
    if (parcel?.id) {
      fetchRoute(parcel.id);
    }
  }, [fetchParcel, fetchRoute, parcel?.id]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const newSocket = io('http://localhost:3000', {
      auth: { token },
    });

    newSocket.on('connect', () => {
      newSocket.emit('subscribe_parcel', { parcelId: id });
    });

    newSocket.on('parcel_update', (updatedParcel) => {
      setParcel(updatedParcel);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [id]);

  const handleStatusUpdate = async () => {
    if (!newStatus) return;

    setUpdating(true);
    try {
      await axios.patch(`/parcels/${id}/status`, {
        status: newStatus,
        failureReason: newStatus === 'failed' ? failureReason : undefined,
      });
      alert('Status updated successfully!');
      fetchParcel();
      setNewStatus('');
      setFailureReason('');
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

  if (!parcel) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Parcel Not Found</h2>
          </div>
        </div>
      </div>
    );
  }

  const mapContainerStyle = {
    width: '100%',
    height: '400px',
    borderRadius: '0.75rem',
  };

  const center = {
    lat: parseFloat(parcel.pickupLatitude),
    lng: parseFloat(parcel.pickupLongitude),
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: 'badge-pending',
      assigned: 'badge-assigned',
      picked_up: 'badge-picked_up',
      in_transit: 'badge-in_transit',
      delivered: 'badge-delivered',
      failed: 'badge-failed',
    };
    return statusMap[status] || 'badge-pending';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Parcel Details</h2>
              <p className="text-primary-600 font-mono text-lg mt-1">{parcel.trackingNumber}</p>
            </div>
            <span className={`badge ${getStatusBadge(parcel.status)} text-sm`}>
              {parcel.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Customer</p>
                <p className="text-gray-900">{parcel.customer?.firstName} {parcel.customer?.lastName}</p>
              </div>
              {parcel.deliveryAgent && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Delivery Agent</p>
                  <p className="text-gray-900">{parcel.deliveryAgent.firstName} {parcel.deliveryAgent.lastName}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-500">Pickup Address</p>
                <p className="text-gray-900">{parcel.pickupAddress}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Delivery Address</p>
                <p className="text-gray-900">{parcel.deliveryAddress}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Size</p>
                <p className="text-gray-900 capitalize">{parcel.size}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Payment Type</p>
                <p className="text-gray-900">{parcel.paymentType.toUpperCase()}</p>
              </div>
              {parcel.paymentType === 'cod' && (
                <div>
                  <p className="text-sm font-medium text-gray-500">COD Amount</p>
                  <p className="text-gray-900">${parcel.codAmount}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-500">Shipping Cost</p>
                <p className="text-gray-900">${parcel.shippingCost}</p>
              </div>
              {parcel.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Notes</p>
                  <p className="text-gray-900">{parcel.notes}</p>
                </div>
              )}
            </div>
          </div>

          {parcel.failureReason && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="font-semibold">Failure Reason:</p>
              <p>{parcel.failureReason}</p>
            </div>
          )}

          {isLoaded && (
            <div className="mb-6">
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={center}
                zoom={12}
              >
                <Marker
                  position={{
                    lat: parseFloat(parcel.pickupLatitude),
                    lng: parseFloat(parcel.pickupLongitude),
                  }}
                  label="Pickup"
                />
                <Marker
                  position={{
                    lat: parseFloat(parcel.deliveryLatitude),
                    lng: parseFloat(parcel.deliveryLongitude),
                  }}
                  label="Delivery"
                />
                {parcel.currentLatitude && parcel.currentLongitude && (
                  <Marker
                    position={{
                      lat: parseFloat(parcel.currentLatitude),
                      lng: parseFloat(parcel.currentLongitude),
                    }}
                    label="Current"
                  />
                )}
                {route && route.routes && route.routes[0] && (
                  <DirectionsRenderer directions={route} />
                )}
              </GoogleMap>
            </div>
          )}

          {(user?.role === 'delivery_agent' || user?.role === 'admin') && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h3>
              <div className="space-y-4">
                <div>
                  <label className="form-label">New Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="form-input"
                  >
                    <option value="">Select status</option>
                    <option value="picked_up">Picked Up</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                {newStatus === 'failed' && (
                  <div>
                    <label className="form-label">Failure Reason</label>
                    <input
                      type="text"
                      value={failureReason}
                      onChange={(e) => setFailureReason(e.target.value)}
                      placeholder="Enter reason for failure"
                      className="form-input"
                    />
                  </div>
                )}
                <div className="flex space-x-3">
                  <button
                    onClick={handleStatusUpdate}
                    disabled={!newStatus || updating}
                    className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updating ? 'Updating...' : 'Update Status'}
                  </button>
                  <button
                    onClick={() => navigate(-1)}
                    className="btn btn-secondary"
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          )}

          {!(user?.role === 'delivery_agent' || user?.role === 'admin') && (
            <div className="border-t border-gray-200 pt-6">
              <button
                onClick={() => navigate(-1)}
                className="btn btn-secondary"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParcelDetails;

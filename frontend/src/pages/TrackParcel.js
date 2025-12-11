import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useLoadScript, GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import io from 'socket.io-client';
import API_URL from '../config/api';

const TrackParcel = () => {
  const { trackingNumber } = useParams();
  const [parcel, setParcel] = useState(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'],
  });

  useEffect(() => {
    fetchParcel();
    setupSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [trackingNumber]);

  const setupSocket = () => {
    const token = localStorage.getItem('token');
    const socketUrl = API_URL.replace('/api', ''); // Remove /api if present
    const newSocket = io(socketUrl, {
      auth: { token },
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      newSocket.emit('subscribe_parcel', { parcelId: parcel?.id });
    });

    newSocket.on('parcel_update', (updatedParcel) => {
      setParcel(updatedParcel);
    });

    setSocket(newSocket);
  };

  const fetchParcel = async () => {
    try {
      const response = await axios.get(`/parcels/track/${trackingNumber}`);
      setParcel(response.data);
      
      if (response.data.id) {
        fetchRoute(response.data.id);
      }
    } catch (error) {
      console.error('Error fetching parcel:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoute = async (parcelId) => {
    try {
      const response = await axios.get(`/parcels/${parcelId}/route`);
      setRoute(response.data);
    } catch (error) {
      console.error('Error fetching route:', error);
    }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <h3 className="font-semibold mb-2">Google Maps Error</h3>
              <p>Failed to load Google Maps. Please check:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Google Maps API key is set in .env file</li>
                <li>API key has Maps JavaScript API enabled</li>
                <li>API key restrictions allow your domain</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!parcel) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Parcel Not Found</h2>
            <p className="text-gray-600">The tracking number you entered does not exist.</p>
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Track Parcel</h2>
              <p className="text-primary-600 font-mono text-lg mt-1">{parcel.trackingNumber}</p>
            </div>
            <span className={`badge ${getStatusBadge(parcel.status)} text-sm`}>
              {parcel.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Pickup Address</p>
                <p className="text-gray-900">{parcel.pickupAddress}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Delivery Address</p>
                <p className="text-gray-900">{parcel.deliveryAddress}</p>
              </div>
            </div>
            <div className="space-y-3">
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
              {parcel.deliveryAgent && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Delivery Agent</p>
                  <p className="text-gray-900">{parcel.deliveryAgent.firstName} {parcel.deliveryAgent.lastName}</p>
                </div>
              )}
            </div>
          </div>

          {isLoaded ? (
            <div className="mb-6">
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={center}
                zoom={12}
                options={{
                  disableDefaultUI: false,
                  zoomControl: true,
                  streetViewControl: false,
                }}
                onLoad={(map) => {
                  console.log('Map loaded successfully');
                }}
                onError={(error) => {
                  console.error('Map error:', error);
                }}
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
                    label="Current Location"
                  />
                )}
                {route && route.routes && route.routes[0] && (
                  <DirectionsRenderer directions={route} />
                )}
              </GoogleMap>
            </div>
          ) : (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
              <p>Loading map...</p>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status History</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-3 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Created: {new Date(parcel.createdAt).toLocaleString()}</span>
              </div>
              {parcel.pickedUpAt && (
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600">Picked Up: {new Date(parcel.pickedUpAt).toLocaleString()}</span>
                </div>
              )}
              {parcel.deliveredAt && (
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Delivered: {new Date(parcel.deliveredAt).toLocaleString()}</span>
                </div>
              )}
              {parcel.failureReason && (
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-red-600">Failed: {parcel.failureReason}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackParcel;

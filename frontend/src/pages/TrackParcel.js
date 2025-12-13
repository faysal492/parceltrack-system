import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import API_URL, { axiosInstance } from '../config/api';

const TrackParcel = () => {
  const { trackingNumber } = useParams();
  const [parcel, setParcel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [mapError, setMapError] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);

  const fetchParcel = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get(`/parcels/track/${trackingNumber}`);
      setParcel(response.data);
    } catch (error) {
      console.error('Error fetching parcel:', error);
      setError(error.response?.data?.message || 'Failed to load parcel information');
      setParcel(null);
    } finally {
      setLoading(false);
    }
  }, [trackingNumber]);

  useEffect(() => {
    fetchParcel();
  }, [fetchParcel]);

  // Load Google Maps API
  useEffect(() => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn('Google Maps API key not found in environment variables');
      setMapError(true);
      return;
    }

    // Check if Google Maps is already loaded
    if (window.google?.maps) {
      setMapsLoaded(true);
      return;
    }

    // Load the Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setMapsLoaded(true);
      setMapError(false);
    };

    script.onerror = () => {
      console.error('Failed to load Google Maps API');
      setMapError(true);
      setMapsLoaded(false);
    };

    document.head.appendChild(script);

    return () => {
      // Clean up on unmount
      if (script && document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Setup socket when parcel is loaded (optional - only if user is logged in)
  useEffect(() => {
    if (!parcel || !parcel.id) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
      // Public tracking - no socket connection needed
      return;
    }
    
    let newSocket;
    try {
      const socketUrl = API_URL.replace('/api', '').replace(/\/$/, '');
      newSocket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
        newSocket.emit('subscribe_parcel', { parcelId: parcel.id });
      });

      newSocket.on('connect_error', (err) => {
        console.warn('Socket connection error:', err);
        // Don't show error to user - socket is optional
      });

      newSocket.on('parcel_update', (updatedParcel) => {
        setParcel(updatedParcel);
      });

      setSocket(newSocket);
    } catch (err) {
      console.error('Socket setup error:', err);
      // Socket is optional, continue without it
    }

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [parcel?.id]);

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

  // Initialize and render Google Map
  const renderMap = useCallback(() => {
    if (!mapsLoaded || !parcel?.pickupLatitude || !parcel?.pickupLongitude) {
      return null;
    }

    const mapContainer = document.getElementById('parcel-tracking-map');
    if (!mapContainer) return null;

    try {
      const pickupLat = parseFloat(parcel.pickupLatitude);
      const pickupLng = parseFloat(parcel.pickupLongitude);
      const deliveryLat = parcel.deliveryLatitude ? parseFloat(parcel.deliveryLatitude) : null;
      const deliveryLng = parcel.deliveryLongitude ? parseFloat(parcel.deliveryLongitude) : null;

      const center = { lat: pickupLat, lng: pickupLng };

      const map = new window.google.maps.Map(mapContainer, {
        zoom: 12,
        center: center,
        mapTypeControl: true,
        fullscreenControl: true,
        streetViewControl: false,
      });

      // Pickup Info Window
      const pickupInfoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; font-family: Arial, sans-serif;">
            <h3 style="margin: 0 0 8px 0; color: #1F2937; font-size: 16px; font-weight: bold;">📍 Pickup Location</h3>
            <p style="margin: 4px 0; color: #374151; font-size: 14px;"><strong>Address:</strong></p>
            <p style="margin: 4px 0; color: #4B5563; font-size: 13px;">${parcel.pickupAddress || 'N/A'}</p>
            <p style="margin: 8px 0 0 0; color: #6B7280; font-size: 12px;">
              <strong>Coordinates:</strong> ${pickupLat.toFixed(4)}, ${pickupLng.toFixed(4)}
            </p>
          </div>
        `,
      });

      // Add pickup marker with click listener
      const pickupMarker = new window.google.maps.Marker({
        position: { lat: pickupLat, lng: pickupLng },
        map: map,
        title: 'Pickup Location',
        icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
      });

      pickupMarker.addListener('click', () => {
        pickupInfoWindow.open(map, pickupMarker);
      });

      // Open pickup info window by default
      pickupInfoWindow.open(map, pickupMarker);

      // Add delivery marker and info window if coordinates exist
      if (deliveryLat && deliveryLng) {
        const deliveryInfoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 12px; font-family: Arial, sans-serif;">
              <h3 style="margin: 0 0 8px 0; color: #1F2937; font-size: 16px; font-weight: bold;">🏠 Delivery Location</h3>
              <p style="margin: 4px 0; color: #374151; font-size: 14px;"><strong>Address:</strong></p>
              <p style="margin: 4px 0; color: #4B5563; font-size: 13px;">${parcel.deliveryAddress || 'N/A'}</p>
              <p style="margin: 8px 0 0 0; color: #6B7280; font-size: 12px;">
                <strong>Coordinates:</strong> ${deliveryLat.toFixed(4)}, ${deliveryLng.toFixed(4)}
              </p>
            </div>
          `,
        });

        const deliveryMarker = new window.google.maps.Marker({
          position: { lat: deliveryLat, lng: deliveryLng },
          map: map,
          title: 'Delivery Location',
          icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        });

        deliveryMarker.addListener('click', () => {
          deliveryInfoWindow.open(map, deliveryMarker);
        });

        // Open delivery info window with a slight delay for better UX
        setTimeout(() => {
          deliveryInfoWindow.open(map, deliveryMarker);
        }, 800);

        // Add polyline between pickup and delivery
        new window.google.maps.Polyline({
          path: [
            { lat: pickupLat, lng: pickupLng },
            { lat: deliveryLat, lng: deliveryLng },
          ],
          geodesic: true,
          strokeColor: '#4F46E5',
          strokeOpacity: 0.7,
          strokeWeight: 3,
          map: map,
        });

        // Adjust map bounds to show both pickup and delivery
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend({ lat: pickupLat, lng: pickupLng });
        bounds.extend({ lat: deliveryLat, lng: deliveryLng });
        map.fitBounds(bounds);
      }

      // Add current location marker if available
      if (parcel.currentLatitude && parcel.currentLongitude) {
        const currentLat = parseFloat(parcel.currentLatitude);
        const currentLng = parseFloat(parcel.currentLongitude);

        const currentInfoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 12px; font-family: Arial, sans-serif;">
              <h3 style="margin: 0 0 8px 0; color: #1F2937; font-size: 16px; font-weight: bold;">📌 Current Location</h3>
              <p style="margin: 4px 0; color: #6B7280; font-size: 12px;">
                <strong>Coordinates:</strong> ${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}
              </p>
            </div>
          `,
        });

        const currentMarker = new window.google.maps.Marker({
          position: { lat: currentLat, lng: currentLng },
          map: map,
          title: 'Current Location',
          icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
        });

        currentMarker.addListener('click', () => {
          currentInfoWindow.open(map, currentMarker);
        });
      }
    } catch (err) {
      console.error('Error rendering map:', err);
      setMapError(true);
    }
  }, [mapsLoaded, parcel]);

  // Render map when ready
  useEffect(() => {
    if (mapsLoaded && parcel?.pickupLatitude && parcel?.pickupLongitude) {
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        renderMap();
      }, 0);
    }
  }, [mapsLoaded, parcel, renderMap]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading parcel information...</p>
        </div>
      </div>
    );
  }

  if (error && !parcel) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card text-center py-12">
            <div className="mb-4">
              <svg className="w-16 h-16 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Parcel</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              Retry
            </button>
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Track Parcel</h2>
              <p className="text-primary-600 font-mono text-lg mt-1">{parcel?.trackingNumber || ''}</p>
            </div>
            {parcel?.status && (
              <span className={`badge ${getStatusBadge(parcel.status)} text-sm`}>
                {parcel.status?.replace('_', ' ')?.toUpperCase() || 'UNKNOWN'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Pickup Address</p>
                <p className="text-gray-900">{parcel?.pickupAddress || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Delivery Address</p>
                <p className="text-gray-900">{parcel?.deliveryAddress || 'N/A'}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Payment Type</p>
                <p className="text-gray-900">{parcel?.paymentType?.toUpperCase?.() || 'N/A'}</p>
              </div>
              {parcel?.paymentType === 'cod' && (
                <div>
                  <p className="text-sm font-medium text-gray-500">COD Amount</p>
                  <p className="text-gray-900">${parcel?.codAmount || '0'}</p>
                </div>
              )}
              {parcel?.deliveryAgent && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Delivery Agent</p>
                  <p className="text-gray-900">
                    {parcel.deliveryAgent?.fullName || `${parcel.deliveryAgent?.firstName || ''} ${parcel.deliveryAgent?.lastName || ''}`.trim() || 'N/A'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Map Section */}
          {mapError ? (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
              <h4 className="font-semibold mb-2">⚠️ Map Not Available</h4>
              <p className="text-sm mb-2">Google Maps could not be loaded. Showing coordinates instead:</p>
              <div className="text-sm space-y-1 mt-2">
                {parcel?.pickupLatitude && parcel?.pickupLongitude && (
                  <p>📍 Pickup: ({parcel.pickupLatitude}, {parcel.pickupLongitude})</p>
                )}
                {parcel?.deliveryLatitude && parcel?.deliveryLongitude && (
                  <p>📍 Delivery: ({parcel.deliveryLatitude}, {parcel.deliveryLongitude})</p>
                )}
              </div>
            </div>
          ) : mapsLoaded && parcel?.pickupLatitude && parcel?.pickupLongitude ? (
            <div className="mb-6 rounded-lg overflow-hidden border border-gray-200">
              <div
                id="parcel-tracking-map"
                style={{
                  width: '100%',
                  height: '400px',
                  borderRadius: '0.5rem',
                }}
              ></div>
            </div>
          ) : (
            <div className="mb-6 bg-gray-100 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg">
              <p className="text-sm">Loading map...</p>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status History</h3>
            <div className="space-y-2">
              {parcel.createdAt && (
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Created: {new Date(parcel.createdAt).toLocaleString()}</span>
                </div>
              )}
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

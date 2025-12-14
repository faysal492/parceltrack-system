import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from '../config/api';

const AgentDashboard = () => {
  const [parcels, setParcels] = useState([]);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const navigate = useNavigate();

  // Check if Google Maps API key is available
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  // Load Google Maps API (same approach as TrackParcel.js which works)
  useEffect(() => {
    if (!apiKey) {
      console.warn('Google Maps API key not found');
      setMapError(true);
      return;
    }

    // Check if Google Maps is already loaded
    if (window.google?.maps) {
      setMapsLoaded(true);
      setMapError(false);
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
  }, [apiKey]);

  useEffect(() => {
    fetchParcels();
  }, []);

  useEffect(() => {
    if (selectedParcel) {
      fetchRoute();
    }
  }, [selectedParcel]);


  // Suppress React error overlay for Google Maps script errors
  useEffect(() => {
    if (!apiKey) return; // Don't suppress if no API key (different error)

    // Function to hide React's error overlay for Google Maps errors
    const hideErrorOverlay = () => {
      // React error overlay can be in various forms
      const overlaySelectors = [
        'body > div[style*="position: fixed"]',
        '#react-error-overlay',
        '[data-react-error-overlay]',
      ];

      overlaySelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            const text = (element.textContent || element.innerText || '').toLowerCase();
            if (text.includes('script error') || 
                text.includes('handleerror') ||
                text.includes('maps.googleapis.com') ||
                (text.includes('uncaught') && text.includes('runtime'))) {
              element.style.display = 'none';
              element.remove();
            }
          });
        } catch (e) {
          // Ignore errors in selector
        }
      });

      // Remove iframes that might contain error overlay
      document.querySelectorAll('iframe').forEach(iframe => {
        try {
          const src = iframe.src || '';
          if (src.includes('react-error-overlay') || src.includes('error')) {
            iframe.remove();
          }
        } catch (e) {
          // Cross-origin iframe, can't access
        }
      });
    };

    // Run immediately
    hideErrorOverlay();
    
    // Run periodically to catch dynamically added overlays
    const interval = setInterval(hideErrorOverlay, 100);

    // Watch for DOM changes
    const observer = new MutationObserver(() => {
      hideErrorOverlay();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    // Suppress error events before they reach React
    const handleError = (event) => {
      const isGoogleMapsError = 
        event.message === 'Script error.' || 
        (event.filename && (
          event.filename.includes('maps.googleapis.com') ||
          event.filename.includes('googleapis')
        ));

      if (isGoogleMapsError) {
        console.warn('Google Maps script error (handled gracefully):', event.message);
        setMapError(true);
        hideErrorOverlay();
        event.preventDefault();
        event.stopImmediatePropagation();
        return true;
      }
      return false;
    };

    // Use capture phase to catch errors early
    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason?.toString() || '';
      if (reason.includes('maps') || reason.includes('google')) {
        console.warn('Google Maps promise rejection (handled):', reason);
        setMapError(true);
        hideErrorOverlay();
        event.preventDefault();
      }
    }, true);
    
    return () => {
      clearInterval(interval);
      observer.disconnect();
      window.removeEventListener('error', handleError, true);
    };
  }, [apiKey]);

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
      if (response.data && response.data.routes && response.data.routes.length > 0) {
        setRoute(response.data);
      } else {
        setRoute(null);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      setRoute(null);
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

  // Render map using manual approach (same as TrackParcel.js)
  const renderMap = useCallback(() => {
    if (!mapsLoaded || !selectedParcel?.pickupLatitude || !selectedParcel?.pickupLongitude) {
      return;
    }

    const mapContainer = document.getElementById('agent-parcel-map');
    if (!mapContainer) return;

    try {
      const pickupLat = parseFloat(selectedParcel.pickupLatitude);
      const pickupLng = parseFloat(selectedParcel.pickupLongitude);
      const deliveryLat = selectedParcel.deliveryLatitude ? parseFloat(selectedParcel.deliveryLatitude) : null;
      const deliveryLng = selectedParcel.deliveryLongitude ? parseFloat(selectedParcel.deliveryLongitude) : null;

      const center = { lat: pickupLat, lng: pickupLng };

      const map = new window.google.maps.Map(mapContainer, {
        zoom: 12,
        center: center,
        mapTypeControl: true,
        fullscreenControl: true,
        streetViewControl: false,
      });

      // Pickup marker
      const pickupMarker = new window.google.maps.Marker({
        position: { lat: pickupLat, lng: pickupLng },
        map: map,
        title: 'Pickup Location',
        icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
      });

      // Delivery marker if coordinates exist
      if (deliveryLat && deliveryLng) {
        const deliveryMarker = new window.google.maps.Marker({
          position: { lat: deliveryLat, lng: deliveryLng },
          map: map,
          title: 'Delivery Location',
          icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        });

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

        // Adjust map bounds to show both
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend({ lat: pickupLat, lng: pickupLng });
        bounds.extend({ lat: deliveryLat, lng: deliveryLng });
        map.fitBounds(bounds);
      }

      // Add directions if route is available
      if (route && route.routes && route.routes.length > 0) {
        const directionsService = new window.google.maps.DirectionsService();
        const directionsRenderer = new window.google.maps.DirectionsRenderer({
          map: map,
          suppressMarkers: false,
        });

        directionsService.route(
          {
            origin: { lat: pickupLat, lng: pickupLng },
            destination: { lat: deliveryLat, lng: deliveryLng },
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === window.google.maps.DirectionsStatus.OK) {
              directionsRenderer.setDirections(result);
            }
          }
        );
      }
    } catch (err) {
      console.error('Error rendering map:', err);
      setMapError(true);
    }
  }, [mapsLoaded, selectedParcel, route]);

  // Render map when ready
  useEffect(() => {
    if (mapsLoaded && selectedParcel?.pickupLatitude && selectedParcel?.pickupLongitude) {
      setTimeout(() => {
        renderMap();
      }, 100);
    }
  }, [mapsLoaded, selectedParcel, renderMap]);

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

  // Map renderer component
  const MapRenderer = ({ selectedParcel, route, mapContainerStyle }) => {
    return (
      <div className="rounded-lg overflow-hidden border border-gray-200">
        <div
          id="agent-parcel-map"
          style={mapContainerStyle}
        ></div>
      </div>
    );
  };

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
              {!apiKey ? (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
                  <h4 className="font-semibold mb-2">⚠️ Google Maps API Key Missing</h4>
                  <p className="text-sm mb-2">Please configure REACT_APP_GOOGLE_MAPS_API_KEY in your environment variables.</p>
                  <div className="text-sm space-y-1 mt-2">
                    {selectedParcel.pickupLatitude && selectedParcel.pickupLongitude && (
                      <p>📍 Pickup: ({selectedParcel.pickupLatitude}, {selectedParcel.pickupLongitude})</p>
                    )}
                    {selectedParcel.deliveryLatitude && selectedParcel.deliveryLongitude && (
                      <p>📍 Delivery: ({selectedParcel.deliveryLatitude}, {selectedParcel.deliveryLongitude})</p>
                    )}
                  </div>
                </div>
              ) : mapError ? (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
                  <h4 className="font-semibold mb-2">⚠️ Map Not Available</h4>
                  <p className="text-sm mb-2">Google Maps could not be loaded. Please check your API key configuration.</p>
                  <div className="text-sm space-y-1 mt-2">
                    {selectedParcel.pickupLatitude && selectedParcel.pickupLongitude && (
                      <p>📍 Pickup: ({selectedParcel.pickupLatitude}, {selectedParcel.pickupLongitude})</p>
                    )}
                    {selectedParcel.deliveryLatitude && selectedParcel.deliveryLongitude && (
                      <p>📍 Delivery: ({selectedParcel.deliveryLatitude}, {selectedParcel.deliveryLongitude})</p>
                    )}
                  </div>
                </div>
              ) : !mapsLoaded ? (
                <div className="bg-gray-100 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg">
                  <p className="text-sm">Loading map...</p>
                </div>
              ) : selectedParcel.pickupLatitude && selectedParcel.pickupLongitude ? (
                <MapRenderer
                  selectedParcel={selectedParcel}
                  route={route}
                  mapContainerStyle={mapContainerStyle}
                />
              ) : (
                <div className="bg-gray-100 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg">
                  <p className="text-sm">No location data available for this parcel.</p>
                </div>
              )}
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

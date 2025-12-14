import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getHomePath = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'delivery_agent') return '/agent';
    return '/customer';
  };

  const handleLogoClick = (e) => {
    e.preventDefault();
    navigate(getHomePath());
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link 
              to={getHomePath()} 
              onClick={handleLogoClick}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold text-gray-900">ParcelTrack</span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {user.role === 'admin' && (
                  <>
                    <Link 
                      to="/admin" 
                      className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Dashboard
                    </Link>
                    <Link 
                      to="/admin/users" 
                      className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Users
                    </Link>
                  </>
                )}
                {user.role === 'customer' && (
                  <>
                    <Link 
                      to="/customer" 
                      className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      My Parcels
                    </Link>
                    <Link 
                      to="/book" 
                      className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Book Parcel
                    </Link>
                  </>
                )}
                {user.role === 'delivery_agent' && (
                  <Link 
                    to="/agent" 
                    className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    My Deliveries
                  </Link>
                )}
                <div className="flex items-center space-x-3 pl-4 border-l border-gray-300">
                  <span className="text-sm text-gray-700">
                    {user.firstName} {user.lastName}
                  </span>
                  <button 
                    onClick={handleLogout}
                    className="btn btn-secondary text-sm"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="btn btn-primary text-sm"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

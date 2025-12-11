import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import CustomerDashboard from './pages/CustomerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AgentDashboard from './pages/AgentDashboard';
import BookParcel from './pages/BookParcel';
import TrackParcel from './pages/TrackParcel';
import ParcelDetails from './pages/ParcelDetails';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/customer"
              element={
                <PrivateRoute>
                  <CustomerDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <PrivateRoute requiredRole="admin">
                  <AdminDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/agent"
              element={
                <PrivateRoute requiredRole="delivery_agent">
                  <AgentDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/book"
              element={
                <PrivateRoute requiredRole="customer">
                  <BookParcel />
                </PrivateRoute>
              }
            />
            <Route
              path="/track/:trackingNumber"
              element={<TrackParcel />}
            />
            <Route
              path="/parcel/:id"
              element={
                <PrivateRoute>
                  <ParcelDetails />
                </PrivateRoute>
              }
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;


import React, { useState, useEffect } from 'react';
import { axiosInstance } from '../config/api';

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [parcels, setParcels] = useState([]);
  const [users, setUsers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [metricsRes, parcelsRes, usersRes, agentsRes] = await Promise.all([
        axiosInstance.get('/analytics/dashboard'),
        axiosInstance.get('/parcels'),
        axiosInstance.get('/users'),
        axiosInstance.get('/users/agents'),
      ]);
      setMetrics(metricsRes.data);
      setParcels(parcelsRes.data);
      setUsers(usersRes.data);
      setAgents(agentsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignAgent = async () => {
    if (!selectedParcel || !selectedAgent) return;

    try {
      await axiosInstance.patch(`/parcels/${selectedParcel}/assign`, {
        agentId: selectedAgent,
      });
      alert('Agent assigned successfully!');
      fetchData();
      setSelectedParcel(null);
      setSelectedAgent('');
    } catch (error) {
      alert('Error assigning agent: ' + (error.response?.data?.message || error.message));
    }
  };

  const exportReport = async (format) => {
    try {
      const response = await axiosInstance.get(`/analytics/export/${format}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `parcel-report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const metricCards = [
    {
      title: 'Total Parcels',
      value: metrics?.totalParcels || 0,
      icon: '📦',
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Failed Deliveries',
      value: metrics?.failedDeliveries || 0,
      icon: '❌',
      gradient: 'from-red-500 to-red-600',
    },
    {
      title: 'Total COD Amount',
      value: `$${(metrics?.codAmount || 0).toFixed(2)}`,
      icon: '💰',
      gradient: 'from-green-500 to-green-600',
    },
    {
      title: 'Total Revenue',
      value: `$${(metrics?.totalRevenue || 0).toFixed(2)}`,
      icon: '💵',
      gradient: 'from-purple-500 to-purple-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">Manage parcels, users, and view analytics</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metricCards.map((metric, index) => (
            <div
              key={index}
              className={`bg-gradient-to-br ${metric.gradient} rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium mb-1">{metric.title}</p>
                  <p className="text-3xl font-bold">{metric.value}</p>
                </div>
                <div className="text-4xl opacity-80">{metric.icon}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-6 flex space-x-4">
          <button
            onClick={() => exportReport('csv')}
            className="btn btn-success flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => exportReport('pdf')}
            className="btn btn-danger flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span>Export PDF</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">All Parcels</h2>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Tracking</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Customer</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Agent</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Status</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {parcels.slice(0, 5).map((parcel) => (
                    <tr key={parcel.id} className="hover:bg-gray-50">
                      <td className="px-2 py-3 text-xs font-medium text-gray-900 whitespace-nowrap">
                        {parcel.trackingNumber}
                      </td>
                      <td className="px-2 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {parcel.customer?.firstName} {parcel.customer?.lastName}
                      </td>
                      <td className="px-2 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {parcel.deliveryAgent
                          ? `${parcel.deliveryAgent.firstName} ${parcel.deliveryAgent.lastName}`
                          : <span className="text-gray-400">Not Assigned</span>}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <span className={`badge badge-${parcel.status}`}>
                          {parcel.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        {!parcel.deliveryAgent ? (
                          <button
                            onClick={() => setSelectedParcel(parcel.id)}
                            className="text-primary-600 hover:text-primary-800 text-xs font-medium"
                          >
                            Assign
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedParcel(parcel.id)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            Reassign
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">All Users</h2>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Name</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Email</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Role</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.slice(0, 5).map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-2 py-3 text-xs font-medium text-gray-900 whitespace-nowrap">
                        {user.firstName} {user.lastName}
                      </td>
                      <td className="px-2 py-3 text-xs text-gray-500 whitespace-nowrap">{user.email}</td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <span className={`badge badge-${user.role}`}>
                          {user.role.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {selectedParcel && (
          <div className="mt-6 card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign Agent</h3>
            <div className="space-y-4">
              <div>
                <label className="form-label">Select Agent</label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="form-input"
                >
                  <option value="">Select an agent</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.firstName} {agent.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleAssignAgent}
                  disabled={!selectedAgent}
                  className="btn btn-success disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Assign
                </button>
                <button
                  onClick={() => {
                    setSelectedParcel(null);
                    setSelectedAgent('');
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

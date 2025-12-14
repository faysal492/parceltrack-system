import React, { useState, useEffect } from 'react';
import { axiosInstance } from '../config/api';

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, customer, delivery_agent, admin
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get('/users');
      setUsers(response.data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId, userName, currentStatus) => {
    const newStatus = !currentStatus;
    const action = newStatus ? 'activate' : 'deactivate';
    
    if (!window.confirm(`Are you sure you want to ${action} user "${userName}"? ${newStatus ? 'They will be able to login again.' : 'They will not be able to login until reactivated.'}`)) {
      return;
    }

    try {
      await axiosInstance.patch(`/users/${userId}`, {
        isActive: newStatus,
      });
      alert(`User ${action}d successfully!`);
      fetchUsers();
    } catch (err) {
      console.error('Error updating user status:', err);
      const errorMessage = err.response?.data?.message || 'Failed to update user status. Please try again.';
      alert(errorMessage);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'delivery_agent':
        return 'bg-blue-100 text-blue-800';
      case 'customer':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'delivery_agent':
        return 'Delivery Agent';
      case 'customer':
        return 'Customer';
      default:
        return role;
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesFilter = filter === 'all' || user.role === filter;
    const matchesSearch =
      searchTerm === '' ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Users Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage all users, customers, and delivery agents in the system
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Users
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or phone..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Filter by Role */}
            <div>
              <label htmlFor="filter" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Role
              </label>
              <select
                id="filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Users</option>
                <option value="customer">Customers</option>
                <option value="delivery_agent">Delivery Agents</option>
                <option value="admin">Admins</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">Total Users</div>
              <div className="text-2xl font-bold text-gray-900">{users.length}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-sm text-green-600">Customers</div>
              <div className="text-2xl font-bold text-green-900">
                {users.filter((u) => u.role === 'customer').length}
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-sm text-blue-600">Delivery Agents</div>
              <div className="text-2xl font-bold text-blue-900">
                {users.filter((u) => u.role === 'delivery_agent').length}
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-sm text-red-600">Admins</div>
              <div className="text-2xl font-bold text-red-900">
                {users.filter((u) => u.role === 'admin').length}
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      {searchTerm || filter !== 'all'
                        ? 'No users found matching your criteria.'
                        : 'No users found.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 font-semibold">
                              {user.firstName?.[0]?.toUpperCase() || 'U'}
                              {user.lastName?.[0]?.toUpperCase() || ''}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">ID: {user.id?.substring(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                        {user.phone && (
                          <div className="text-sm text-gray-500">{user.phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(
                            user.role
                          )}`}
                        >
                          {getRoleDisplayName(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            user.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleToggleStatus(user.id, `${user.firstName} ${user.lastName}`, user.isActive)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            user.isActive
                              ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                              : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                          }`}
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersManagement;


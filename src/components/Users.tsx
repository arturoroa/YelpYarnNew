import React, { useEffect, useState } from 'react';
import { Users as UsersIcon, Plus, Pencil, Trash2, Save, X, Search, Wand2 } from 'lucide-react';

interface User {
  id: string;
  username: string;
  password: string;
  email?: string;
  type_of_user: 'SystemUser' | 'RegularUser' | 'TestUser';
  created_by?: string;
  creation_time: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreatingAutomated, setIsCreatingAutomated] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    zipCode: '',
    birthday: ''
  });
  const [editFormData, setEditFormData] = useState({
    username: '',
    password: '',
    email: '',
    type_of_user: 'TestUser' as 'SystemUser' | 'RegularUser' | 'TestUser'
  });
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'info' }>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.type_of_user.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      showToast('Failed to fetch users', 'error');
    }
  };

  const handleCreateUser = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.zipCode || !formData.birthday) {
      showToast('All fields are required', 'error');
      return;
    }

    setIsCreatingAutomated(true);
    showToast('Creating user with bot automation... This may take a few minutes.', 'info');

    try {
      const response = await fetch('/api/users/create-with-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          zipCode: formData.zipCode,
          birthday: formData.birthday,
          headless: false,
          timeout: 30000
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showToast(`User created successfully: ${result.user.email}`, 'success');
        await fetchUsers();
        setShowAddForm(false);
        setFormData({ firstName: '', lastName: '', email: '', password: '', zipCode: '', birthday: '' });
      } else {
        showToast(result.error || 'Failed to create user', 'error');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      showToast(error instanceof Error ? error.message : 'Failed to create user', 'error');
    } finally {
      setIsCreatingAutomated(false);
    }
  };

  const handleUpdateUser = async (id: string) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      await fetchUsers();
      setEditingId(null);
      setEditFormData({ username: '', password: '', email: '', type_of_user: 'TestUser' });
      showToast('User updated successfully', 'success');
    } catch (error) {
      console.error('Error updating user:', error);
      showToast(error instanceof Error ? error.message : 'Failed to update user', 'error');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      await fetchUsers();
      showToast('User deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast(error instanceof Error ? error.message : 'Failed to delete user', 'error');
    }
  };

  const startEdit = (user: User) => {
    setEditingId(user.id);
    setEditFormData({
      username: user.username,
      password: '',
      email: user.email || '',
      type_of_user: user.type_of_user
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData({ username: '', password: '', email: '', type_of_user: 'TestUser' });
  };

  const handleCreateAutomatedUser = async () => {
    setIsCreatingAutomated(true);
    showToast('Starting automated user creation... This may take a few minutes.', 'info');

    try {
      const response = await fetch('/api/users/create-automated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          headless: false,
          timeout: 30000
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showToast(`User created successfully: ${result.user.email}`, 'success');
        await fetchUsers();
      } else {
        showToast(result.error || 'Failed to create automated user', 'error');
      }
    } catch (error) {
      console.error('Automated user creation error:', error);
      showToast('Failed to create automated user', 'error');
    } finally {
      setIsCreatingAutomated(false);
    }
  };

  const getUserTypeColor = (type: string) => {
    switch (type) {
      case 'SystemUser': return 'bg-blue-100 text-blue-800';
      case 'RegularUser': return 'bg-green-100 text-green-800';
      case 'TestUser': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <UsersIcon className="w-6 h-6" />
          User Management
        </h1>
        <p className="text-gray-600 mt-1">Manage system users and test users</p>
      </div>

      <div className="mb-6 flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={handleCreateAutomatedUser}
          disabled={isCreatingAutomated}
          className={`px-4 py-2 ${isCreatingAutomated ? 'bg-purple-400' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded-lg flex items-center gap-2 transition-colors`}
        >
          <Wand2 className={`w-5 h-5 ${isCreatingAutomated ? 'animate-spin' : ''}`} />
          {isCreatingAutomated ? 'Creating...' : 'Create Automated'}
        </button>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add User
        </button>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-2">Create Yelp User with Bot</h2>
            <p className="text-sm text-gray-600 mb-4">Fill in the details and the bot will create this user on Yelp automatically</p>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter last name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP Code *
                </label>
                <input
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter ZIP code (e.g., 10001)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Birthday *
                </label>
                <input
                  type="text"
                  value={formData.birthday}
                  onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="MM/DD/YYYY (e.g., 05/15/1990)"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateUser}
                disabled={isCreatingAutomated}
                className={`flex-1 px-4 py-2 ${isCreatingAutomated ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg transition-colors`}
              >
                {isCreatingAutomated ? 'Creating...' : 'Create User with Bot'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({ firstName: '', lastName: '', email: '', password: '', zipCode: '', birthday: '' });
                }}
                disabled={isCreatingAutomated}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Username
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created At
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingId === user.id ? (
                    <input
                      type="text"
                      value={editFormData.username}
                      onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                      className="px-2 py-1 border border-gray-300 rounded"
                    />
                  ) : (
                    <div className="text-sm font-medium text-gray-900">{user.username}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingId === user.id ? (
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="px-2 py-1 border border-gray-300 rounded"
                    />
                  ) : (
                    <div className="text-sm text-gray-500">{user.email || '-'}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingId === user.id ? (
                    <select
                      value={editFormData.type_of_user}
                      onChange={(e) => setEditFormData({ ...editFormData, type_of_user: e.target.value as any })}
                      className="px-2 py-1 border border-gray-300 rounded"
                    >
                      <option value="SystemUser">System User</option>
                      <option value="RegularUser">Regular User</option>
                      <option value="TestUser">Test User</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getUserTypeColor(user.type_of_user)}`}>
                      {user.type_of_user}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.creation_time).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {editingId === user.id ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleUpdateUser(user.id)}
                        className="text-green-600 hover:text-green-900"
                        title="Save"
                      >
                        <Save className="w-5 h-5" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-gray-600 hover:text-gray-900"
                        title="Cancel"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => startEdit(user)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search' : 'Get started by creating a new user'}
            </p>
          </div>
        )}
      </div>

      <div className="fixed bottom-4 right-4 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg ${
              toast.type === 'success' ? 'bg-green-600' :
              toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
            } text-white`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

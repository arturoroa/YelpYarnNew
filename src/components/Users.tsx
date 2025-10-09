import React, { useEffect, useState } from 'react';
import { Users as UsersIcon, Plus, Pencil, Trash2, Save, X, Search } from 'lucide-react';

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
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    type_of_user: 'TestUser' as 'SystemUser' | 'RegularUser' | 'TestUser',
    created_by: ''
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
    if (!formData.username || !formData.password) {
      showToast('Username and password are required', 'error');
      return;
    }

    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const dataToSend = {
        ...formData,
        created_by: currentUser.username || 'system'
      };

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }

      await fetchUsers();
      setShowAddForm(false);
      setFormData({ username: '', password: '', email: '', type_of_user: 'TestUser', created_by: '' });
      showToast('User created successfully', 'success');
    } catch (error) {
      console.error('Error creating user:', error);
      showToast(error instanceof Error ? error.message : 'Failed to create user', 'error');
    }
  };

  const handleUpdateUser = async (id: string) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      await fetchUsers();
      setEditingId(null);
      setFormData({ username: '', password: '', email: '', type_of_user: 'TestUser', created_by: '' });
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
    setFormData({
      username: user.username,
      password: '',
      email: user.email || '',
      type_of_user: user.type_of_user,
      created_by: user.created_by || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ username: '', password: '', email: '', type: 'user' });
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
            <h2 className="text-xl font-bold mb-4">Add New User</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter username"
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
                  Email
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
                  User Type *
                </label>
                <select
                  value={formData.type_of_user}
                  onChange={(e) => setFormData({ ...formData, type_of_user: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SystemUser">System User (can create users)</option>
                  <option value="RegularUser">Regular User (Users tab hidden)</option>
                  <option value="TestUser">Test User (cannot login)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateUser}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create User
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({ username: '', password: '', email: '', type_of_user: 'TestUser', created_by: '' });
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
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
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
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
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="px-2 py-1 border border-gray-300 rounded"
                    />
                  ) : (
                    <div className="text-sm text-gray-500">{user.email || '-'}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingId === user.id ? (
                    <select
                      value={formData.type_of_user}
                      onChange={(e) => setFormData({ ...formData, type_of_user: e.target.value as any })}
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

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Mail, 
  UserPlus, 
  Shield, 
  Clock, 
  MoreVertical,
  Edit,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useTenant } from '../../../contexts/TenantContext';
import { TenantUser, Permission } from '../../../types';
import Button from '../../ui/Button';

interface UserInviteForm {
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'user' | 'viewer';
  permissions: string[];
  sendInvite: boolean;
}

export const UserProvisioningInterface: React.FC = () => {
  const { 
    currentTenant, 
    tenantUsers, 
    permissions, 
    inviteUser, 
    removeUser, 
    updateUserPermissions 
  } = useTenant();
  
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [inviteForm, setInviteForm] = useState<UserInviteForm>({
    email: '',
    name: '',
    role: 'user',
    permissions: [],
    sendInvite: true
  });

  const filteredUsers = tenantUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.tenantRole === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-green-100 text-green-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (user: TenantUser) => {
    if (user.invitedAt && !user.lastLogin) {
      return <Clock className="w-4 h-4 text-yellow-500" />;
    }
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const handleInviteUser = async () => {
    try {
      const selectedPermissions = permissions.filter(p => 
        inviteForm.permissions.includes(p.id)
      );
      
      await inviteUser(inviteForm.email, inviteForm.role, selectedPermissions);
      
      setShowInviteForm(false);
      setInviteForm({
        email: '',
        name: '',
        role: 'user',
        permissions: [],
        sendInvite: true
      });
    } catch (error) {
      console.error('Failed to invite user:', error);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    try {
      await removeUser(userId);
      setShowDeleteConfirm(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to remove user:', error);
    }
  };

  const getDefaultPermissions = (role: string): string[] => {
    switch (role) {
      case 'owner':
      case 'admin':
        return permissions.map(p => p.id);
      case 'user':
        return permissions.filter(p => p.action !== 'admin').map(p => p.id);
      case 'viewer':
        return permissions.filter(p => p.action === 'read').map(p => p.id);
      default:
        return [];
    }
  };

  React.useEffect(() => {
    setInviteForm(prev => ({
      ...prev,
      permissions: getDefaultPermissions(prev.role)
    }));
  }, [inviteForm.role, permissions]);

  if (!currentTenant) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          No tenant selected. Please select a tenant to manage users.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage users and permissions for {currentTenant.name}</p>
        </div>
        <Button onClick={() => setShowInviteForm(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{tenantUsers.length}</p>
            </div>
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {tenantUsers.filter(u => u.lastLogin).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {tenantUsers.filter(u => u.invitedAt && !u.lastLogin).length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Admins</p>
              <p className="text-2xl font-bold text-purple-600">
                {tenantUsers.filter(u => u.tenantRole === 'admin' || u.tenantRole === 'owner').length}
              </p>
            </div>
            <Shield className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.tenantRole)}`}>
                      {user.tenantRole}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(user)}
                      <span className="text-sm text-gray-900">
                        {user.invitedAt && !user.lastLogin ? 'Pending' : 'Active'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastActiveAt ? user.lastActiveAt.toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => console.log('Edit user:', user.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {user.invitedAt && !user.lastLogin && (
                        <button
                          onClick={() => console.log('Resend invite:', user.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      {user.tenantRole !== 'owner' && (
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteConfirm(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite User Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Invite New User</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="user@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="viewer">Viewer</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions
                </label>
                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {permissions.map((permission) => (
                    <label key={permission.id} className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        checked={inviteForm.permissions.includes(permission.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setInviteForm(prev => ({
                              ...prev,
                              permissions: [...prev.permissions, permission.id]
                            }));
                          } else {
                            setInviteForm(prev => ({
                              ...prev,
                              permissions: prev.permissions.filter(p => p !== permission.id)
                            }));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">{permission.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sendInvite"
                  checked={inviteForm.sendInvite}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, sendInvite: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="sendInvite" className="text-sm text-gray-700">
                  Send invitation email
                </label>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowInviteForm(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleInviteUser}
                disabled={!inviteForm.email}
              >
                <Mail className="w-4 h-4 mr-2" />
                Send Invite
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-medium text-gray-900">Remove User</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove "{selectedUser.name}" from this tenant? They will lose access to all tenant resources.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedUser(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleRemoveUser(selectedUser.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                Remove User
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
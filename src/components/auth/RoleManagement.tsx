import React, { useState, useEffect } from 'react';
import { Permission } from '../../types';
import { Role, permissionService } from '../../services/permissionService';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Users, Shield, Plus, Edit, Trash2, Save, X } from 'lucide-react';

interface RoleManagementProps {
  onRoleChange?: (roles: Role[]) => void;
}

const RoleManagement: React.FC<RoleManagementProps> = ({ onRoleChange }) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRoles();
    loadAvailablePermissions();
  }, []);

  const loadRoles = async () => {
    try {
      const rolesData = await permissionService.getRoles();
      setRoles(rolesData);
      onRoleChange?.(rolesData);
    } catch (error) {
      console.error('Failed to load roles:', error);
      setError('Failed to load roles');
    }
  };

  const loadAvailablePermissions = async () => {
    try {
      const permissions = await permissionService.getAvailablePermissions();
      setAvailablePermissions(permissions);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  };

  const handleCreateRole = () => {
    const newRole: Role = {
      id: '',
      name: '',
      description: '',
      permissions: [],
      isSystemRole: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setEditingRole(newRole);
    setIsCreating(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole({ ...role });
    setIsCreating(false);
  };

  const handleSaveRole = async () => {
    if (!editingRole) return;

    setLoading(true);
    setError('');

    try {
      let result;
      if (isCreating) {
        result = await permissionService.createRole({
          name: editingRole.name,
          description: editingRole.description,
          permissions: editingRole.permissions,
          isSystemRole: editingRole.isSystemRole
        });
      } else {
        result = await permissionService.updateRole(editingRole.id, {
          name: editingRole.name,
          description: editingRole.description,
          permissions: editingRole.permissions
        });
      }

      if (result.success) {
        await loadRoles();
        setEditingRole(null);
        setIsCreating(false);
      } else {
        setError(result.error || 'Failed to save role');
      }
    } catch (error) {
      setError('Network error while saving role');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;

    setLoading(true);
    setError('');

    try {
      const result = await permissionService.deleteRole(roleId);
      if (result.success) {
        await loadRoles();
      } else {
        setError(result.error || 'Failed to delete role');
      }
    } catch (error) {
      setError('Network error while deleting role');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (permission: Permission) => {
    if (!editingRole) return;

    const hasPermission = editingRole.permissions.some(p => 
      p.resource === permission.resource && p.action === permission.action
    );

    let updatedPermissions;
    if (hasPermission) {
      updatedPermissions = editingRole.permissions.filter(p => 
        !(p.resource === permission.resource && p.action === permission.action)
      );
    } else {
      updatedPermissions = [...editingRole.permissions, permission];
    }

    setEditingRole({
      ...editingRole,
      permissions: updatedPermissions
    });
  };

  const groupPermissionsByResource = (permissions: Permission[]) => {
    return permissions.reduce((groups, permission) => {
      if (!groups[permission.resource]) {
        groups[permission.resource] = [];
      }
      groups[permission.resource].push(permission);
      return groups;
    }, {} as Record<string, Permission[]>);
  };

  const permissionGroups = groupPermissionsByResource(availablePermissions);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Role Management</h2>
        </div>
        <Button onClick={handleCreateRole} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Create Role</span>
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Role List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => (
          <Card key={role.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">{role.name}</h3>
                {role.isSystemRole && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    System
                  </span>
                )}
              </div>
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditRole(role)}
                  disabled={loading}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                {!role.isSystemRole && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRole(role.id)}
                    disabled={loading}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-3">{role.description}</p>
            <div className="text-xs text-gray-500">
              {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
            </div>
          </Card>
        ))}
      </div>

      {/* Role Editor */}
      {editingRole && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">
              {isCreating ? 'Create New Role' : 'Edit Role'}
            </h3>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingRole(null);
                  setIsCreating(false);
                }}
                disabled={loading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveRole}
                disabled={loading || !editingRole.name}
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Role'}
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role Name *
                </label>
                <input
                  type="text"
                  value={editingRole.name}
                  onChange={(e) => setEditingRole({
                    ...editingRole,
                    name: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter role name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={editingRole.description}
                  onChange={(e) => setEditingRole({
                    ...editingRole,
                    description: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter role description"
                />
              </div>
            </div>

            {/* Permissions */}
            <div>
              <h4 className="text-md font-semibold mb-4">Permissions</h4>
              <div className="space-y-4">
                {Object.entries(permissionGroups).map(([resource, permissions]) => (
                  <div key={resource} className="border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-3 capitalize">
                      {resource.replace(/_/g, ' ')}
                    </h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {permissions.map((permission) => {
                        const isSelected = editingRole.permissions.some(p => 
                          p.resource === permission.resource && p.action === permission.action
                        );
                        
                        return (
                          <label
                            key={`${permission.resource}-${permission.action}`}
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handlePermissionToggle(permission)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm capitalize">
                              {permission.action}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Permissions Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-2">
                Selected Permissions ({editingRole.permissions.length})
              </h5>
              <div className="flex flex-wrap gap-2">
                {editingRole.permissions.map((permission, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                  >
                    {permission.resource}:{permission.action}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default RoleManagement;
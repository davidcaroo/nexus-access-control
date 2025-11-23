import React, { useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '../integrations/supabase/client';
import { apiClient } from '../services/apiClient';
import { Role, Permission, RoleName } from '../../types';
import { Card, Button, Input, Badge } from '../../components/UIComponents';
import { Plus, Edit, Trash2, X, Shield, Check, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { AppContext } from '../../App';

interface RoleFormData {
  id?: string;
  name: RoleName | string; // Allow string for new roles before casting
  description: string;
  permissions: string[]; // Array of permission actions
}

const RolePermissionManagement: React.FC = () => {
  const { authState, refreshUser } = useContext(AppContext)!;
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingRole, setIsSavingRole] = useState(false);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [roleFormData, setRoleFormData] = useState<RoleFormData>({ name: '', description: '', permissions: [] });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [isDeletingRole, setIsDeletingRole] = useState(false);

  const fetchRolesAndPermissions = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch roles
      const rolesData = await apiClient.get('/roles');
      setRoles(rolesData);

      // Fetch all available permissions
      const permissionsData = await apiClient.get('/roles/permissions');
      setAllPermissions(permissionsData);

    } catch (err: any) {
      console.error("Error fetching roles or permissions:", err.message);
      toast.error(err.message || 'Error al cargar roles y permisos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRolesAndPermissions();
  }, [fetchRolesAndPermissions]);

  const handleOpenRoleModal = (role?: Role) => {
    if (role) {
      setIsEditingRole(true);
      setRoleFormData({
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
      });
    } else {
      setIsEditingRole(false);
      setRoleFormData({ name: '', description: '', permissions: [] });
    }
    setShowRoleModal(true);
  };

  const handleCloseRoleModal = () => {
    setShowRoleModal(false);
    setRoleFormData({ name: '', description: '', permissions: [] });
  };

  const handleRoleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setRoleFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePermissionToggle = (permissionAction: string) => {
    setRoleFormData(prev => {
      const currentPermissions = prev.permissions;
      if (currentPermissions.includes(permissionAction)) {
        return { ...prev, permissions: currentPermissions.filter(p => p !== permissionAction) };
      } else {
        return { ...prev, permissions: [...currentPermissions, permissionAction] };
      }
    });
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRole(true);

    try {
      const payload = {
        id: roleFormData.id,
        name: roleFormData.name,
        description: roleFormData.description,
        permissions: roleFormData.permissions,
      };

      if (isEditingRole && payload.id) {
        const { id, ...updateData } = payload;
        await apiClient.patch(`/roles/${id}`, updateData);
      } else {
        await apiClient.post('/roles', payload);
      }

      toast.success(`Rol ${isEditingRole ? 'actualizado' : 'creado'} correctamente.`);
      await fetchRolesAndPermissions();

      // Solo refrescar el usuario si el rol editado es el del usuario actual
      // Esto evita deslogueos innecesarios
      // await refreshUser(); 

      handleCloseRoleModal();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar el rol.');
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleDeleteRequest = (role: Role) => {
    setRoleToDelete(role);
    setShowDeleteModal(true);
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;
    setIsDeletingRole(true);
    try {
      await apiClient.delete(`/roles/${roleToDelete.id}`);

      toast.success('Rol eliminado correctamente.');
      await fetchRolesAndPermissions();
      // No refrescar el usuario aquí tampoco para evitar deslogueos innecesarios
      // await refreshUser();
      setShowDeleteModal(false);
      setRoleToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar el rol.');
    } finally {
      setIsDeletingRole(false);
    }
  };

  const getRoleBadgeColor = (roleName: RoleName | string) => {
    switch (roleName) {
      case 'superadmin': return 'red';
      case 'admin': return 'yellow';
      case 'hr_manager': return 'green';
      case 'department_head': return 'blue';
      default: return 'blue';
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Cargando roles y permisos...</div>;
  }

  // Solo superadmins pueden ver esta página
  if (authState.user?.role !== 'superadmin') {
    return (
      <div className="text-red-500 bg-red-100 p-4 rounded-lg flex items-center gap-3">
        <Shield size={24} />
        <span>Acceso denegado. Solo los superadministradores pueden gestionar roles y permisos.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Roles y Permisos</h1>
          <p className="text-gray-500">Defina y asigne permisos específicos a cada rol del sistema.</p>
        </div>
        <Button onClick={() => handleOpenRoleModal()}><Plus size={18} className="mr-2" /> Nuevo Rol</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          {roles.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-500 border-b text-sm">
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 font-medium">Descripción</th>
                  <th className="px-4 py-3 font-medium">Permisos Asignados</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y">
                {roles.map(role => (
                  <tr key={role.id}>
                    <td className="px-4 py-3">
                      <Badge color={getRoleBadgeColor(role.name)}>{role.name.toUpperCase()}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{role.description}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.length > 0 ? (
                          role.permissions.map(perm => (
                            <span key={perm} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                              {perm.split(':')[1] || perm}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">Ninguno</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenRoleModal(role)} title="Editar"><Edit size={14} /></Button>
                        {role.name !== 'superadmin' && ( // Prevent deleting superadmin role
                          <Button variant="danger" size="sm" onClick={() => handleDeleteRequest(role)} title="Eliminar"><Trash2 size={14} /></Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Shield size={48} className="mx-auto mb-2" />
              <p>No se encontraron roles. Cree el primer rol para empezar.</p>
            </div>
          )}
        </div>
      </Card>

      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="font-bold text-lg">{isEditingRole ? 'Editar Rol' : 'Crear Nuevo Rol'}</h3>
              <button onClick={handleCloseRoleModal}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveRole} className="p-6 space-y-6">
              <Input
                label="Nombre del Rol"
                name="name"
                value={roleFormData.name}
                onChange={handleRoleFormChange}
                required
                disabled={isEditingRole && (roleFormData.name === 'superadmin' || roleFormData.name === 'admin' || roleFormData.name === 'hr_manager' || roleFormData.name === 'department_head')}
              />
              <Input
                label="Descripción"
                name="description"
                value={roleFormData.description}
                onChange={handleRoleFormChange}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permisos</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {allPermissions.map(permission => (
                    <div key={permission.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`perm-${permission.action}`}
                        checked={roleFormData.permissions.includes(permission.action)}
                        onChange={() => handlePermissionToggle(permission.action)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor={`perm-${permission.action}`} className="ml-2 text-sm text-gray-700 cursor-pointer">
                        {permission.description} <span className="text-gray-400 text-xs">({permission.action})</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={handleCloseRoleModal}>Cancelar</Button>
                <Button type="submit" isLoading={isSavingRole}>{isEditingRole ? 'Guardar Cambios' : 'Crear Rol'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteRole}
        title="Eliminar Rol"
        message={`¿Está seguro de que desea eliminar el rol "${roleToDelete?.name}"? Esta acción no se puede deshacer y fallará si hay usuarios asignados a este rol.`}
        confirmText="Eliminar"
        isConfirming={isDeletingRole}
        confirmButtonVariant="danger"
        icon={<XCircle className="h-6 w-6 text-red-600" />}
        iconBgClass="bg-red-100"
      />
    </div>
  );
};

export default RolePermissionManagement;
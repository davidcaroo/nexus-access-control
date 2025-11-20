import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { User, Role } from '../../types';
import { Card, Button, Badge, Input } from '../../components/UIComponents';
import { Plus, Edit, Trash2, X, UserX, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface ManagedUser extends User {
  email: string;
  is_banned: boolean;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState<ManagedUser | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'employee' as Role,
  });
  const [isSaving, setIsSaving] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('manage-users', {
        method: 'GET',
      });
      if (invokeError) throw invokeError;
      if (data.error) throw new Error(data.error);
      setUsers(data);
    } catch (err: any) {
      const errorMessage = err.message || 'No se pudieron cargar los usuarios. Solo los superadministradores pueden ver esta página.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenModal = (user?: ManagedUser) => {
    if (user) {
      setIsEditing(true);
      setCurrentUser(user);
      setFormData({
        full_name: user.full_name,
        email: user.email,
        password: '',
        role: user.role,
      });
    } else {
      setIsEditing(false);
      setCurrentUser(null);
      setFormData({ full_name: '', email: '', password: '', role: 'employee' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentUser(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const payload: any = isEditing
      ? { id: currentUser!.id, ...formData }
      : formData;
    
    if (isEditing && !payload.password) {
      delete payload.password;
    }

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('manage-users', {
        method: isEditing ? 'PUT' : 'POST',
        body: payload,
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      toast.success(`Usuario ${isEditing ? 'actualizado' : 'creado'} correctamente.`);
      fetchUsers();
      handleCloseModal();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar el usuario.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRequest = (user: ManagedUser) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const { error: invokeError } = await supabase.functions.invoke('manage-users', {
        method: 'DELETE',
        body: { id: userToDelete.id },
      });
      if (invokeError) throw invokeError;
      toast.success('Usuario eliminado correctamente.');
      fetchUsers();
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar el usuario.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleBan = async (user: ManagedUser) => {
    const action = user.is_banned ? 'desbloquear' : 'bloquear';
    if (window.confirm(`¿Está seguro de que desea ${action} a ${user.full_name}?`)) {
        try {
            const { data, error: invokeError } = await supabase.functions.invoke('manage-users', {
                method: 'PUT',
                body: { id: user.id, is_banned: !user.is_banned },
            });
            if (invokeError) throw invokeError;
            if (data?.error) throw new Error(data.error);
            toast.success(`Usuario ${action} correctamente.`);
            fetchUsers();
        } catch (err: any) {
            toast.error(err.message || `Error al ${action} el usuario.`);
        }
    }
  };

  if (loading) return <div>Cargando usuarios...</div>;
  if (error) return <div className="text-red-500 bg-red-100 p-4 rounded-lg">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Usuarios y Roles</h1>
          <p className="text-gray-500">Cree, edite y elimine usuarios del sistema.</p>
        </div>
        <Button onClick={() => handleOpenModal()}><Plus size={18} className="mr-2" /> Nuevo Usuario</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 border-b text-sm">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y">
              {users.map(user => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{user.full_name}</td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge color={user.role === 'superadmin' ? 'red' : user.role === 'admin' ? 'yellow' : 'blue'}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {user.is_banned 
                      ? <Badge color="red">Bloqueado</Badge> 
                      : <Badge color="green">Activo</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenModal(user)} title="Editar"><Edit size={14} /></Button>
                      <Button variant="outline" size="sm" onClick={() => handleToggleBan(user)} title={user.is_banned ? 'Desbloquear' : 'Bloquear'}>
                        {user.is_banned ? <UserCheck size={14} className="text-green-600" /> : <UserX size={14} className="text-red-600" />}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteRequest(user)} title="Eliminar"><Trash2 size={14} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="font-bold text-lg">{isEditing ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h3>
              <button onClick={handleCloseModal}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <Input label="Nombre Completo" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} required />
              <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
              <Input label={isEditing ? "Nueva Contraseña (opcional)" : "Contraseña"} type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.g.value})} required={!isEditing} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})}>
                  <option value="employee">Empleado</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>
              <div className="pt-4 border-t flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
                <Button type="submit" isLoading={isSaving}>{isEditing ? 'Guardar Cambios' : 'Crear Usuario'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar Usuario"
        message={`¿Está seguro de que desea eliminar a ${userToDelete?.full_name}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        isConfirming={isDeleting}
      />
    </div>
  );
};

export default UserManagement;
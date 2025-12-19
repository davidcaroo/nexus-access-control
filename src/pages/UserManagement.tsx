import React, { useState, useEffect, useCallback, useContext } from 'react';
import { apiClient } from '../services/apiClient';
import { ManagedUser, Role, RoleName } from '../../types'; // Importar ManagedUser y RoleName
import { Card, Button, Badge, Input } from '../../components/UIComponents';
import { Plus, Edit, Trash2, X, UserX, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { AppContext } from '../../App'; // Importar AppContext
import { TableSkeleton } from '../../components/LoadingScreen';

const UserManagement: React.FC = () => {
  const { users, isAppDataLoading, fetchUsers } = useContext(AppContext)!; // Obtener users, isAppDataLoading y fetchUsers del contexto

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState<ManagedUser | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role_id: '', // Cambiar de 'role' a 'role_id'
  });
  const [isSaving, setIsSaving] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [userToBan, setUserToBan] = useState<ManagedUser | null>(null);
  const [isBanning, setIsBanning] = useState(false);

  const [availableRoles, setAvailableRoles] = useState<Role[]>([]); // Nuevo estado para roles disponibles
  const [isLoadingRoles, setIsLoadingRoles] = useState(true); // Nuevo estado de carga para roles

  // Función para cargar los roles disponibles
  const fetchAvailableRoles = useCallback(async () => {
    setIsLoadingRoles(true);
    try {
      const data = await apiClient.get('/roles');
      setAvailableRoles(data);
    } catch (err: any) {
      console.error("Error fetching available roles:", err.message);
      toast.error(err.message || 'Error al cargar los roles disponibles.');
      setAvailableRoles([]); // Limpiar roles en caso de error
    } finally {
      setIsLoadingRoles(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailableRoles();
  }, [fetchAvailableRoles]);

  const handleOpenModal = (user?: ManagedUser) => {
    if (user) {
      setIsEditing(true);
      setCurrentUser(user);
      // Obtener el ID del rol basado en su nombre
      const userRole = availableRoles.find(r => r.name === user.role);
      setFormData({
        full_name: user.full_name,
        email: user.email,
        password: '',
        role_id: userRole?.id || '', // Usar role_id con el ID del rol
      });
    } else {
      setIsEditing(false);
      setCurrentUser(null);
      setFormData({
        full_name: '',
        email: '',
        password: '',
        role_id: availableRoles[0]?.id || '' // Usar el ID del primer rol disponible
      });
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
      if (isEditing) {
        const { id, ...updateData } = payload;
        await apiClient.patch(`/users/${id}`, updateData);
      } else {
        await apiClient.post('/users', payload);
      }
      toast.success(`Usuario ${isEditing ? 'actualizado' : 'creado'} correctamente.`);
      await fetchUsers(); // Refrescar la lista de usuarios desde el contexto
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
      await apiClient.delete(`/users/${userToDelete.id}`);
      toast.success('Usuario eliminado correctamente.');
      await fetchUsers(); // Refrescar la lista de usuarios desde el contexto
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar el usuario.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBanRequest = (user: ManagedUser) => {
    setUserToBan(user);
    setIsBanModalOpen(true);
  };

  const confirmBanToggle = async () => {
    if (!userToBan) return;
    setIsBanning(true);
    const action = userToBan.is_banned ? 'desbloquear' : 'bloquear';
    try {
      await apiClient.patch(`/users/${userToBan.id}`, { is_banned: !userToBan.is_banned });
      toast.success(`Usuario ${action === 'bloquear' ? 'bloqueado' : 'desbloqueado'} correctamente.`);
      await fetchUsers(); // Refrescar la lista de usuarios desde el contexto
    } catch (err: any) {
      toast.error(err.message || `Error al ${action} el usuario.`);
    } finally {
      setIsBanning(false);
      setIsBanModalOpen(false);
      setUserToBan(null);
    }
  };

  if (isAppDataLoading || isLoadingRoles) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-96 animate-pulse" />
          </div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse" />
        </div>
        <Card>
          <TableSkeleton rows={8} columns={5} />
        </Card>
      </div>
    );
  }
  // Si no hay usuarios y no está cargando, podría ser un error de permisos o que no hay usuarios.
  // El error ya se maneja en App.tsx y se loguea. Aquí solo mostramos un mensaje si la lista está vacía.
  if (users.length === 0 && !isAppDataLoading) return <div className="text-red-500 bg-red-100 p-4 rounded-lg">No se pudieron cargar los usuarios o no hay usuarios disponibles. Solo los superadministradores pueden ver esta página.</div>;


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
                      <Button variant="outline" size="sm" onClick={() => handleBanRequest(user)} title={user.is_banned ? 'Desbloquear' : 'Bloquear'}>
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
              <Input label="Nombre Completo" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} required />
              <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
              <Input label={isEditing ? "Nueva Contraseña (opcional)" : "Contraseña"} type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required={!isEditing} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={formData.role_id}
                  onChange={e => setFormData({ ...formData, role_id: e.target.value })}
                  required
                >
                  <option value="">Seleccionar rol...</option>
                  {availableRoles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
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

      <ConfirmationModal
        isOpen={isBanModalOpen}
        onClose={() => setIsBanModalOpen(false)}
        onConfirm={confirmBanToggle}
        title={`${userToBan?.is_banned ? 'Desbloquear' : 'Bloquear'} Usuario`}
        message={`¿Está seguro de que desea ${userToBan?.is_banned ? 'desbloquear' : 'bloquear'} a ${userToBan?.full_name}?`}
        confirmText={userToBan?.is_banned ? 'Desbloquear' : 'Bloquear'}
        isConfirming={isBanning}
        confirmButtonVariant={userToBan?.is_banned ? 'primary' : 'danger'}
        icon={userToBan?.is_banned ? <UserCheck className="h-6 w-6 text-green-600" /> : <UserX className="h-6 w-6 text-red-600" />}
        iconBgClass={userToBan?.is_banned ? 'bg-green-100' : 'bg-red-100'}
      />
    </div>
  );
};

export default UserManagement;
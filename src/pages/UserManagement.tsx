import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../integrations/supabase/client';
import { AppContext } from '../../App';
import { User, Role } from '../../types';
import { Card, Button, Badge } from '../../components/UIComponents';
import { Users, Shield, X, Check } from 'lucide-react';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) {
        setError('No se pudieron cargar los usuarios. Es posible que no tengas permisos de superadmin.');
        console.error(error);
      } else {
        // The profile table doesn't have email, so we map what we have
        const mappedUsers: User[] = data.map(profile => ({
          id: profile.id,
          full_name: profile.full_name,
          role: profile.role,
          email: 'No disponible' // Email is in auth.users, not profiles table
        }));
        setUsers(mappedUsers);
      }
      setLoading(false);
    };

    fetchUsers();
  }, []);

  const handleOpenModal = (user: User) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  const handleRoleChange = async (newRole: Role) => {
    if (!selectedUser) return;

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', selectedUser.id);

    if (error) {
      alert('Error al actualizar el rol.');
    } else {
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, role: newRole } : u));
      handleCloseModal();
    }
  };

  if (loading) {
    return <div>Cargando usuarios...</div>;
  }

  if (error) {
    return <div className="text-red-500 bg-red-100 p-4 rounded-lg">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Usuarios y Roles</h1>
        <p className="text-gray-500">Asigne roles a los usuarios para controlar su nivel de acceso al panel de administración. Los cambios se aplican de inmediato.</p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 border-b text-sm">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Rol Actual</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y">
              {users.map(user => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{user.full_name}</td>
                  <td className="px-4 py-3">
                    <Badge color={user.role === 'superadmin' ? 'red' : user.role === 'admin' ? 'yellow' : 'blue'}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => handleOpenModal(user)}>
                      Cambiar Rol
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">Cambiar Rol para {selectedUser.full_name}</h3>
              <button onClick={handleCloseModal}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p>Seleccione el nuevo rol para el usuario. Recuerde que los roles otorgan diferentes niveles de acceso.</p>
              <div className="flex flex-col gap-2">
                {(['employee', 'admin', 'superadmin'] as Role[]).map(role => (
                  <button
                    key={role}
                    onClick={() => handleRoleChange(role)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedUser.role === role ? 'bg-blue-500 text-white border-blue-500' : 'hover:bg-gray-100'}`}
                  >
                    <span className="font-medium capitalize">{role}</span>
                    <p className="text-xs opacity-80">
                      {role === 'employee' && 'No tiene acceso al panel. Rol para personal que solo registra asistencia.'}
                      {role === 'admin' && 'Puede gestionar empleados, ver reportes, registrar asistencia y consultar horas extra.'}
                      {role === 'superadmin' && 'Acceso total al sistema, incluyendo la gestión de usuarios y roles.'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
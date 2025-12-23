import React, { useState, useContext, useRef, useEffect } from 'react';
import { AppContext } from '../../App';
import { apiClient } from '../services/apiClient';
import { Card, Input, Button } from '../../components/UIComponents';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const { authState, setAuthState } = useContext(AppContext)!;
  const user = authState.user;

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url || null);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const [isPasswordResetSending, setIsPasswordResetSending] = useState(false);

  // Biometric devices UI state
  const [devices, setDevices] = useState<any[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<any | null>(null);
  const [isSavingDevice, setIsSavingDevice] = useState(false);
  const [isTestingDeviceId, setIsTestingDeviceId] = useState<number | null>(null);
  const [isSyncingDeviceId, setIsSyncingDeviceId] = useState<number | null>(null);
  const [deviceToDelete, setDeviceToDelete] = useState<any | null>(null);
  const [modalForm, setModalForm] = useState<any>({
    name: '',
    model: 'F16',
    ip: '',
    port: 4370,
    protocol: 'tcp',
    username: '',
    password: '',
    polling_interval: 300,
    enabled: true,
  });

  useEffect(() => {
    if (editingDevice) {
      setModalForm({
        name: editingDevice.name || '',
        model: editingDevice.model || 'F16',
        ip: editingDevice.ip || '',
        port: editingDevice.port || 4370,
        protocol: editingDevice.protocol || 'tcp',
        username: editingDevice.username || '',
        password: editingDevice.password || '',
        polling_interval: editingDevice.polling_interval || 300,
        enabled: editingDevice.enabled !== undefined ? editingDevice.enabled : true,
        id: editingDevice.id,
      });
    } else {
      setModalForm({
        name: '',
        model: 'F16',
        ip: '',
        port: 4370,
        protocol: 'tcp',
        username: '',
        password: '',
        polling_interval: 300,
        enabled: true,
      });
    }
  }, [editingDevice, isDeviceModalOpen]);

  // Configuración del sistema (solo superadmin)
  const [allowMultipleAttendance, setAllowMultipleAttendance] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Cargar configuraciones
  useEffect(() => {
    if (user?.role === 'superadmin') {
      loadSettings();
    }
  }, [user]);

  useEffect(() => {
    // load devices for admins and superadmins
    if (user && (user.role === 'superadmin' || user.role === 'admin')) {
      loadDevices();
    }
  }, [user]);

  const loadSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const data = await apiClient.get('/settings');
      setAllowMultipleAttendance(data.allow_multiple_attendance === true || data.allow_multiple_attendance === 'true');
    } catch (error) {
      toast.error('Error al cargar configuraciones');
      console.error(error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const handleToggleMultipleAttendance = async () => {
    setIsSavingSettings(true);
    try {
      const newValue = !allowMultipleAttendance;
      await apiClient.patch('/settings/allow_multiple_attendance', { value: newValue });
      setAllowMultipleAttendance(newValue);
      toast.success(`${newValue ? 'Permitido' : 'Prohibido'} marcar múltiples entradas/salidas`);
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar configuración');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsProfileSaving(true);

    try {
      const updateData: any = { full_name: fullName };

      // Si hay un avatar guardado en estado local, incluirlo
      if (avatarPreview && avatarPreview.startsWith('data:image')) {
        updateData.avatar_url = avatarPreview;
      }

      const response = await apiClient.patch('/auth/me/profile', updateData);

      if (response) {
        // Actualizar el estado local sin cerrar sesión
        setAuthState({
          isAuthenticated: true,
          user: {
            ...user,
            full_name: fullName,
            avatar_url: avatarPreview || user.avatar_url,
          },
        });

        // Limpiar el preview del avatar después de guardar
        if (avatarPreview && avatarPreview.startsWith('data:image')) {
          setAvatarPreview(null);
        }

        toast.success('Cambios guardados correctamente.');
      }
    } catch (error) {
      toast.error('Error al guardar los cambios.');
      console.error('Profile update error:', error);
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAvatarUploading(true);

    // Leer archivo como base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;

      try {
        // Guardar base64 en estado local para preview (igual que EmployeeManager)
        setAvatarPreview(base64);
        toast.success('Foto cargada. Haz clic en "Guardar Cambios" para confirmar.');
      } catch (err) {
        toast.error('Error al cargar la foto.');
        console.error('Avatar load error:', err);
      } finally {
        setIsAvatarUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePasswordResetRequest = async () => {
    if (!user?.email) {
      toast.error("No se pudo encontrar tu correo electrónico.");
      return;
    }
    setIsPasswordResetSending(true);

    try {
      // Nota: Este endpoint aún necesita ser implementado en el backend
      // Por ahora solo mostrar mensaje informativo
      toast.success('Contacta al administrador para cambiar tu contraseña.');
    } catch (error) {
      toast.error('Error al procesar la solicitud.');
    } finally {
      setIsPasswordResetSending(false);
    }
  };

  // --- Biometric devices actions (UI only; backend endpoints may be stubs)
  const loadDevices = async () => {
    setIsLoadingDevices(true);
    try {
      const data = await apiClient.get('/biometrics/devices');
      setDevices(data || []);
    } catch (err) {
      console.error('Error loading devices', err);
      toast.error('Error al cargar los dispositivos biométricos');
    } finally {
      setIsLoadingDevices(false);
    }
  };

  const openNewDeviceModal = () => {
    setEditingDevice(null);
    setIsDeviceModalOpen(true);
  };

  const openEditDeviceModal = (d: any) => {
    setEditingDevice(d);
    setIsDeviceModalOpen(true);
  };

  const saveDevice = async (device: any) => {
    setIsSavingDevice(true);
    try {
      if (device.id) {
        await apiClient.patch(`/biometrics/devices/${device.id}`, device);
        toast.success('Dispositivo actualizado');
      } else {
        await apiClient.post('/biometrics/devices', device);
        toast.success('Dispositivo creado');
      }
      setIsDeviceModalOpen(false);
      await loadDevices();
    } catch (err: any) {
      console.error('Error saving device', err);
      toast.error(err.message || 'Error al guardar dispositivo');
    } finally {
      setIsSavingDevice(false);
    }
  };

  const testConnection = async (deviceId: number) => {
    setIsTestingDeviceId(deviceId);
    try {
      await apiClient.post(`/biometrics/devices/${deviceId}/test`);
      toast.success('Conexión exitosa');
      await loadDevices();
    } catch (err: any) {
      console.error('Test connection error', err);
      toast.error(err.message || 'Error en la conexión');
    } finally {
      setIsTestingDeviceId(null);
    }
  };

  const forceSync = async (deviceId: number) => {
    setIsSyncingDeviceId(deviceId);
    try {
      await apiClient.post(`/biometrics/devices/${deviceId}/sync`);
      toast.success('Sincronización iniciada');
      await loadDevices();
    } catch (err: any) {
      console.error('Sync error', err);
      toast.error(err.message || 'Error al sincronizar');
    } finally {
      setIsSyncingDeviceId(null);
    }
  };

  const confirmDeleteDevice = (d: any) => {
    setDeviceToDelete(d);
  };

  const deleteDevice = async () => {
    if (!deviceToDelete) return;
    try {
      await apiClient.delete(`/biometrics/devices/${deviceToDelete.id}`);
      toast.success('Dispositivo eliminado');
      setDeviceToDelete(null);
      await loadDevices();
    } catch (err: any) {
      console.error('Delete device error', err);
      toast.error(err.message || 'Error al eliminar');
    }
  };

  if (!user) return <div>Cargando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Ajustes de Cuenta</h1>
        <p className="text-gray-500">Gestiona tu información personal y de seguridad.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card className="text-center">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <img
                src={avatarPreview || user.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(user.full_name)}`}
                alt="Avatar"
                className="w-32 h-32 rounded-full object-cover"
              />
              <input type="file" ref={avatarFileRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
              <Button
                variant="outline"
                size="sm"
                className="absolute bottom-0 right-0 !rounded-full !p-2 h-auto bg-white"
                onClick={() => avatarFileRef.current?.click()}
                isLoading={isAvatarUploading}
                title="Cambiar foto"
              >
                <Upload size={16} />
              </Button>
            </div>
            <h2 className="text-xl font-bold">{user.full_name}</h2>
            <p className="text-gray-500">{user.email}</p>
          </Card>

          <div className="space-y-6 mt-6">
            <Card title="Información de Perfil">
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <Input
                  label="Nombre Completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                <div className="text-center">
                  <Button type="submit" isLoading={isProfileSaving}>Guardar Cambios</Button>
                </div>
              </form>
            </Card>

            <Card title="Cambiar Contraseña">
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Para cambiar tu contraseña, contacta al administrador del sistema.
                </p>
                <div className="text-center">
                  <Button onClick={handlePasswordResetRequest} isLoading={isPasswordResetSending}>
                    Solicitar cambio de contraseña
                  </Button>
                </div>
              </div>
            </Card>
          </div>

        </div>

        <div className="lg:col-span-2 space-y-6">

          {user?.role === 'superadmin' && (
            <Card title="Configuración del Sistema">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                  <div>
                    <h3 className="font-medium text-gray-900">Permitir múltiples entradas/salidas</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Si está deshabilitado: solo 1 entrada y 1 salida diaria por empleado
                    </p>
                    <p className="text-sm text-gray-600">
                      Si está habilitado: empleados pueden marcar múltiples jornadas el mismo día
                    </p>
                  </div>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowMultipleAttendance}
                      onChange={handleToggleMultipleAttendance}
                      disabled={isSavingSettings}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 italic">
                  Estado actual: {allowMultipleAttendance ? '✅ Habilitado' : '❌ Deshabilitado'}
                </p>
              </div>
            </Card>
          )}
          {(user?.role === 'superadmin' || user?.role === 'admin') && (
            <Card title="Biométricos">
              <div className="mb-4 flex items-center gap-2">
                <Button type="button" onClick={openNewDeviceModal}>Agregar dispositivo</Button>
                <Button type="button" variant="outline" onClick={loadDevices} className="ml-auto" isLoading={isLoadingDevices}>Refrescar</Button>
              </div>

              {isLoadingDevices ? (
                <div className="text-center py-6 text-gray-400">Cargando dispositivos...</div>
              ) : devices.length === 0 ? (
                <div className="text-center py-6 text-gray-400">No hay dispositivos configurados.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
                        <th className="px-4 py-2">Nombre</th>
                        <th className="px-4 py-2">Modelo</th>
                        <th className="px-4 py-2">IP:Puerto</th>
                        <th className="px-4 py-2">Estado</th>
                        <th className="px-4 py-2">Últ. Sync</th>
                        <th className="px-4 py-2 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {devices.map((d) => (
                        <tr key={d.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{d.name}</td>
                          <td className="px-4 py-3">{d.model}</td>
                          <td className="px-4 py-3">{d.ip}:{d.port}</td>
                          <td className="px-4 py-3">{d.enabled ? '✅ Activo' : '❌ Inactivo'}</td>
                          <td className="px-4 py-3">{d.last_sync || '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => openEditDeviceModal(d)}>Editar</Button>
                              <Button size="sm" variant="outline" onClick={() => testConnection(d.id)} isLoading={isTestingDeviceId === d.id}>Probar</Button>
                              <Button size="sm" variant="outline" onClick={() => forceSync(d.id)} isLoading={isSyncingDeviceId === d.id}>Sync</Button>
                              <Button size="sm" variant="danger" onClick={() => confirmDeleteDevice(d)}>Eliminar</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
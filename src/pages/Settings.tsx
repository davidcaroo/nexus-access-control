import React, { useState, useContext, useRef, useEffect } from 'react';
import { AppContext } from '../../App';
import { apiClient } from '../services/apiClient';
import { Card, Input, Button } from '../../components/UIComponents';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const { authState, refreshUser } = useContext(AppContext)!;
  const user = authState.user;

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const [isPasswordResetSending, setIsPasswordResetSending] = useState(false);

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
      const response = await apiClient.patch(`/users/${user.id}`, { full_name: fullName });
      if (response) {
        toast.success('Nombre actualizado correctamente.');
        await refreshUser();
      }
    } catch (error) {
      toast.error('Error al actualizar el perfil.');
      console.error('Profile update error:', error);
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsAvatarUploading(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;

      try {
        // Guardar avatar base64 en la BD directamente
        const response = await apiClient.patch('/auth/me/avatar', { avatar_url: base64 });

        if (response) {
          toast.success('Foto de perfil actualizada.');
          await refreshUser();
        }
      } catch (error) {
        toast.error('Error al guardar la nueva foto.');
        console.error('Avatar upload error:', error);
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
      toast.info('Contacta al administrador para cambiar tu contraseña.');
    } catch (error) {
      toast.error('Error al procesar la solicitud.');
    } finally {
      setIsPasswordResetSending(false);
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
                src={user.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(user.full_name)}`}
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
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card title="Información de Perfil">
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <Input
                label="Nombre Completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <div className="text-right">
                <Button type="submit" isLoading={isProfileSaving}>Guardar Cambios</Button>
              </div>
            </form>
          </Card>

          <Card title="Cambiar Contraseña">
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Para cambiar tu contraseña, contacta al administrador del sistema.
              </p>
              <div className="text-right">
                <Button onClick={handlePasswordResetRequest} isLoading={isPasswordResetSending}>
                  Solicitar cambio de contraseña
                </Button>
              </div>
            </div>
          </Card>

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
        </div>
      </div>
    </div>
  );
};

export default Settings;
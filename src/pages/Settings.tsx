import React, { useState, useContext, useRef } from 'react';
import { AppContext } from '../../App';
import { supabase } from '../integrations/supabase/client';
import { Card, Input, Button } from '../../components/UIComponents';
import { User, Mail, Lock, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const { authState, refreshUser } = useContext(AppContext)!;
  const user = authState.user;

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState(user?.email || '');
  const [isEmailSaving, setIsEmailSaving] = useState(false);

  const [password, setPassword] = useState('');
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsProfileSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id);

    if (error) {
      toast.error('Error al actualizar el perfil.');
    } else {
      toast.success('Nombre actualizado correctamente.');
      await refreshUser();
    }
    setIsProfileSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsAvatarUploading(true);
    const filePath = `avatars/${user.id}/${Date.now()}-${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from('employee_photos')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error('Error al subir la imagen.');
      setIsAvatarUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('employee_photos').getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);
    
    if (updateError) {
      toast.error('Error al guardar la nueva foto.');
    } else {
      toast.success('Foto de perfil actualizada.');
      await refreshUser();
    }
    setIsAvatarUploading(false);
  };

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEmailSaving(true);
    const { error } = await supabase.auth.updateUser({ email });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Correo actualizado. Revisa tu bandeja de entrada para confirmar.');
    }
    setIsEmailSaving(false);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setIsPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Contraseña actualizada correctamente.');
      setPassword('');
    }
    setIsPasswordSaving(false);
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
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <Input
                label="Nueva Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Dejar en blanco para no cambiar"
                required
              />
              <div className="text-right">
                <Button type="submit" isLoading={isPasswordSaving}>Actualizar Contraseña</Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
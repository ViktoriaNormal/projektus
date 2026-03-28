import { useState, useEffect, useRef } from 'react';
import {
  User,
  Key,
  Save,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Check,
  X,
  ShieldCheck,
  Info,
  Briefcase,
  Shield,
  FolderKanban,
  Palmtree,
  Thermometer,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getUser,
  updateUser,
  uploadAvatar,
  getUserSystemRoles,
  getUserProjectRoles,
  type SystemRoleResponse,
  type ProjectRoleResponse,
  type UserProfileResponse,
} from '../api/users';
import { getPermissionsCatalog, type PermissionDescriptor } from '../api/admin';
import { changePassword, getPasswordPolicy, type PasswordPolicy } from '../api/auth';
import { ApiError } from '../api/client';
import { UserAvatar } from '../components/UserAvatar';

export default function Profile() {
  const { user: authUser, setAuth } = useAuth();

  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [onVacation, setOnVacation] = useState(false);
  const [isSick, setIsSick] = useState(false);
  const [altContactChannel, setAltContactChannel] = useState('');
  const [altContactInfo, setAltContactInfo] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password policy
  const [policy, setPolicy] = useState<PasswordPolicy | null>(null);

  // Roles
  const [systemRoles, setSystemRoles] = useState<SystemRoleResponse[]>([]);
  const [projectRoles, setProjectRoles] = useState<ProjectRoleResponse[]>([]);
  const [permCatalog, setPermCatalog] = useState<PermissionDescriptor[]>([]);

  // Avatar
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authUser?.id) {
      setLoading(false);
      return;
    }

    Promise.all([
      getUser(authUser.id),
      getPasswordPolicy().catch(() => null),
      getUserSystemRoles(authUser.id).catch(() => [] as SystemRoleResponse[]),
      getUserProjectRoles(authUser.id).catch(() => [] as ProjectRoleResponse[]),
      getPermissionsCatalog().catch(() => [] as PermissionDescriptor[]),
    ]).then(([userData, policyData, sysRoles, projRoles, perms]) => {
      setProfile(userData);
      setFullName(userData.fullName);
      setEmail(userData.email);
      setOnVacation(userData.onVacation ?? false);
      setIsSick(userData.isSick ?? false);
      setAltContactChannel(userData.alternativeContactChannel ?? '');
      setAltContactInfo(userData.alternativeContactInfo ?? '');
      setPolicy(policyData);
      setSystemRoles(sysRoles);
      setProjectRoles(projRoles);
      setPermCatalog(perms);
    }).catch(() => {
      setFullName(authUser.fullName || '');
      setEmail(authUser.email || '');
    }).finally(() => setLoading(false));
  }, [authUser]);

  const passwordChecks = policy
    ? [
        { label: `Минимум ${policy.minLength} символов`, passed: newPassword.length >= policy.minLength },
        ...(policy.requireDigits ? [{ label: 'Содержит цифру', passed: /\d/.test(newPassword) }] : []),
        ...(policy.requireLowercase ? [{ label: 'Содержит строчную букву', passed: /[a-z]/.test(newPassword) }] : []),
        ...(policy.requireUppercase ? [{ label: 'Содержит заглавную букву', passed: /[A-Z]/.test(newPassword) }] : []),
        ...(policy.requireSpecial ? [{ label: 'Содержит спецсимвол (!@#$%^&*...)', passed: /[^a-zA-Z0-9]/.test(newPassword) }] : []),
      ]
    : [];

  const allChecksPassed = passwordChecks.every((c) => c.passed);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleProfileSave = async () => {
    if (!authUser) return;
    setProfileMsg(null);

    if (!fullName.trim() || !email.trim()) {
      setProfileMsg({ type: 'error', text: 'Заполните все обязательные поля' });
      return;
    }

    setProfileSaving(true);
    try {
      const updated = await updateUser(authUser.id, {
        fullName: fullName.trim(),
        email: email.trim(),
        onVacation: onVacation,
        isSick: isSick,
        alternativeContactChannel: altContactChannel.trim() || null,
        alternativeContactInfo: altContactInfo.trim() || null,
      });
      setProfile(updated);
      const accessToken = localStorage.getItem('access_token') || '';
      const refreshToken = localStorage.getItem('refresh_token') || '';
      setAuth({ accessToken, refreshToken, user: updated, roles: [] });
      setProfileMsg({ type: 'success', text: 'Профиль успешно обновлён' });
    } catch (err) {
      if (err instanceof ApiError) {
        setProfileMsg({ type: 'error', text: err.message });
      } else {
        setProfileMsg({ type: 'error', text: 'Не удалось сохранить изменения' });
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordMsg(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Заполните все поля' });
      return;
    }

    if (policy && !allChecksPassed) {
      setPasswordMsg({ type: 'error', text: 'Новый пароль не соответствует требованиям' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Пароли не совпадают' });
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword(oldPassword, newPassword);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg({ type: 'success', text: 'Пароль успешно изменён' });
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.code) {
          case 'INVALID_CREDENTIALS':
            setPasswordMsg({ type: 'error', text: 'Неверный текущий пароль' });
            break;
          case 'PASSWORD_POLICY_VIOLATION':
            setPasswordMsg({ type: 'error', text: 'Новый пароль не соответствует требованиям парольной политики' });
            break;
          case 'PASSWORD_REUSE':
            setPasswordMsg({ type: 'error', text: 'Нельзя использовать один из последних паролей' });
            break;
          default:
            setPasswordMsg({ type: 'error', text: err.message });
        }
      } else {
        setPasswordMsg({ type: 'error', text: 'Не удалось изменить пароль' });
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser) return;

    setAvatarUploading(true);
    try {
      const updated = await uploadAvatar(authUser.id, file);
      setProfile(updated);
      const accessToken = localStorage.getItem('access_token') || '';
      const refreshToken = localStorage.getItem('refresh_token') || '';
      setAuth({ accessToken, refreshToken, user: updated, roles: [] });
    } catch {
      setProfileMsg({ type: 'error', text: 'Не удалось загрузить аватар' });
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  const displayUser = profile || authUser;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Мой профиль</h1>
        <p className="text-slate-600 mt-1">Управление личной информацией</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal info */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <User size={20} />
              Личная информация
            </h2>
            <div className="space-y-4">
              {profileMsg && (
                <div
                  className={`flex items-start gap-3 p-4 rounded-xl text-sm ${
                    profileMsg.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}
                >
                  {profileMsg.type === 'success' ? (
                    <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  )}
                  <span>{profileMsg.text}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Имя пользователя <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={displayUser?.username || ''}
                  disabled
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  ФИО <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status checkboxes */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Info size={16} />
                  Статус доступности
                </p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onVacation}
                    onChange={(e) => setOnVacation(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Palmtree size={18} className="text-green-600" />
                  <span className="text-sm">В отпуске</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSick}
                    onChange={(e) => setIsSick(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Thermometer size={18} className="text-red-500" />
                  <span className="text-sm">Болею</span>
                </label>
              </div>

              {/* Alternative contact */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <MessageCircle size={16} />
                  Альтернативный канал связи
                </p>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Название канала</label>
                  <input
                    type="text"
                    value={altContactChannel}
                    onChange={(e) => setAltContactChannel(e.target.value)}
                    placeholder="Например: Telegram, WhatsApp, Slack..."
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Контакт</label>
                  <input
                    type="text"
                    value={altContactInfo}
                    onChange={(e) => setAltContactInfo(e.target.value)}
                    placeholder="Ник, номер телефона или ссылка..."
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                onClick={handleProfileSave}
                disabled={profileSaving}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {profileSaving ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Save size={20} />
                )}
                {profileSaving ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </div>
          </div>

          {/* Change password */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Key size={20} />
              Изменить пароль
            </h2>
            <div className="space-y-4">
              {passwordMsg && (
                <div
                  className={`flex items-start gap-3 p-4 rounded-xl text-sm ${
                    passwordMsg.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}
                >
                  {passwordMsg.type === 'success' ? (
                    <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  )}
                  <span>{passwordMsg.text}</span>
                </div>
              )}

              {/* Password policy — always visible */}
              {policy && newPassword.length === 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-2 text-sm text-blue-800">
                    <Info size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Требования к паролю:</p>
                      <ul className="space-y-0.5 text-blue-700">
                        <li>- Минимум {policy.minLength} символов</li>
                        {policy.requireDigits && <li>- Минимум 1 цифра</li>}
                        {policy.requireLowercase && <li>- Минимум 1 строчная буква (a-z)</li>}
                        {policy.requireUppercase && <li>- Минимум 1 заглавная буква (A-Z)</li>}
                        {policy.requireSpecial && <li>- Минимум 1 спецсимвол (!@#$%^&*...)</li>}
                      </ul>
                      {policy.notes && <p className="mt-2 text-xs text-blue-600">{policy.notes}</p>}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Текущий пароль <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Введите текущий пароль"
                    className="w-full px-4 py-2 pr-12 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showOldPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Новый пароль <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Введите новый пароль"
                    className="w-full px-4 py-2 pr-12 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Подтвердите новый пароль <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Повторите новый пароль"
                    className="w-full px-4 py-2 pr-12 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-sm text-red-500 mt-1.5 flex items-center gap-1">
                    <X size={14} />
                    Пароли не совпадают
                  </p>
                )}
                {passwordsMatch && (
                  <p className="text-sm text-green-600 mt-1.5 flex items-center gap-1">
                    <Check size={14} />
                    Пароли совпадают
                  </p>
                )}
              </div>

              {/* Password policy — interactive checks while typing */}
              {policy && newPassword.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <ShieldCheck size={16} />
                    Требования к паролю
                  </div>
                  <ul className="space-y-1.5">
                    {passwordChecks.map((check, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        {check.passed ? (
                          <Check size={14} className="text-green-600 shrink-0" />
                        ) : (
                          <X size={14} className="text-red-400 shrink-0" />
                        )}
                        <span className={check.passed ? 'text-green-700' : 'text-slate-600'}>
                          {check.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={handlePasswordChange}
                disabled={passwordSaving}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {passwordSaving ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Key size={20} />
                )}
                {passwordSaving ? 'Изменение...' : 'Изменить пароль'}
              </button>
            </div>
          </div>
        </div>

        {/* Right column — avatar + roles */}
        <div className="space-y-6">
          {/* Avatar */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
            <h2 className="text-lg font-bold mb-4">Аватар</h2>
            <div className="flex flex-col items-center">
              {displayUser && (
                <UserAvatar
                  user={{ fullName: displayUser.fullName || '', avatarUrl: displayUser.avatarUrl }}
                  size="xl"
                  className="mb-4 ring-2 ring-slate-200"
                />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <div className="space-y-2 w-full">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 rounded-lg transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {avatarUploading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Upload size={16} />
                  )}
                  {avatarUploading ? 'Загрузка...' : 'Загрузить фото'}
                </button>
                <p className="text-xs text-slate-400 text-center">JPG, JPEG, PNG, WEBP</p>
              </div>
            </div>
          </div>

          {/* Position & Roles */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Briefcase size={18} />
              Должность и роли
            </h2>
            <div className="space-y-4">
              {/* Position */}
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Должность</span>
                <p className="mt-1 font-medium text-slate-800">
                  {profile?.position || <span className="text-slate-400 italic">Не указана</span>}
                </p>
              </div>

              <hr className="border-slate-200" />

              {/* System roles */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Shield size={14} className="text-purple-600" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Системная роль</span>
                </div>
                {systemRoles.length > 0 ? (
                  <div className="space-y-2">
                    {systemRoles.map((role) => (
                      <div key={role.id} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <p className="font-medium text-purple-900 text-sm">{role.name}</p>
                        {role.description && (
                          <p className="text-xs text-purple-700 mt-0.5">{role.description}</p>
                        )}
                        {role.permissions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {role.permissions.map((perm) => (
                              <span
                                key={perm}
                                className="inline-block px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-md"
                              >
                                {permCatalog.find((p) => p.key === perm)?.description || perm}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">Нет назначенных системных ролей</p>
                )}
              </div>

              {/* Project roles */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <FolderKanban size={14} className="text-blue-600" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Проектные роли</span>
                </div>
                {projectRoles.length > 0 ? (
                  <div className="space-y-2">
                    {projectRoles.map((pr) => (
                      <div key={pr.projectId} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="font-medium text-blue-900 text-sm">{pr.projectName}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {pr.roles.map((role) => (
                            <span
                              key={role}
                              className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-md font-medium"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                        {pr.permissions.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {pr.permissions.map((perm) => (
                              <span
                                key={perm}
                                className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-200"
                              >
                                {perm}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">Нет проектных ролей</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

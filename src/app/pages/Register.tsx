import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  UserPlus,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Check,
  X,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { register, getPasswordPolicy, type PasswordPolicy } from '../api/auth';
import { ApiError } from '../api/client';

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [policy, setPolicy] = useState<PasswordPolicy | null>(null);
  const [policyLoading, setPolicyLoading] = useState(true);

  useEffect(() => {
    getPasswordPolicy()
      .then(setPolicy)
      .catch(() => {})
      .finally(() => setPolicyLoading(false));
  }, []);

  const passwordChecks = policy
    ? [
        {
          label: `Минимум ${policy.minLength} символов`,
          passed: form.password.length >= policy.minLength,
        },
        ...(policy.requireDigits
          ? [{ label: 'Содержит цифру', passed: /\d/.test(form.password) }]
          : []),
        ...(policy.requireLowercase
          ? [{ label: 'Содержит строчную букву', passed: /[a-z]/.test(form.password) }]
          : []),
        ...(policy.requireUppercase
          ? [{ label: 'Содержит заглавную букву', passed: /[A-Z]/.test(form.password) }]
          : []),
        ...(policy.requireSpecial
          ? [{ label: 'Содержит спецсимвол (!@#$%^&*...)', passed: /[^a-zA-Z0-9]/.test(form.password) }]
          : []),
      ]
    : [];

  const allChecksPassed = passwordChecks.every((c) => c.passed);
  const passwordsMatch = form.password === form.confirmPassword && form.confirmPassword.length > 0;

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.username.trim() || !form.email.trim() || !form.full_name.trim() || !form.password) {
      setError('Заполните все поля');
      return;
    }

    if (policy && !allChecksPassed) {
      setError('Пароль не соответствует требованиям парольной политики');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);
    try {
      await register({
        username: form.username.trim(),
        email: form.email.trim(),
        full_name: form.full_name.trim(),
        password: form.password,
      });
      navigate('/login', {
        replace: true,
        state: { registered: true },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.code) {
          case 'VALIDATION_ERROR':
            setError(err.message);
            break;
          case 'PASSWORD_POLICY_VIOLATION':
            setError('Пароль не соответствует требованиям парольной политики');
            break;
          default:
            setError(err.message);
        }
      } else {
        setError('Не удалось подключиться к серверу');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">P</span>
            </div>
            <span className="font-bold text-3xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Projektus
            </span>
          </div>
          <p className="text-slate-600">Создайте новый аккаунт</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">ФИО <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => updateField('full_name', e.target.value)}
                placeholder="Иван Иванов"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Имя пользователя <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => updateField('username', e.target.value)}
                placeholder="ivan"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="ivan@example.com"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Пароль <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="Введите пароль"
                  className="w-full px-4 py-2.5 pr-12 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Подтверждение пароля <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  placeholder="Повторите пароль"
                  className="w-full px-4 py-2.5 pr-12 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
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
              {form.confirmPassword && !passwordsMatch && (
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

            {/* Password Policy */}
            {!policyLoading && policy && form.password.length > 0 && (
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

            {!policyLoading && policy && form.password.length === 0 && (
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-medium flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <UserPlus size={20} />
              )}
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium transition-colors">
              Войти
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
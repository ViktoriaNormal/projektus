import { useState, useEffect } from 'react';
import { Key, Save, Info, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getAdminPasswordPolicy, updateAdminPasswordPolicy } from '../../api/admin';
import { ApiError } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminPasswordPolicy() {
  const { hasFullPermission } = useAuth();
  const canEdit = hasFullPermission('system.password_policy.manage');
  const [policy, setPolicy] = useState({
    minLength: 8,
    requireDigits: true,
    requireLowercase: true,
    requireUppercase: true,
    requireSpecial: false,
    notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    getAdminPasswordPolicy()
      .then((data) => {
        setPolicy({
          minLength: data.minLength,
          requireDigits: data.requireDigits,
          requireLowercase: data.requireLowercase,
          requireUppercase: data.requireUppercase,
          requireSpecial: data.requireSpecial,
          notes: data.notes || '',
        });
      })
      .catch((err) => {
        if (err instanceof ApiError && err.code === 'NOT_FOUND') {
          // Policy not configured yet — use defaults
        } else {
          setMsg({ type: 'error', text: 'Не удалось загрузить парольную политику' });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setMsg(null);
    setSaving(true);
    try {
      const updated = await updateAdminPasswordPolicy({
        minLength: policy.minLength,
        requireDigits: policy.requireDigits,
        requireLowercase: policy.requireLowercase,
        requireUppercase: policy.requireUppercase,
        requireSpecial: policy.requireSpecial,
        notes: policy.notes || null,
      });
      setPolicy({
        minLength: updated.minLength,
        requireDigits: updated.requireDigits,
        requireLowercase: updated.requireLowercase,
        requireUppercase: updated.requireUppercase,
        requireSpecial: updated.requireSpecial,
        notes: updated.notes || '',
      });
      setMsg({ type: 'success', text: 'Парольная политика успешно обновлена' });
    } catch (err) {
      if (err instanceof ApiError) {
        setMsg({ type: 'error', text: err.message });
      } else {
        setMsg({ type: 'error', text: 'Не удалось сохранить изменения' });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Парольная политика</h1>
        <p className="text-slate-600 mt-1">
          Настройка требований к паролям пользователей
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-lg">
            <Key className="text-white" size={24} />
          </div>
          <h2 className="text-xl font-bold">Требования к паролю</h2>
        </div>

        <div className="space-y-6">
          {msg && (
            <div
              className={`flex items-start gap-3 p-4 rounded-xl text-sm ${
                msg.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {msg.type === 'success' ? (
                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
              )}
              <span>{msg.text}</span>
            </div>
          )}


          {/* Min Length */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Минимальная длина пароля
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="6"
                max="20"
                value={policy.minLength}
                onChange={(e) =>
                  setPolicy({ ...policy, minLength: parseInt(e.target.value) })
                }
                disabled={!canEdit}
                className="flex-1"
              />
              <span className="w-12 text-center px-3 py-2 bg-slate-100 rounded-lg font-semibold">
                {policy.minLength}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Пароль должен содержать минимум {policy.minLength} символов
            </p>
          </div>

          {/* Requirements */}
          <div className="space-y-3">
            <label className="block text-sm font-medium mb-2">
              Обязательные требования
            </label>

            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={policy.requireDigits}
                onChange={(e) =>
                  setPolicy({ ...policy, requireDigits: e.target.checked })
                }
                disabled={!canEdit}
                className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex-1">
                <p className="font-medium">Цифры (0-9)</p>
                <p className="text-sm text-slate-500">
                  Пароль должен содержать хотя бы одну цифру
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={policy.requireLowercase}
                onChange={(e) =>
                  setPolicy({ ...policy, requireLowercase: e.target.checked })
                }
                disabled={!canEdit}
                className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex-1">
                <p className="font-medium">Строчные буквы (a-z)</p>
                <p className="text-sm text-slate-500">
                  Пароль должен содержать строчные буквы
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={policy.requireUppercase}
                onChange={(e) =>
                  setPolicy({ ...policy, requireUppercase: e.target.checked })
                }
                disabled={!canEdit}
                className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex-1">
                <p className="font-medium">Заглавные буквы (A-Z)</p>
                <p className="text-sm text-slate-500">
                  Пароль должен содержать заглавные буквы
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={policy.requireSpecial}
                onChange={(e) =>
                  setPolicy({ ...policy, requireSpecial: e.target.checked })
                }
                disabled={!canEdit}
                className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex-1">
                <p className="font-medium">Специальные символы (!@#$%^&*)</p>
                <p className="text-sm text-slate-500">
                  Пароль должен содержать спецсимволы
                </p>
              </div>
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Дополнительные примечания
            </label>
            <textarea
              value={policy.notes}
              onChange={(e) => setPolicy({ ...policy, notes: e.target.value })}
              disabled={!canEdit}
              className={`w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${!canEdit ? "bg-slate-50 text-slate-500 cursor-not-allowed" : ""}`}
              rows={3}
              placeholder="Дополнительные требования или пояснения..."
            />
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <Info className="text-blue-600 shrink-0" size={20} />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Важная информация</p>
              <p>
                Изменение парольной политики не влияет на существующие пароли
                пользователей. Новые требования будут применяться только при
                создании новых учётных записей или изменении паролей.
              </p>
              <p>
                Помимо настроек, представленных на странице редактирования парольной политики, в системе предусмотрено 3 дополнительных механизма защиты от несанкционированного доступа: <b>блокировка учетной записи пользователя на 15 минут после 5 неудачных попыток входа с его логина за последние 15 минут</b>, <b>блокировка IP-адреса на час после 20 неудачных попыток входа с него за последний час</b>, <b>запрет на повторное использование ранее задаваемых паролей при смене текущего пароля</b>.
              </p>
            </div>
          </div>

          {/* Save Button */}
          {canEdit && (
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Save size={20} />
              )}
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

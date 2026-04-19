import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Mail,
  Briefcase,
  Palmtree,
  Thermometer,
  MessageCircle,
  Copy,
  Check,
} from 'lucide-react';
import { PageSpinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { UserAvatar } from '../components/UserAvatar';
import { searchUsers, type UserProfileResponse } from '../api/users';
import { useAuth } from '../contexts/AuthContext';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="text-slate-400 hover:text-blue-600 transition-colors shrink-0 p-1 rounded hover:bg-blue-50"
      title="Скопировать"
    >
      {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
    </button>
  );
}

export default function Team() {
  const { user: authUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserProfileResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalLoaded, setTotalLoaded] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const loadUsers = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const result = await searchUsers(query, 100, 0);
      const list = Array.isArray(result) ? result : [];
      setUsers(list);
      if (!query && !totalLoaded) {
        setTotalCount(list.length);
        setTotalLoaded(true);
      }
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [totalLoaded]);

  useEffect(() => {
    loadUsers('');
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Коллеги</h1>
        <p className="text-slate-600 mt-1">Поиск коллег по организации</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl p-4 shadow-md border border-slate-100">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Поиск по имени, должности, email, имени пользователя или контакту..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-3 rounded-lg">
              <Briefcase className="text-white" size={24} />
            </div>
            <div>
              <p className="text-slate-600 text-sm">Всего сотрудников</p>
              <p className="text-2xl font-bold">{totalCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 p-3 rounded-lg">
              <Search className="text-white" size={24} />
            </div>
            <div>
              <p className="text-slate-600 text-sm">Найдено</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && <PageSpinner />}

      {/* Team Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => {
            const isMe = authUser?.id === user.id;
            return (
            <div
              key={user.id}
              className={`bg-white rounded-xl p-6 shadow-md border ${
                isMe
                  ? 'border-blue-300 ring-1 ring-blue-200'
                  : 'border-slate-100'
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <UserAvatar
                  user={{ fullName: user.fullName, avatarUrl: user.avatarUrl }}
                  size="xl"
                  className="mb-4"
                />

                {/* Status badges */}
                {(user.onVacation || user.isSick) && (
                  <div className="flex flex-wrap gap-1.5 mb-2 justify-center">
                    {user.onVacation && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 text-xs font-medium rounded-full">
                        <Palmtree size={12} />
                        В отпуске
                      </span>
                    )}
                    {user.isSick && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-full">
                        <Thermometer size={12} />
                        Болею
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-1.5 mb-1">
                  <h3 className="font-bold text-lg">{user.fullName}</h3>
                  <CopyButton text={user.fullName} />
                </div>

                {user.position && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 text-sm font-semibold rounded-full mb-3">
                    <Briefcase size={14} />
                    {user.position}
                    <CopyButton text={user.position} />
                  </div>
                )}

                <div className="w-full space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2 justify-center">
                    <span className="text-slate-500">@{user.username}</span>
                    <CopyButton text={`@${user.username}`} />
                  </div>

                  <div className="flex items-center gap-2 justify-center">
                    <Mail size={14} className="text-slate-400" />
                    <a
                      href={`mailto:${user.email}`}
                      className="hover:text-blue-600 hover:underline truncate"
                    >
                      {user.email}
                    </a>
                    <CopyButton text={user.email} />
                  </div>

                  {user.altContactChannel && user.altContactInfo && (
                    <div className="flex items-center gap-2 justify-center">
                      <MessageCircle size={14} className="text-slate-400" />
                      <span>
                        <span className="text-slate-500">{user.altContactChannel}:</span>{' '}
                        <span className="font-medium text-slate-700">{user.altContactInfo}</span>
                      </span>
                      <CopyButton text={user.altContactInfo} />
                    </div>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {!loading && users.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState
            icon={<Search size={48} />}
            title="Коллеги не найдены"
            description="Попробуйте изменить критерии поиска"
          />
        </div>
      )}
    </div>
  );
}

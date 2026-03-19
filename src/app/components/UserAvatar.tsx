interface UserAvatarProps {
  user: {
    fullName: string;
    avatarUrl?: string | null;
  };
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function UserAvatar({ user, size = 'md', className = '' }: UserAvatarProps) {
  // Получаем инициалы: первую букву фамилии + первую букву имени
  const getInitials = (fullName: string) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      // Фамилия Имя Отчество - берём первую букву фамилии и первую букву имени
      return (parts[0][0] + parts[1][0]).toUpperCase();
    } else if (parts.length === 1) {
      // Если только одно слово, берём первые две буквы
      return parts[0].substring(0, 2).toUpperCase();
    }
    return 'ПП'; // Placeholder
  };

  // Генерируем цвет фона на основе имени
  const getBackgroundColor = (fullName: string = '') => {
    const colors = [
      'bg-gradient-to-br from-blue-500 to-blue-600',
      'bg-gradient-to-br from-purple-500 to-purple-600',
      'bg-gradient-to-br from-pink-500 to-pink-600',
      'bg-gradient-to-br from-indigo-500 to-indigo-600',
      'bg-gradient-to-br from-cyan-500 to-cyan-600',
      'bg-gradient-to-br from-teal-500 to-teal-600',
      'bg-gradient-to-br from-emerald-500 to-emerald-600',
      'bg-gradient-to-br from-orange-500 to-orange-600',
      'bg-gradient-to-br from-rose-500 to-rose-600',
      'bg-gradient-to-br from-violet-500 to-violet-600',
    ];
    
    // Простой хэш для выбора цвета
    let hash = 0;
    for (let i = 0; i < fullName.length; i++) {
      hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-32 h-32 text-3xl',
  };

  const initials = getInitials(user.fullName);
  const bgColor = getBackgroundColor(user.fullName);

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.fullName}
        className={`${sizeClasses[size]} rounded-full object-cover ring-1 ring-slate-200 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-semibold ${bgColor} ${className}`}
    >
      {initials}
    </div>
  );
}

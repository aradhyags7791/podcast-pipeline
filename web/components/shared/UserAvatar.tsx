interface UserAvatarProps {
  name: string
  size?: 'sm' | 'md'
}

export function UserAvatar({ name, size = 'md' }: UserAvatarProps) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
  return (
    <div className={`${sz} rounded-full bg-amber-500/15 border border-amber-500/20 flex items-center justify-center font-semibold text-amber-400 shrink-0`}>
      {initials}
    </div>
  )
}

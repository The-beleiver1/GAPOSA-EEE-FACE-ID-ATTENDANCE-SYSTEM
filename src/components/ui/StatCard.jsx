export function StatCard({ label, value, sub, accent = 'blue', icon: Icon, onClick }) {
  const accents = {
    blue:   'stat-accent-green',
    green:  'stat-accent-green',
    red:    'stat-accent-red',
    purple: 'stat-accent-green',
  }
  const iconBg = {
    blue:   'bg-brand-50 text-brand-600',
    green:  'bg-brand-50 text-brand-600',
    red:    'bg-red-50 text-red-600',
    purple: 'bg-brand-50 text-brand-600',
  }
  return (
    <div
      className={`card ${accents[accent]} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg[accent]}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  )
}

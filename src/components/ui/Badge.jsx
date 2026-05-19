export function Badge({ status }) {
  const map = {
    present:  'badge-present',
    absent:   'badge-absent',
    late:     'badge-late',
    pending:  'badge-pending',
    approved: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700',
    rejected: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700',
    active:   'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700',
  }
  return (
    <span className={map[status] || 'badge-pending'}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  )
}

export function StatusDot({ status }) {
  const color = {
    present: 'bg-green-500',
    absent:  'bg-red-500',
    late:    'bg-yellow-500',
  }[status] || 'bg-gray-400'
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
}

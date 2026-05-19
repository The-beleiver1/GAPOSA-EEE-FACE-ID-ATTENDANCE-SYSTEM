export function Spinner({ size = 20, color = 'white' }) {
  const style = {
    width: size, height: size,
    border: `2px solid ${color === 'white' ? 'rgba(255,255,255,.3)' : 'rgba(29,78,216,.2)'}`,
    borderTopColor: color === 'white' ? '#fff' : '#1d4ed8',
    borderRadius: '50%',
    animation: 'spin .6s linear infinite',
    display: 'inline-block',
    flexShrink: 0,
  }
  return <span style={style} />
}

export function PageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center gap-3">
        <Spinner size={32} color="brand" />
        <p className="text-sm text-gray-500 font-medium">Loading…</p>
      </div>
    </div>
  )
}

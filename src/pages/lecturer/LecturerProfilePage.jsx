import { useState, useEffect, useRef } from 'react'
import { CircleUser, Camera } from 'lucide-react'
import { AnimatedLabel } from '@/components/ui/AnimatedLabel'
import { LecturerLayout } from '@/components/layout/LecturerLayout'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/Toast'
import { getInitials } from '@/utils'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/Spinner'

// Resize photo to a small base64 thumbnail — stored directly in DB, no storage bucket needed
function makeThumbnail(dataUrl, size = 160) {
  return new Promise(resolve => {
    try {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(size / img.width, size / img.height, 1)
        const canvas = document.createElement('canvas')
        canvas.width  = Math.round(img.width  * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = () => resolve(null)
      img.src = dataUrl
    } catch { resolve(null) }
  })
}

export default function LecturerProfilePage() {
  const { profile } = useAuthStore()
  const { toast } = useToast()
  const fileRef = useRef(null)

  const [changingPassword, setChangingPassword] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { setProfile } = useAuthStore()

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast('Please select an image file', 'error'); return }
    if (file.size > 5 * 1024 * 1024) { toast('Image must be under 5 MB', 'error'); return }
    setUploading(true)
    try {
      // Read file as data URL, then shrink to 160×160 thumbnail
      const dataUrl = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload  = ev => res(ev.target.result)
        reader.onerror = rej
        reader.readAsDataURL(file)
      })
      const thumbnail = await makeThumbnail(dataUrl, 160)
      if (!thumbnail) throw new Error('Could not process image')

      // Save base64 thumbnail directly in users.photo_url — no storage bucket required
      await supabase.from('users').update({ photo_url: thumbnail }).eq('id', profile.id)
      // Update auth store so sidebar refreshes immediately and survives page reload
      setProfile({ ...profile, photo_url: thumbnail })
      toast('Photo updated', 'success')
    } catch (err) {
      toast(err.message || 'Upload failed', 'error')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // Read photo from auth store — base64 data URLs survive page reload unlike blob: URLs
  const displayPhoto = profile?.photo_url?.startsWith('data:') ? profile.photo_url : null

  async function handlePasswordChange(e) {
    e.preventDefault()
    if (pwForm.next !== pwForm.confirm) { toast('Passwords do not match', 'error'); return }
    if (pwForm.next.length < 6) { toast('Password must be at least 6 characters', 'error'); return }
    setPwLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.next })
      if (error) throw new Error(error.message)
      toast('Password updated successfully', 'success')
      setPwForm({ current: '', next: '', confirm: '' })
      setChangingPassword(false)
    } catch (err) {
      toast(err.message || 'Failed to update password', 'error')
    } finally {
      setPwLoading(false)
    }
  }

  const infoRows = [
    { label: 'Full Name', value: profile?.name || '—' },
    { label: 'Email Address', value: profile?.email || '—' },
    { label: 'Role', value: 'Lecturer' },
    { label: 'Account Status', value: profile?.status || '—', badge: true },
    { label: 'Member Since', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '—' },
  ]

  return (
    <LecturerLayout>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ marginBottom: '0.25rem' }}>
            <AnimatedLabel text="Profile" Icon={CircleUser} />
          </div>
          <h1 style={{ margin: '0.2rem 0 0', color: '#1e293b', fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.01em' }}>{profile?.name || 'Lecturer'}</h1>
        </div>

        {/* Avatar + name card */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(31,111,95,0.07)', padding: '1.5rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Clickable avatar */}
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
          <button onClick={() => !uploading && fileRef.current?.click()} title="Click to change photo"
            style={{ position: 'relative', width: 72, height: 72, borderRadius: '50%', border: 'none', padding: 0, cursor: uploading ? 'default' : 'pointer', flexShrink: 0, background: 'transparent' }}>
            {displayPhoto ? (
              <img src={displayPhoto} alt={profile?.name}
                style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', display: 'block', boxShadow: '0 4px 12px rgba(47,160,132,0.25)' }} />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #2FA084, #1F6F5F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: 900, color: '#fff', boxShadow: '0 4px 12px rgba(47,160,132,0.35)' }}>
                {getInitials(profile?.name || 'L')}
              </div>
            )}
            {/* Camera badge — white bg so it's visible over any avatar */}
            <div style={{ position: 'absolute', bottom: 1, right: 1, width: 22, height: 22, borderRadius: '50%', background: '#fff', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.18)' }}>
              {uploading
                ? <Spinner size={11} color="brand" />
                : <Camera size={12} color="#1F6F5F" strokeWidth={2.2} />
              }
            </div>
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{profile?.name}</h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#2FA084', fontWeight: 600 }}>Lecturer · EEE Department</p>
            <span style={{
              display: 'inline-block', marginTop: '0.35rem',
              padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700,
              background: profile?.status === 'approved' ? '#dcfce7' : '#fef3c7',
              color: profile?.status === 'approved' ? '#16a34a' : '#d97706',
            }}>
              {profile?.status === 'approved' ? 'Active' : profile?.status || 'Pending'}
            </span>
          </div>
        </div>

        {/* Info table */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(31,111,95,0.07)', overflow: 'hidden', marginBottom: '0.75rem' }}>
          <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #f8fafc' }}>
            <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>Account Details</h3>
          </div>
          {infoRows.map((row, i) => (
            <div key={row.label} style={{ display: 'flex', alignItems: 'center', padding: '0.8rem 1.25rem', borderBottom: i < infoRows.length - 1 ? '1px solid #f8fafc' : 'none' }}>
              <span style={{ width: 140, fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', flexShrink: 0 }}>{row.label}</span>
              {row.badge ? (
                <span style={{
                  padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
                  background: row.value === 'approved' ? '#dcfce7' : '#fef3c7',
                  color: row.value === 'approved' ? '#16a34a' : '#d97706',
                }}>
                  {row.value === 'approved' ? 'Approved' : row.value}
                </span>
              ) : (
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{row.value}</span>
              )}
            </div>
          ))}
        </div>

        {/* Password section */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(31,111,95,0.07)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.25rem', borderBottom: changingPassword ? '1px solid #f8fafc' : 'none' }}>
            <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>Password</h3>
            <button
              onClick={() => setChangingPassword(!changingPassword)}
              style={{ padding: '0.4rem 0.85rem', borderRadius: 9, border: '1.5px solid #e2e8f0', background: 'transparent', fontSize: '0.78rem', fontWeight: 700, color: '#475569', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#e2e8f0' }}>
              {changingPassword ? 'Cancel' : 'Change Password'}
            </button>
          </div>

          {changingPassword && (
            <form onSubmit={handlePasswordChange} style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {[
                { key: 'next', label: 'New Password', placeholder: 'Min. 6 characters' },
                { key: 'confirm', label: 'Confirm New Password', placeholder: 'Re-enter new password' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>{field.label}</label>
                  <input
                    type="password"
                    placeholder={field.placeholder}
                    value={pwForm[field.key]}
                    onChange={e => setPwForm(p => ({ ...p, [field.key]: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '0.55rem 0.85rem', fontSize: '0.85rem', border: '1.5px solid #e2e8f0', borderRadius: 10, outline: 'none', fontFamily: 'inherit', color: '#334155', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                    onFocus={e => e.target.style.borderColor = '#2FA084'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
              ))}
              <button
                type="submit"
                disabled={pwLoading}
                style={{ marginTop: '0.25rem', padding: '0.6rem 1.25rem', borderRadius: 10, border: 'none', background: pwLoading ? 'rgba(47,160,132,0.5)' : '#2FA084', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: pwLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', transition: 'background 0.15s' }}>
                {pwLoading ? <><Spinner size={14} color="white" /> Updating…</> : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </LecturerLayout>
  )
}

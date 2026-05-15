'use client'

import { useState, useRef } from 'react'
import { voyagerProfiles } from '@/lib/mock-data'
import { useAuth } from '@/lib/auth-context'
import { Edit, Camera } from 'lucide-react'

// Platform SVG icons — styled to match site palette, native shapes preserved
const XIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.848L2.25 2.25h6.928l4.27 5.64zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

const InstagramIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
)

const LinkedInIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)

const WeChatIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.295.295a.328.328 0 00.186-.059l1.844-1.063a.592.592 0 01.312-.083.583.583 0 01.166.025c.85.235 1.768.36 2.711.36 4.8 0 8.691-3.288 8.691-7.341 0-4.054-3.891-7.344-8.691-7.344zm5.37 9.425a1.025 1.025 0 01-1.03-1.029 1.025 1.025 0 011.03-1.029 1.025 1.025 0 011.028 1.03 1.025 1.025 0 01-1.029 1.028zm-5.37 0A1.025 1.025 0 017.663 10.6a1.025 1.025 0 011.028-1.029 1.025 1.025 0 011.029 1.03 1.025 1.025 0 01-1.029 1.028zm12.002-2.183c0-3.554-3.366-6.432-7.507-6.432-.42 0-.83.033-1.232.09 1.16 1.095 1.896 2.523 1.896 4.1 0 3.356-3.099 6.173-7.092 6.558.74 2.888 3.703 5.005 7.195 5.005.77 0 1.514-.105 2.213-.297a.502.502 0 01.138-.02c.094 0 .186.028.268.076l1.502.865a.27.27 0 00.152.048.24.24 0 00.241-.241c0-.059-.024-.116-.04-.174l-.319-1.207a.479.479 0 01.174-.541c1.492-1.098 2.41-2.713 2.41-4.83z"/>
  </svg>
)

const PLATFORM_ICONS: Record<string, { icon: React.ReactNode; label: string }> = {
  x:         { icon: <XIcon />, label: 'X' },
  instagram: { icon: <InstagramIcon />, label: 'Instagram' },
  linkedin:  { icon: <LinkedInIcon />, label: 'LinkedIn' },
  wechat:    { icon: <WeChatIcon />, label: 'WeChat' },
}

export default function VoyagersPage() {
  const { user, isAtLeast } = useAuth()
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)

  const handleAvatarClick = (voyagerId: string) => {
    setUploadingFor(voyagerId)
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && uploadingFor) {
      const url = URL.createObjectURL(file)
      setAvatarUrls((prev) => ({ ...prev, [uploadingFor]: url }))
    }
    if (e.target) e.target.value = ''
  }

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ background: '#070912' }}>
      {/* Header */}
      <div className="mb-8 border-b pb-4" style={{ borderColor: '#1E2840' }}>
        <div className="text-xs tracking-[0.3em] font-mono mb-1" style={{ color: '#4A5570' }}>
          DATABASE // VOYAGERS
        </div>
        <h1 className="text-2xl font-mono font-bold tracking-wider" style={{ color: '#EDE8DE' }}>
          VOYAGERS
        </h1>
        <div className="text-xs font-mono mt-1" style={{ color: '#4A5570' }}>
          Voyager Profiles // {voyagerProfiles.length} active members
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {voyagerProfiles.map((voyager) => {
          const isOwn = isAtLeast('voyager') && (user.name === voyager.name || user.id === voyager.id)
          const avatarUrl = avatarUrls[voyager.id]

          return (
            <div
              key={voyager.id}
              className="border p-4 transition-all duration-200"
              style={{
                background: '#111525',
                borderColor: isOwn ? voyager.avatarColor + '55' : '#1E2840',
                boxShadow: isOwn
                  ? `0 0 12px ${voyager.avatarColor}15`
                  : 'inset 0 1px 0 rgba(232,90,0,0.04)',
              }}
            >
              {/* Top row: avatar + name */}
              <div className="flex items-start gap-3 mb-3">
                <div className="relative shrink-0">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-mono font-bold overflow-hidden"
                    style={{
                      background: avatarUrl ? 'transparent' : `${voyager.avatarColor}18`,
                      color: voyager.avatarColor,
                      border: `2px solid ${voyager.avatarColor}40`,
                      boxShadow: `0 0 10px ${voyager.avatarColor}18`,
                    }}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={voyager.name} className="w-full h-full object-cover" />
                    ) : (
                      voyager.initials
                    )}
                  </div>
                  {isOwn && (
                    <button
                      onClick={() => handleAvatarClick(voyager.id)}
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border transition-colors"
                      style={{ background: '#111525', borderColor: '#E85A00', color: '#E85A00' }}
                      title="Upload photo"
                    >
                      <Camera size={10} />
                    </button>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-sm font-mono font-semibold" style={{ color: '#EDE8DE' }}>
                      {voyager.name}
                    </div>
                    {isOwn && (
                      <span
                        className="text-xs font-mono px-1.5 py-0.5 border"
                        style={{ color: '#E85A00', borderColor: 'rgba(232,90,0,0.4)', background: 'rgba(232,90,0,0.08)' }}
                      >
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono" style={{ color: '#4A5570' }}>{voyager.id}</div>
                  <div className="text-xs font-mono" style={{ color: '#4A5570' }}>joined {voyager.joinDate}</div>
                </div>
                {isOwn && (
                  <button
                    className="p-1.5 border transition-colors"
                    style={{ borderColor: '#1E2840', color: '#4A5570' }}
                    title="Edit profile"
                  >
                    <Edit size={12} />
                  </button>
                )}
              </div>

              {isOwn && (
                <div className="mb-2">
                  <button
                    onClick={() => handleAvatarClick(voyager.id)}
                    className="text-xs font-mono tracking-widest transition-colors"
                    style={{ color: '#4A5570' }}
                  >
                    {avatarUrl ? '↑ CHANGE PHOTO' : '↑ UPLOAD PHOTO'}
                  </button>
                </div>
              )}

              {/* Stats */}
              <div className="flex gap-4 mb-3 py-2 border-y" style={{ borderColor: '#1A2238' }}>
                <div className="text-center flex-1">
                  <div
                    className="text-xl font-mono font-bold"
                    style={{ color: '#E85A00', textShadow: '0 0 10px rgba(232,90,0,0.4)' }}
                  >
                    {voyager.observationDays}
                  </div>
                  <div className="text-[10px] font-mono" style={{ color: '#4A5570' }}>OBS DAYS</div>
                </div>
                <div className="w-px" style={{ background: '#1A2238' }} />
                <div className="text-center flex-1">
                  <div
                    className="text-xl font-mono font-bold"
                    style={{ color: '#20D890', textShadow: '0 0 10px rgba(32,216,144,0.3)' }}
                  >
                    {voyager.worldsDiscovered}
                  </div>
                  <div className="text-[10px] font-mono" style={{ color: '#4A5570' }}>WORLDS</div>
                </div>
              </div>

              {/* Bio */}
              <p className="text-xs leading-relaxed font-mono mb-3" style={{ color: '#8A9AB5' }}>
                {voyager.bio.length > 240 ? voyager.bio.slice(0, 240) + '…' : voyager.bio}
              </p>

              {/* Social links with platform icons */}
              {voyager.links && Object.keys(voyager.links).length > 0 && (
                <div className="flex gap-3 pt-2 border-t" style={{ borderColor: '#1A2238' }}>
                  {(Object.entries(voyager.links) as [string, string][]).map(([platform, url]) => {
                    if (!url) return null
                    const p = PLATFORM_ICONS[platform]
                    if (!p) return null
                    return (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={p.label}
                        className="flex items-center justify-center w-7 h-7 border transition-colors"
                        style={{ borderColor: '#1E2840', color: '#4A5570', borderRadius: '2px' }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(242,240,230,0.2)'
                          ;(e.currentTarget as HTMLElement).style.color = '#8A9AB5'
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = '#1E2840'
                          ;(e.currentTarget as HTMLElement).style.color = '#4A5570'
                        }}
                      >
                        {p.icon}
                      </a>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

'use client'

import { useState, useRef } from 'react'
import { voyagerProfiles } from '@/lib/mock-data'
import { useAuth } from '@/lib/auth-context'
import { ExternalLink, Edit, Camera } from 'lucide-react'

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
          const isOwn = isAtLeast('voyager') && (user.name === voyager.name || user.voyagerId === voyager.id)
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

              {/* Social links */}
              {voyager.links && Object.keys(voyager.links).length > 0 && (
                <div className="flex gap-2 pt-2 border-t" style={{ borderColor: '#1A2238' }}>
                  {voyager.links.x && (
                    <a
                      href={voyager.links.x}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-mono transition-colors"
                      style={{ color: '#4A5570' }}
                    >
                      <ExternalLink size={10} />
                      X
                    </a>
                  )}
                  {voyager.links.instagram && (
                    <a
                      href={voyager.links.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-mono transition-colors"
                      style={{ color: '#4A5570' }}
                    >
                      <ExternalLink size={10} />
                      IG
                    </a>
                  )}
                  {voyager.links.linkedin && (
                    <a
                      href={voyager.links.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-mono transition-colors"
                      style={{ color: '#4A5570' }}
                    >
                      <ExternalLink size={10} />
                      LI
                    </a>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

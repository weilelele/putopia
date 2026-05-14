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
    <div className="min-h-screen p-6 md:p-8" style={{ background: '#0F0A00' }}>
      {/* Header */}
      <div className="mb-8 border-b pb-4" style={{ borderColor: '#5C4A1E' }}>
        <div className="text-xs tracking-[0.3em] font-mono mb-1" style={{ color: '#7A6A40' }}>
          DATABASE // VOYAGERS
        </div>
        <h1 className="text-2xl font-mono font-bold tracking-wider" style={{ color: '#F5E6C8' }}>
          VOYAGERS
        </h1>
        <div className="text-xs font-mono mt-1" style={{ color: '#7A6A40' }}>
          Voyager Profiles // {voyagerProfiles.length} active members
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {voyagerProfiles.map((voyager) => {
          const isOwn = isAtLeast('voyager') && (user.name === voyager.name || user.voyagerId === voyager.id)
          const avatarUrl = avatarUrls[voyager.id]

          return (
            <div
              key={voyager.id}
              className="border rounded p-4 transition-all duration-200"
              style={{
                background: '#221800',
                borderColor: isOwn ? voyager.avatarColor + '88' : '#5C4A1E',
                boxShadow: isOwn
                  ? `0 0 12px ${voyager.avatarColor}22, inset 0 1px 0 rgba(232,160,32,0.1)`
                  : 'inset 0 1px 0 rgba(232,160,32,0.06)',
              }}
              onMouseEnter={(e) => {
                if (!isOwn) (e.currentTarget as HTMLElement).style.borderColor = '#5C4A1E'
              }}
              onMouseLeave={(e) => {
                if (!isOwn) (e.currentTarget as HTMLElement).style.borderColor = '#5C4A1E'
              }}
            >
              {/* Top row: avatar + name */}
              <div className="flex items-start gap-3 mb-3">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-mono font-bold overflow-hidden"
                    style={{
                      background: avatarUrl ? 'transparent' : `${voyager.avatarColor}22`,
                      color: voyager.avatarColor,
                      border: `2px solid ${voyager.avatarColor}55`,
                      boxShadow: `0 0 12px ${voyager.avatarColor}22`,
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
                      style={{ background: '#1A1200', borderColor: '#E8A020', color: '#E8A020' }}
                      title="Upload photo"
                    >
                      <Camera size={10} />
                    </button>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-sm font-mono font-semibold" style={{ color: '#F5E6C8' }}>
                      {voyager.name}
                    </div>
                    {isOwn && (
                      <span
                        className="text-xs font-mono px-1.5 py-0.5 rounded border"
                        style={{ color: '#E8A020', borderColor: 'rgba(232,160,32,0.4)', background: 'rgba(232,160,32,0.1)' }}
                      >
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono" style={{ color: '#7A6A40' }}>{voyager.id}</div>
                  <div className="text-xs font-mono" style={{ color: '#5C4A1E' }}>joined {voyager.joinDate}</div>
                </div>
                {isOwn && (
                  <button
                    className="p-1.5 rounded border transition-colors"
                    style={{ borderColor: '#5C4A1E', color: '#7A6A40' }}
                    title="Edit profile"
                  >
                    <Edit size={12} />
                  </button>
                )}
              </div>

              {/* Upload label under avatar for own profile */}
              {isOwn && (
                <div className="mb-2">
                  <button
                    onClick={() => handleAvatarClick(voyager.id)}
                    className="text-xs font-mono tracking-widest transition-colors"
                    style={{ color: '#7A6A40' }}
                  >
                    {avatarUrl ? '↑ CHANGE PHOTO' : '↑ UPLOAD PHOTO'}
                  </button>
                </div>
              )}

              {/* Stats */}
              <div className="flex gap-4 mb-3 py-2 border-y" style={{ borderColor: '#3D3010' }}>
                <div className="text-center flex-1">
                  <div
                    className="text-xl font-mono font-bold"
                    style={{ color: '#E8A020', textShadow: '0 0 12px rgba(232,160,32,0.5)' }}
                  >
                    {voyager.observationDays}
                  </div>
                  <div className="text-[10px] font-mono" style={{ color: '#7A6A40' }}>OBS DAYS</div>
                </div>
                <div className="w-px" style={{ background: '#3D3010' }} />
                <div className="text-center flex-1">
                  <div
                    className="text-xl font-mono font-bold"
                    style={{ color: '#4D8C3F', textShadow: '0 0 12px rgba(77,140,63,0.4)' }}
                  >
                    {voyager.worldsDiscovered}
                  </div>
                  <div className="text-[10px] font-mono" style={{ color: '#7A6A40' }}>WORLDS</div>
                </div>
              </div>

              {/* Bio */}
              <p className="text-xs leading-relaxed font-mono mb-3" style={{ color: '#C4A96A' }}>
                {voyager.bio.length > 240 ? voyager.bio.slice(0, 240) + '…' : voyager.bio}
              </p>

              {/* Social links */}
              {voyager.links && Object.keys(voyager.links).length > 0 && (
                <div className="flex gap-2 pt-2 border-t" style={{ borderColor: '#3D3010' }}>
                  {voyager.links.x && (
                    <a
                      href={voyager.links.x}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-mono transition-colors"
                      style={{ color: '#7A6A40' }}
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
                      style={{ color: '#7A6A40' }}
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
                      style={{ color: '#7A6A40' }}
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

// A post's video plays in place with native controls; only metadata loads until
// the reader presses play, so the feed stays light on mobile data.
export function IntelVideo({ src, poster, title }: { src: string; poster?: string | null; title: string }) {
  return (
    <div className="intel-video">
      <video src={src} poster={poster ?? undefined} controls playsInline preload="metadata" aria-label={`Video: ${title}`}>
        <a href={src}>Download the video</a>
      </video>
    </div>
  )
}

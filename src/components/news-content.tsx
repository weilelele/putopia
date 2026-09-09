import SmartImage from './smart-image'
export function PublisherIdentity({ name, avatar }: { name: string; avatar?: string | null }) {
  return <span className="news-publisher"><span className="news-publisher-avatar">{avatar ? <SmartImage src={avatar} alt="" width={32} height={32} sizes="32px" /> : <span aria-hidden>{name.slice(0,2).toUpperCase()}</span>}</span><span>{name}</span></span>
}
export function NewsMedia({ images, title }: { images: string[]; title: string }) {
  if (!images.length) return null
  return <div className={`news-media${images.length === 1 ? ' news-media--single' : ''}`}>{images.slice(0,4).map((src,index)=><div className="news-media-item" key={`${src}-${index}`}><SmartImage src={src} alt={`${title} · image ${index+1}`} width={640} height={400} sizes={images.length === 1 ? "(min-width: 1100px) 720px, 100vw" : "(min-width: 1100px) 360px, 50vw"} />{index === 3 && images.length > 4 && <span className="news-media-more">+{images.length - 4}</span>}</div>)}</div>
}

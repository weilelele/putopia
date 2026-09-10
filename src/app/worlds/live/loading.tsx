import { RootBrandHeader } from '@/components/root-brand-header'
import styles from '../../live-observation-room.module.css'
import roomStyles from './worlds-room.module.css'
export default function Loading() {
  return <main className={`main ${styles.page} ${roomStyles.scrollPage}`} data-route-scroll aria-busy="true" aria-label="Loading Worlds">
    <h1 className="sr-only">Worlds</h1><RootBrandHeader /><div className="live-loading-tabs" />
    <div className={styles.workspace}><div className="live-loading-media" /><div className="live-loading-details"><p role="status">Loading live room…</p></div></div>
  </main>
}

import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'

/**
 * Raster-tile map with markers, no SDK or key (same approach as the shop's
 * store map). Fits all markers when no zoom is given.
 */

export interface Marker {
  id: string
  lat: number
  lon: number
  kind?: 'pin' | 'dot'
  /** Dot diameter in px. */
  size?: number
  label?: ReactNode
  title?: string
  own?: boolean
  off?: boolean
}

const TILE = 256
const lonToX = (lon: number, z: number) => ((lon + 180) / 360) * 2 ** z
const latToY = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z
}

export function TileMap({ markers, height = 320, zoom, center, padding = 48, maxZoom = 16 }: {
  markers: Marker[]
  height?: number
  zoom?: number
  center?: { lat: number; lon: number }
  padding?: number
  maxZoom?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 600))
    ro.observe(el)
    setWidth(el.clientWidth || 600)
    return () => ro.disconnect()
  }, [])

  const view = useMemo(() => {
    if (zoom !== undefined && center) return { z: zoom, lat: center.lat, lon: center.lon }
    if (!markers.length) return { z: 6, lat: 41.3, lon: 64.5 }
    const lats = markers.map((m) => m.lat); const lons = markers.map((m) => m.lon)
    const c = { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lon: (Math.min(...lons) + Math.max(...lons)) / 2 }
    let z = maxZoom
    for (; z > 3; z--) {
      const w = (lonToX(Math.max(...lons), z) - lonToX(Math.min(...lons), z)) * TILE
      const h = (latToY(Math.min(...lats), z) - latToY(Math.max(...lats), z)) * TILE
      if (w <= width - padding * 2 && h <= height - padding * 2) break
    }
    return { z: zoom ?? z, lat: center?.lat ?? c.lat, lon: center?.lon ?? c.lon }
  }, [markers, zoom, center, width, height, padding, maxZoom])

  const cx = lonToX(view.lon, view.z)
  const cy = latToY(view.lat, view.z)
  const world = 2 ** view.z
  const tiles: { key: string; src: string; left: number; top: number }[] = []
  for (let ty = Math.floor(cy - height / 2 / TILE); ty <= Math.floor(cy + height / 2 / TILE); ty++) {
    if (ty < 0 || ty >= world) continue
    for (let tx = Math.floor(cx - width / 2 / TILE); tx <= Math.floor(cx + width / 2 / TILE); tx++) {
      const wx = ((tx % world) + world) % world
      tiles.push({ key: `${view.z}/${tx}/${ty}`, src: `https://tile.openstreetmap.org/${view.z}/${wx}/${ty}.png`, left: Math.round((tx - cx) * TILE + width / 2), top: Math.round((ty - cy) * TILE + height / 2) })
    }
  }
  const pos = (m: Marker) => ({ left: (lonToX(m.lon, view.z) - cx) * TILE + width / 2, top: (latToY(m.lat, view.z) - cy) * TILE + height / 2 })

  return (
    <div ref={ref} className="tilemap" style={{ height }}>
      <div className="tilemap__tiles" aria-hidden="true">
        {tiles.map((t) => <img key={t.key} src={t.src} alt="" loading="lazy" draggable={false} style={{ left: t.left, top: t.top }} />)}
      </div>
      {markers.map((m) => {
        const p = pos(m)
        if (m.kind === 'pin') {
          return (
            <span key={m.id} className="tilemap__pin" style={p} title={m.title}>
              <svg width="30" height="40" viewBox="0 0 28 38" aria-hidden="true">
                <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 24 14 24s14-13.5 14-24c0-7.7-6.3-14-14-14z" fill="var(--espresso)" />
                <circle cx="14" cy="14" r="5.2" fill="#C9A867" />
              </svg>
            </span>
          )
        }
        const size = m.size ?? 14
        return (
          <span key={m.id} className={`tilemap__dot${m.own ? ' is-own' : ''}${m.off ? ' is-off' : ''}`} title={m.title}
            style={{ ...p, width: size, height: size, fontSize: Math.max(9, Math.min(12, size / 3)) }}>
            {size >= 26 ? m.label : null}
          </span>
        )
      })}
      <div className="tilemap__cred">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a></div>
    </div>
  )
}

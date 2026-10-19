import { useId } from 'react'

/** The Family Group leaf mark — same drawing as the website header. */
const LEAVES: [number, number, number][] = [[-74, 21, 7.2], [74, 21, 7.2], [-38, 28, 9.4], [38, 28, 9.4], [0, 35, 11]]

const leafPath = (length: number, width: number) =>
  `M0 0C${width} ${-length * 0.26} ${width * 0.8} ${-length * 0.74} 0 ${-length}C${-width * 0.8} ${-length * 0.74} ${-width} ${-length * 0.26} 0 0Z`

export function BrandMark({ size = 30, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg className={className} viewBox="-40 -40 80 44" width={Math.round((size * 80) / 44)} height={size} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="-40" x2="0" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#D9B871" />
          <stop offset=".55" stopColor="#B48A45" />
          <stop offset="1" stopColor="#8A6430" />
        </linearGradient>
      </defs>
      <g transform="translate(0 2)">
        {LEAVES.map(([angle, length, width]) => (
          <g key={angle} transform={`rotate(${angle})`}>
            <path d={leafPath(length, width)} fill={`url(#g${id})`} />
            <path d={`M0 -2V${-length * 0.86}`} stroke="#FBF3E2" strokeOpacity=".55" strokeWidth="1" fill="none" />
          </g>
        ))}
      </g>
    </svg>
  )
}

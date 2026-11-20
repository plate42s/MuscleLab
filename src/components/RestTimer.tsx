import { useEffect, useState } from 'react'

const REST_PREF_KEY = 'ml.train.restSec'
export const REST_PRESETS = [60, 90, 120] as const
export const DEFAULT_REST_SEC = 90

export function readRestPref() {
  try {
    const raw = localStorage.getItem(REST_PREF_KEY)
    const n = raw ? Number(raw) : DEFAULT_REST_SEC
    if (Number.isFinite(n) && n > 0) return Math.round(n)
  } catch {
    /* ignore */
  }
  return DEFAULT_REST_SEC
}

export function writeRestPref(sec: number) {
  try {
    localStorage.setItem(REST_PREF_KEY, String(sec))
  } catch {
    /* ignore */
  }
}

function formatRest(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function RestTimer({
  endsAt,
  totalSec,
  label,
  onSkip,
  onChangePreset,
}: {
  endsAt: number
  totalSec: number
  label?: string
  onSkip: () => void
  onChangePreset: (sec: number) => void
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])

  const leftMs = Math.max(0, endsAt - now)
  const leftSec = Math.ceil(leftMs / 1000)
  const progress =
    totalSec > 0 ? Math.min(100, Math.round(((totalSec * 1000 - leftMs) / (totalSec * 1000)) * 100)) : 100
  const done = leftSec <= 0

  return (
    <div className="rounded-2xl border border-[var(--ml-border)] bg-[var(--ml-elevated)] p-3 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] ml-muted">
            Descanso{label ? ` · ${label}` : ''}
          </p>
          <p
            className="mt-1 font-display text-3xl font-bold tabular-nums"
            style={{ color: done ? 'var(--ml-success)' : 'var(--ml-primary)' }}
          >
            {done ? 'Listo' : formatRest(leftSec)}
          </p>
        </div>
        <button className="btn-secondary !px-3 !py-2 text-xs" type="button" onClick={onSkip}>
          {done ? 'Cerrar' : 'Saltar'}
        </button>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--ml-surface)]">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${done ? 100 : progress}%`,
            background: done ? 'var(--ml-success)' : 'var(--ml-primary)',
          }}
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {REST_PRESETS.map((sec) => {
          const selected = totalSec === sec
          return (
            <button
              key={sec}
              type="button"
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={
                selected
                  ? { background: 'var(--ml-primary)', color: '#111315' }
                  : {
                      background: 'var(--ml-surface)',
                      color: 'var(--ml-text-muted)',
                      boxShadow: 'inset 0 0 0 1px var(--ml-border)',
                    }
              }
              onClick={() => onChangePreset(sec)}
            >
              {sec}s
            </button>
          )
        })}
      </div>
    </div>
  )
}

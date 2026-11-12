export function Placeholder({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="card max-w-xl space-y-2">
      <h1 className="font-display text-2xl font-bold ml-title">{title}</h1>
      <p className="text-sm ml-muted">{blurb}</p>
      <p className="badge-gold mt-2">Próximamente</p>
    </div>
  )
}

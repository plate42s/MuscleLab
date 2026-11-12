export function Setup() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-4">
      <h1 className="font-display text-3xl font-bold text-ink-900">Configura Supabase</h1>
      <p className="text-sm leading-relaxed text-slate-600">
        MuscleLab necesita un proyecto de Supabase. Edita{' '}
        <code className="rounded bg-slate-100 px-1">.env</code> con tu Project URL y la{' '}
        <strong>publishable key</strong> (<code className="rounded bg-slate-100 px-1">sb_publishable_…</code>).
        No uses la secret key.
      </p>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
        <li>Crea un proyecto en supabase.com</li>
        <li>
          Ejecuta en orden los SQL de <code className="rounded bg-slate-100 px-1">supabase/migrations/</code>
        </li>
        <li>
          Ejecuta el seed <code className="rounded bg-slate-100 px-1">supabase/seed.sql</code>
        </li>
        <li>Reinicia <code className="rounded bg-slate-100 px-1">npm run dev</code></li>
      </ol>
    </div>
  )
}

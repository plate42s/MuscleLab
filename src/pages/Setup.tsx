export function Setup() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-4">
      <h1 className="font-display text-3xl font-bold ml-title">Configura Supabase</h1>
      <p className="text-sm leading-relaxed ml-muted">
        MuscleLab necesita un proyecto de Supabase. Edita{' '}
        <code className="rounded bg-[var(--ml-elevated)] px-1 text-[var(--ml-primary)]">.env</code> con tu Project URL y la{' '}
        <strong>publishable key</strong> (
        <code className="rounded bg-[var(--ml-elevated)] px-1 text-[var(--ml-primary)]">sb_publishable_…</code>
        ). No uses la secret key.
      </p>
      <ol className="list-decimal space-y-2 pl-5 text-sm ml-muted">
        <li>Crea un proyecto en supabase.com</li>
        <li>
          Ejecuta en orden los SQL de{' '}
          <code className="rounded bg-[var(--ml-elevated)] px-1">supabase/migrations/</code>
        </li>
        <li>
          Ejecuta el seed <code className="rounded bg-[var(--ml-elevated)] px-1">supabase/seed.sql</code>
        </li>
        <li>
          Reinicia <code className="rounded bg-[var(--ml-elevated)] px-1">npm run dev</code>
        </li>
      </ol>
    </div>
  )
}

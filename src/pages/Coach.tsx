const sections = [
  {
    title: 'Recomendaciones',
    blurb: 'Sugerencias de foco, volumen y recuperación según tu historial.',
  },
  {
    title: 'Rutina base',
    blurb: 'Plantilla semanal alineada a tu modalidad, nivel y objetivo.',
  },
  {
    title: 'Ajustes de sesión',
    blurb: 'Modificaciones del día: carga, series y alternativas de ejercicio.',
  },
  {
    title: 'Resumen del entrenamiento',
    blurb: 'Lectura clara de lo que hiciste y qué conviene a continuación.',
  },
  {
    title: 'Historial de recomendaciones',
    blurb: 'Seguimiento de lo que max ia steel te fue proponiendo en el tiempo.',
  },
] as const

export function Coach() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="ml-stat-card space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: 'var(--ml-primary)' }}
            >
              Asistencia deportiva · F4
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight ml-title md:text-3xl">
              max ia steel{' '}
              <span className="font-semibold ml-muted">(Coach)</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm ml-muted">
              Espacio de coaching para calistenia y gym. La IA llegará en F4: por ahora
              dejamos definida la dirección visual, sin simular respuestas.
            </p>
          </div>
          <span className="badge-gold shrink-0">Próximamente</span>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {sections.map((section) => (
          <article
            key={section.title}
            className="ml-stat-card opacity-90"
            aria-disabled="true"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-bold ml-title">{section.title}</h2>
              <span className="text-[10px] font-semibold uppercase tracking-wide ml-muted">
                F4
              </span>
            </div>
            <p className="mt-2 text-sm ml-muted">{section.blurb}</p>
            <p
              className="mt-3 text-xs font-semibold"
              style={{ color: 'var(--ml-primary)' }}
            >
              Disponible en F4
            </p>
          </article>
        ))}
      </div>

      <p className="text-center text-xs ml-muted">
        No hay chat ni generación activa todavía — solo el mapa de producto.
      </p>
    </div>
  )
}

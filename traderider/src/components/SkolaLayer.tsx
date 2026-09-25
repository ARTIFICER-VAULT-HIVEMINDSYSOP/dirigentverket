import { useEffect, useState } from 'react'
import {
  describePosition,
  lessonHref,
  LESSONS,
  normalizeLessonBase,
  parsePracticeNumber,
  positionSize,
  railExplanation,
  type RailNote,
} from '../lib/skola'

export function PracticeBanner() {
  return (
    <p className="practice-banner" lang="sv" data-practice-banner>
      Övning, simulerad data. Det här är en övning på simulerade kurser.
    </p>
  )
}

export function SkolaToggle({ on, onChange }: { on: boolean; onChange: (next: boolean) => void }) {
  return (
    <div className="mt-3 max-w-xl" lang="sv">
      <label className="inline-flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="skola-toggle"
          checked={on}
          onChange={(event) => onChange(event.target.checked)}
        />
        Skola-läge
      </label>
      <p className="mt-1 text-sm leading-snug text-ink/80">
        {on
          ? 'Skola-läget är på. En kort förklaring visas när priset byter räls.'
          : 'Skola-läget är av. Förklaringarna och räkneexemplen är dolda.'}
      </p>
    </div>
  )
}

export function RailNoteView({ note, base }: { note: RailNote; base: string }) {
  const href = lessonHref(base, LESSONS[2].file)
  return (
    <p className="skola-note" lang="sv" role="status" data-skola-note={note.change}>
      {railExplanation(note.change)} Läs mer i lektion 3:{' '}
      <a className="skola-link" href={href}>
        Bollingerband
      </a>
      .
    </p>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  describedBy,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  describedBy?: string
}) {
  return (
    <label className="block min-w-0 text-sm" htmlFor={id}>
      <span className="mb-1 block leading-snug">{label}</span>
      <input
        id={id}
        className="skola-input"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        value={value}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

export function PositionSizeBox({
  mark,
  suggestedStop,
  base,
}: {
  mark: number | null
  suggestedStop: number | null
  base: string
}) {
  const [accountRaw, setAccountRaw] = useState('20 000')
  const [riskRaw, setRiskRaw] = useState('1')
  const [entryRaw, setEntryRaw] = useState(() => (mark == null ? '' : mark.toFixed(2)))
  const [stopRaw, setStopRaw] = useState(() => (suggestedStop == null ? '' : suggestedStop.toFixed(2)))
  const [tpRaw, setTpRaw] = useState('')
  const [entryDirty, setEntryDirty] = useState(false)
  const [stopDirty, setStopDirty] = useState(false)

  useEffect(() => {
    if (!entryDirty) setEntryRaw(mark == null ? '' : mark.toFixed(2))
  }, [mark, entryDirty])

  useEffect(() => {
    if (!stopDirty) setStopRaw(suggestedStop == null ? '' : suggestedStop.toFixed(2))
  }, [suggestedStop, stopDirty])

  const result = positionSize({
    accountSize: parsePracticeNumber(accountRaw),
    riskPct: parsePracticeNumber(riskRaw),
    entry: parsePracticeNumber(entryRaw),
    stop: parsePracticeNumber(stopRaw),
    takeProfit: parsePracticeNumber(tpRaw),
  })
  const copy = describePosition(result)
  const lessonTwo = lessonHref(base, LESSONS[1].file)

  return (
    <section className="armor-panel px-3 py-2" lang="sv" data-skola-position>
      <h2 className="font-display text-2xl leading-none">Positionsstorlek</h2>
      <p className="mt-2 text-sm leading-snug">
        Räkneexemplet följer lektion 1 och börjar på 1 procent av exempelkontot.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
        <Field id="skola-account" label="Kontostorlek (exempel)" value={accountRaw} onChange={setAccountRaw} />
        <Field
          id="skola-risk"
          label="Risk i procent"
          value={riskRaw}
          onChange={setRiskRaw}
          describedBy={copy.warning ? 'skola-risk-varning' : undefined}
        />
        <Field
          id="skola-entry"
          label="Ingångskurs"
          value={entryRaw}
          onChange={(value) => {
            setEntryDirty(true)
            setEntryRaw(value)
          }}
        />
        <Field
          id="skola-stop"
          label="Stoppförlust"
          value={stopRaw}
          onChange={(value) => {
            setStopDirty(true)
            setStopRaw(value)
          }}
        />
        <Field id="skola-tp" label="Vinstmål" value={tpRaw} onChange={setTpRaw} />
      </div>
      <p className="mt-2 text-sm leading-snug">
        Ingången följer senaste stängning, och stoppet följer motsatt band eller 20-SMA, tills du skriver ett eget värde.
      </p>
      <div className="mt-2 flex flex-col gap-1 text-sm leading-snug">
        <p>{copy.risk}</p>
        <p>{copy.distance}</p>
        <p>{copy.shares}</p>
        {result.takeProfitSet ? (
          <p>{copy.reward}</p>
        ) : (
          <p>
            Vinstmål saknas, så risk mot belöning visas inte. Läs mer i{' '}
            <a className="skola-link" href={lessonTwo}>
              lektion 2: Risk och belöning
            </a>
            .
          </p>
        )}
        {copy.warning ? (
          <p id="skola-risk-varning" data-skola-warning>
            {copy.warning}
          </p>
        ) : null}
      </div>
    </section>
  )
}

export function LessonsPanel({ base }: { base: string }) {
  const root = normalizeLessonBase(base)
  return (
    <nav className="armor-panel px-3 py-3" lang="sv" aria-label="Lektioner" data-lesson-base={root}>
      <h2 className="font-display text-2xl leading-none">Lektioner</h2>
      <p className="mt-2 text-sm leading-snug">De här länkarna öppnar övningslektionerna som hör till skrivbordet.</p>
      <ul className="mt-3 flex flex-col gap-1">
        {LESSONS.map((lesson) => (
          <li key={lesson.id}>
            <a className="skola-link inline-block py-1 text-sm" href={lessonHref(root, lesson.file)}>
              Lektion {lesson.id}: {lesson.title}.
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

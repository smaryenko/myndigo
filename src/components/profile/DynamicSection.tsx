import type { RepeatableSectionProps } from './useRepeatableSection'
import { AlertBarSection } from './sections/AlertBarSection'
import { ContactListSection } from './sections/ContactListSection'
import { ListSection } from './sections/ListSection'
import { SingleEntrySection } from './sections/SingleEntrySection'

/**
 * Renders one profile section in the editor, driven entirely by its
 * section/field definitions. Dispatches on `repeatable` + `render_hint`:
 *   - repeatable = false          → SingleEntrySection (one flat form)
 *   - render_hint 'contact_list'  → ContactListSection (priority order, tap-to-call)
 *   - render_hint 'alert_bar'     → AlertBarSection (severity cards)
 *   - anything else               → ListSection (generic list)
 */
export function DynamicSection(props: RepeatableSectionProps) {
  const { section, entries } = props

  if (!section.repeatable) {
    return (
      <SingleEntrySection
        childId={props.childId}
        section={section}
        fields={props.fields}
        entry={entries[0] ?? null}
        onChange={entry => props.onChange([entry])}
      />
    )
  }

  switch (section.render_hint) {
    case 'contact_list':
      return <ContactListSection {...props} />
    case 'alert_bar':
      return <AlertBarSection {...props} />
    default:
      return <ListSection {...props} />
  }
}

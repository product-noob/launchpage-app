import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from './Icon.tsx'

interface SortableAppListProps {
  ids: string[]
  onReorder: (ids: string[]) => void
  children: React.ReactNode
}

export function SortableAppList({ ids, onReorder, children }: SortableAppListProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return

    const newIds = [...ids]
    newIds.splice(oldIndex, 1)
    newIds.splice(newIndex, 0, String(active.id))
    onReorder(newIds)
  }, [ids, onReorder])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div data-dragging={activeId ? '' : undefined}>
          {children}
        </div>
      </SortableContext>
    </DndContext>
  )
}

interface SortableItemProps {
  id: string
  children: React.ReactNode
}

export function SortableItem({ id, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="flex items-stretch gap-0">
      <button
        {...listeners}
        className="flex items-center px-0.5 -ml-1.5 cursor-grab active:cursor-grabbing text-neutral-300 dark:text-neutral-700 hover:text-neutral-500 dark:hover:text-neutral-500 touch-none"
        aria-label="Drag to reorder"
        tabIndex={-1}
      >
        <Icon name="grip" className="w-3 h-3" />
      </button>
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}

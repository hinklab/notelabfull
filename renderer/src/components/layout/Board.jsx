import React from 'react'
import Column from '../columns/Column.jsx'

export default function Board({ sections, moviesBySection, onContextMenu, onAdd, onMoveCard, onReorderCard, onGroupContextMenu, onRenameSection, onDeleteSection, groupClipboard, onGroupCut, onGroupCopy, onGroupPaste }) {
  return (
    <div className="board">
      {Object.entries(sections).map(([key, meta]) => (
        <Column
          key={key}
          sectionKey={key}
          meta={meta}
          movies={moviesBySection(key)}
          onContextMenu={onContextMenu}
          onAdd={() => onAdd(key)}
          onMoveCard={onMoveCard}
          onReorderCard={onReorderCard}
          onGroupContextMenu={onGroupContextMenu ? (e) => onGroupContextMenu(e, key, meta) : undefined}
          onRename={onRenameSection ? (name) => onRenameSection(key, name) : undefined}
          onDelete={onDeleteSection ? () => onDeleteSection(key) : undefined}
          groupClipboard={groupClipboard}
          onGroupCut={onGroupCut ? () => onGroupCut(key, meta) : undefined}
          onGroupCopy={onGroupCopy ? () => onGroupCopy(key, meta) : undefined}
          onGroupPaste={onGroupPaste ? () => onGroupPaste(key) : undefined}
        />
      ))}
    </div>
  )
}

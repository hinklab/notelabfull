import React, { useState, useEffect, useCallback, useRef } from 'react'
import ReactDOM from 'react-dom'
import { Modal } from '../modals/SettingsModal.jsx'
import MovieCard from '../cards/MovieCard.jsx'

function hexToRgba(hex, alpha) {
  if (!hex || hex.length < 7) return `rgba(124,58,237,${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function getDropPosition(items, clientY, containerRef) {
  if (!containerRef.current || items.length === 0) return { targetId: null, position: 'after', insertIndex: 0 }
  const cardEls = containerRef.current.querySelectorAll('[data-item-id]')
  let best = null, bestDist = Infinity
  cardEls.forEach(el => {
    const rect = el.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const dist = Math.abs(clientY - midY)
    if (dist < bestDist) {
      bestDist = dist
      best = { targetId: parseInt(el.dataset.itemId), position: clientY < midY ? 'before' : 'after' }
    }
  })
  if (!best) {
    const firstRect = cardEls[0]?.getBoundingClientRect()
    if (firstRect && clientY < firstRect.top) best = { targetId: parseInt(cardEls[0].dataset.itemId), position: 'before' }
    else { const last = cardEls[cardEls.length - 1]; best = { targetId: last ? parseInt(last.dataset.itemId) : null, position: 'after' } }
  }
  const idx = items.findIndex(i => i.id === best.targetId)
  return { ...best, insertIndex: Math.max(0, best.position === 'before' ? idx : idx + 1) }
}

export default function NoteBoard({ note, refreshTrigger }) {
  const [groups, setGroups] = useState([])
  const [itemsByGroup, setItemsByGroup] = useState({})
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [addItemGroup, setAddItemGroup] = useState(null)
  const [editItem, setEditItem] = useState(null)
  const [itemContextMenu, setItemContextMenu] = useState(null)
  const [groupContextMenu, setGroupContextMenu] = useState(null)
  const [itemClipboard, setItemClipboard] = useState(null)
  const [groupClipboard, setGroupClipboard] = useState(null)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [renameGroupId, setRenameGroupId] = useState(null)
  const [draggingGroupId, setDraggingGroupId] = useState(null)
  const groupDragOver = useRef(null)
  const [confirmState, setConfirmState] = useState(null)

  const showConfirm = (message) => new Promise(resolve => {
    setConfirmState({ message, resolve })
  })

  const noteId = note?.id ?? null
  const isMovieNote = note?.is_movie === true

  const loadGroups = useCallback(async () => {
    const groups = await window.api.getGroups(noteId)
    setGroups(groups)
    const map = {}
    if (isMovieNote) {
      const movies = await window.api.getMovies(noteId)
      for (const g of groups) {
        map[g.id] = movies
          .filter(m => m.section === g.section_key)
          .sort((a, b) => a.position - b.position)
          .map(m => ({
            id: m.id, group_id: g.id, title: m.title,
            subtitle: [m.genre, m.director].filter(Boolean).join(' · '),
            cover_url: m.poster_path || null,
            note: m.note || '', _movie: m,
          }))
      }
    } else {
      await Promise.all(groups.map(async g => {
        map[g.id] = await window.api.getItems(g.id)
      }))
    }
    setItemsByGroup(map)
  }, [noteId, isMovieNote])

  useEffect(() => { loadGroups() }, [loadGroups])

  useEffect(() => {
    if (refreshTrigger > 0) loadGroups()
  }, [refreshTrigger])

  useEffect(() => {
    const close = () => { setItemContextMenu(null); setGroupContextMenu(null) }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  const reloadGroup = async (groupId) => {
    if (isMovieNote) {
      await loadGroups()
    } else {
      const items = await window.api.getItems(groupId)
      setItemsByGroup(prev => ({ ...prev, [groupId]: items }))
    }
  }

  const handleCreateGroup = async (name) => {
    if (!name?.trim() || creatingGroup) return
    setCreatingGroup(true)
    const result = await window.api.createGroup(noteId, name.trim())
    setCreatingGroup(false)
    if (result?.error) { alert(result.error); return }
    setShowCreateGroup(false)
    await loadGroups()
  }

  const handleDeleteGroup = async (group) => {
    const count = (itemsByGroup[group.id] || []).length
    const msg = count > 0
      ? `"${group.name}" guruhini o'chirishni tasdiqlaysizmi? Ichidagi ${count} ta kard ham o'chib ketadi!`
      : `"${group.name}" guruhini o'chirishni tasdiqlaysizmi?`
    const ok = await showConfirm(msg)
    if (!ok) return
    const result = await window.api.deleteGroup(group.id)
    if (result?.error) { alert(result.error); return }
    await loadGroups()
  }

  const handleRenameGroup = async (group, name) => {
    if (!name?.trim()) return
    await window.api.updateGroup(group.id, { name: name.trim() })
    await loadGroups()
  }

  const getGroupSectionKey = (groupId) => (groups.find(g => g.id === groupId) || {}).section_key

  const handleAddItem = async (groupId, data) => {
    if (isMovieNote) {
      const sectionKey = getGroupSectionKey(groupId)
      await window.api.addMovie({ title: data.title, note: data.note || '', section: sectionKey, note_id: noteId })
    } else {
      await window.api.addItem(groupId, data)
    }
    setAddItemGroup(null)
    await reloadGroup(groupId)
  }

  const handleUpdateItem = async (id, data, groupId) => {
    if (isMovieNote) {
      await window.api.updateMovie(id, { title: data.title, note: data.note, poster_path: data.cover_url })
    } else {
      await window.api.updateItem(id, data)
    }
    setEditItem(null)
    await reloadGroup(groupId)
  }

  const handleDeleteItem = async (item) => {
    if (isMovieNote) {
      await window.api.deleteMovie(item.id)
    } else {
      await window.api.deleteItem(item.id)
    }
    await reloadGroup(item.group_id)
  }

  const handleMoveItem = async (itemId, toGroupId, insertIndex) => {
    if (isMovieNote) {
      const sectionKey = getGroupSectionKey(toGroupId)
      await window.api.moveMovie(itemId, sectionKey, insertIndex)
    } else {
      await window.api.moveItem(itemId, toGroupId, insertIndex)
    }
    await loadGroups()
  }

  const handleReorderItem = async (itemId, targetId, position, groupId) => {
    const items = itemsByGroup[groupId] || []
    const ids = items.map(i => i.id)
    const fromIdx = ids.indexOf(itemId)
    const targetIdx = ids.indexOf(targetId)
    if (fromIdx === -1) return
    ids.splice(fromIdx, 1)
    const insertIdx = position === 'before' ? targetIdx : targetIdx + 1
    ids.splice(Math.max(0, insertIdx), 0, itemId)
    if (isMovieNote) {
      const sectionKey = getGroupSectionKey(groupId)
      await window.api.reorderMovies(sectionKey, ids)
    } else {
      await window.api.reorderItems(groupId, ids)
    }
    await reloadGroup(groupId)
  }

  const handleItemCut = (item) => { setItemClipboard({ ...item, _cut: true }); setItemContextMenu(null) }
  const handleItemCopy = (item) => { setItemClipboard({ ...item, _cut: false }); setItemContextMenu(null) }
  const handleItemPaste = async (groupId) => {
    if (!itemClipboard) return
    if (isMovieNote) {
      const sectionKey = getGroupSectionKey(groupId)
      if (itemClipboard._cut) {
        await window.api.moveMovie(itemClipboard.id, sectionKey)
      } else {
        const m = itemClipboard._movie || itemClipboard
        await window.api.addMovie({ ...m, id: undefined, section: sectionKey, note_id: noteId })
      }
    } else {
      if (itemClipboard._cut) {
        await window.api.moveItem(itemClipboard.id, groupId)
      } else {
        const { id, _cut, group_id, ...data } = itemClipboard
        await window.api.addItem(groupId, data)
      }
    }
    setItemClipboard(null)
    setItemContextMenu(null)
    await loadGroups()
  }

  const handleGroupCut = (group) => { setGroupClipboard({ ...group, _cut: true }); setGroupContextMenu(null) }
  const handleGroupCopy = (group) => { setGroupClipboard({ ...group, _cut: false }); setGroupContextMenu(null) }
  const handleGroupPaste = async () => {
    if (!groupClipboard) return
    const result = await window.api.createGroup(noteId, groupClipboard.name)
    if (result?.error) { alert(result.error); return }
    if (groupClipboard._cut) await window.api.deleteGroup(groupClipboard.id)
    setGroupClipboard(null)
    setGroupContextMenu(null)
    await loadGroups()
  }

  const handleGroupDragStart = (groupId) => setDraggingGroupId(groupId)
  const handleGroupDragEnd = () => { setDraggingGroupId(null); groupDragOver.current = null }
  const handleGroupDragOverCol = (groupId) => {
    if (!draggingGroupId || draggingGroupId === groupId) return
    groupDragOver.current = groupId
    const ids = groups.map(g => g.id)
    const from = ids.indexOf(draggingGroupId)
    const to = ids.indexOf(groupId)
    if (from === -1 || to === -1) return
    const reordered = [...ids]
    reordered.splice(from, 1)
    reordered.splice(to, 0, draggingGroupId)
    setGroups(prev => {
      const map = Object.fromEntries(prev.map(g => [g.id, g]))
      return reordered.map(id => map[id]).filter(Boolean)
    })
  }
  const handleGroupDrop = async () => {
    if (!draggingGroupId) return
    const ids = groups.map(g => g.id)
    await window.api.reorderGroups(noteId, ids)
    setDraggingGroupId(null)
    groupDragOver.current = null
  }

  const maxReached = groups.length >= 5

  return (
    <div className="board" style={{ flex: 1 }}>
      {groups.map(group => (
        <NoteColumn
          key={group.id}
          group={group}
          items={itemsByGroup[group.id] || []}
          itemClipboard={itemClipboard}
          onAdd={() => setAddItemGroup(group.id)}
          renameSignal={renameGroupId === group.id}
          onRenameConsumed={() => setRenameGroupId(null)}
          onRename={() => setRenameGroupId(group.id)}
          onDelete={() => handleDeleteGroup(group)}
          onGroupContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setGroupContextMenu({ x: e.clientX, y: e.clientY, group }) }}
          onItemContextMenu={(e, item) => { e.preventDefault(); e.stopPropagation(); setItemContextMenu({ x: e.clientX, y: e.clientY, item }) }}
          onItemClick={(item) => setEditItem(item)}
          onMoveItem={handleMoveItem}
          onReorderItem={handleReorderItem}
          isDragging={draggingGroupId === group.id}
          onGroupDragStart={() => handleGroupDragStart(group.id)}
          onGroupDragEnd={handleGroupDragEnd}
          onGroupDragOver={() => handleGroupDragOverCol(group.id)}
          onGroupDrop={handleGroupDrop}
        />
      ))}

      {/* Create New Note Group kolonnasi */}
      {!maxReached && (
        <div
          onClick={() => setShowCreateGroup(true)}
          style={{
            width: 260, minWidth: 260,
            border: '1.5px dashed var(--border-hover)',
            borderRadius: 10, padding: '18px 14px',
            cursor: 'pointer', flexShrink: 0, alignSelf: 'flex-start',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            color: 'var(--text-muted)', transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.color = '#a78bfa' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <span style={{ fontSize: 18, fontWeight: 300 }}>+</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Create New Note Group</span>
        </div>
      )}

      {/* Modals */}
      {showCreateGroup && (
        <CreateGroupModal onClose={() => setShowCreateGroup(false)} onCreate={handleCreateGroup} creating={creatingGroup} />
      )}

      {addItemGroup && (
        <AddItemModal
          onClose={() => setAddItemGroup(null)}
          onSave={(data) => handleAddItem(addItemGroup, data)}
          note={note}
        />
      )}

      {editItem && (
        <EditItemModal
          item={editItem}
          note={note}
          onClose={() => setEditItem(null)}
          onSave={(data) => handleUpdateItem(editItem.id, data, editItem.group_id)}
          onDelete={() => { handleDeleteItem(editItem); setEditItem(null) }}
        />
      )}

      {itemContextMenu && (
        <CtxMenu
          x={itemContextMenu.x} y={itemContextMenu.y}
          items={[
            { label: 'Tahrirlash', icon: '✎', action: () => { setEditItem(itemContextMenu.item); setItemContextMenu(null) } },
            { label: 'Kesib olish', icon: '✂', action: () => handleItemCut(itemContextMenu.item) },
            { label: 'Nusxa olish', icon: '⎘', action: () => handleItemCopy(itemContextMenu.item) },
            itemClipboard && { label: 'Joylashtirish', icon: '⎗', action: () => handleItemPaste(itemContextMenu.item.group_id) },
            { label: "O'chirish", icon: '✕', action: () => { handleDeleteItem(itemContextMenu.item); setItemContextMenu(null) }, color: '#ef4444' },
          ].filter(Boolean)}
          onClose={() => setItemContextMenu(null)}
        />
      )}

      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          onConfirm={() => { confirmState.resolve(true); setConfirmState(null) }}
          onCancel={() => { confirmState.resolve(false); setConfirmState(null) }}
        />
      )}

      {groupContextMenu && (
        <CtxMenu
          x={groupContextMenu.x} y={groupContextMenu.y}
          items={[
            { label: 'Tahrirlash', icon: '✎', action: () => { setRenameGroupId(groupContextMenu.group.id); setGroupContextMenu(null) } },
            { label: 'Kesib olish', icon: '✂', action: () => handleGroupCut(groupContextMenu.group) },
            { label: 'Nusxa olish', icon: '⎘', action: () => handleGroupCopy(groupContextMenu.group) },
            groupClipboard && { label: 'Joylashtirish', icon: '⎗', action: handleGroupPaste },
            { label: "O'chirish", icon: '✕', action: () => { handleDeleteGroup(groupContextMenu.group); setGroupContextMenu(null) }, color: '#ef4444' },
          ].filter(Boolean)}
          onClose={() => setGroupContextMenu(null)}
        />
      )}
    </div>
  )
}

function NoteColumn({ group, items, itemClipboard, onAdd, renameSignal, onRenameConsumed, onRename, onDelete, onGroupContextMenu, onItemContextMenu, onItemClick, onMoveItem, onReorderItem, isDragging, onGroupDragStart, onGroupDragEnd, onGroupDragOver, onGroupDrop }) {
  const color = group.color || '#a78bfa'
  const bg = hexToRgba(color, 0.12)
  const border = hexToRgba(color, 0.3)
  const [dragMarker, setDragMarker] = useState(null)
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(group.name)
  const [headerHovered, setHeaderHovered] = useState(false)
  const cardsRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => { setNameVal(group.name) }, [group.name])

  useEffect(() => {
    if (renameSignal) {
      setEditingName(true)
      onRenameConsumed?.()
    }
  }, [renameSignal, onRenameConsumed])

  const updateMarker = useCallback((clientY) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const next = getDropPosition(items, clientY, cardsRef)
      setDragMarker(prev => (prev?.targetId === next.targetId && prev?.position === next.position) ? prev : next)
    })
  }, [items])

  const handleDragOver = (e) => {
    e.preventDefault()
    e.currentTarget.style.outline = `2px dashed ${color}`
    updateMarker(e.clientY)
  }
  const handleDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return
    e.currentTarget.style.outline = 'none'
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setDragMarker(null)
  }
  const handleDrop = async (e) => {
    e.preventDefault()
    e.currentTarget.style.outline = 'none'
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const itemId = parseInt(e.dataTransfer.getData('itemId'))
    const fromGroup = parseInt(e.dataTransfer.getData('fromGroup'))
    if (!itemId) { setDragMarker(null); return }
    const dropInfo = getDropPosition(items, e.clientY, cardsRef)
    if (fromGroup === group.id) {
      if (dropInfo.targetId != null) await onReorderItem(itemId, dropInfo.targetId, dropInfo.position, group.id)
    } else {
      await onMoveItem(itemId, group.id, dropInfo.insertIndex)
    }
    setDragMarker(null)
  }

  const handleRename = async () => {
    if (!nameVal.trim()) { setEditingName(false); return }
    await window.api.updateGroup(group.id, { name: nameVal.trim() })
    setEditingName(false)
  }

  const colBtnStyle = { background: 'transparent', border: 'none', borderRadius: 5, color: 'var(--text-muted)', width: 22, height: 22, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'color 0.12s, background 0.12s' }

  return (
    <div
      onDragOver={(e) => { if (e.dataTransfer.types.includes('groupdrag')) { e.preventDefault(); onGroupDragOver?.() } }}
      onDrop={(e) => { if (e.dataTransfer.types.includes('groupdrag')) { e.preventDefault(); onGroupDrop?.() } }}
      style={{ width: 280, minWidth: 280, maxWidth: 280, display: 'flex', flexDirection: 'column', background: '#111', borderRadius: 10, border: `1px solid ${isDragging ? color : 'var(--border)'}`, flexShrink: 0, opacity: isDragging ? 0.5 : 1, transition: 'opacity 0.15s, border-color 0.15s' }}
    >
      <div
        className="column-header-sticky"
        style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6, borderRadius: '10px 10px 0 0', borderTop: `3px solid ${color}`, background: '#111', flexShrink: 0 }}
        onContextMenu={onGroupContextMenu}
        onMouseEnter={() => setHeaderHovered(true)}
        onMouseLeave={() => setHeaderHovered(false)}
      >
        {/* Drag handle — faqat shu div ni drag qiladi */}
        <div
          draggable
          onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('groupDrag', group.id); onGroupDragStart?.() }}
          onDragEnd={onGroupDragEnd}
          title="Ushlab siljiting"
          style={{ cursor: 'grab', display: 'flex', flexDirection: 'column', gap: 2.5, padding: '4px 2px', flexShrink: 0, opacity: headerHovered ? 0.7 : 0.25, transition: 'opacity 0.15s' }}
        >
          {[0,1,2].map(i => <div key={i} style={{ width: 12, height: 2, background: color, borderRadius: 1 }} />)}
        </div>

        {editingName ? (
          <input
            autoFocus
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false) }}
            onBlur={handleRename}
            onMouseDown={e => e.stopPropagation()}
            draggable={false}
            style={{ background: 'transparent', border: 'none', borderBottom: `1px solid ${color}`, color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, outline: 'none', fontFamily: 'Space Grotesk', flex: 1, userSelect: 'text', cursor: 'text' }}
          />
        ) : (
          <span
            onDoubleClick={() => setEditingName(true)}
            style={{ background: bg, color, border: `1px solid ${border}`, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600, cursor: 'default', flexShrink: 0 }}
          >{group.name}</span>
        )}
        {!editingName && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{items.length}</span>}
        <div style={{ flex: 1 }} />

        {/* Inline tugmalar — hover da ko'rinadi, tahrirlashda yashiriladi */}
        {!editingName && <div style={{ display: 'flex', gap: 2, opacity: headerHovered ? 1 : 0, transition: 'opacity 0.15s', pointerEvents: headerHovered ? 'auto' : 'none' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setEditingName(true) }}
            title="Tahrirlash"
            style={colBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.color = color; e.currentTarget.style.background = bg }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
          >✎</button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.() }}
            title="O'chirish"
            style={colBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
          >✕</button>
        </div>}

        <button
          onClick={onAdd}
          style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: 6, color, width: 26, height: 26, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >+</button>
      </div>

      <div
        ref={cardsRef}
        className="column-cards"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 100, borderRadius: '0 0 10px 10px', transition: 'outline 0.1s' }}
      >
        {items.map(item => (
          <div key={item.id} data-item-id={item.id} style={{ position: 'relative' }}>
            {dragMarker?.targetId === item.id && dragMarker.position === 'before' && (
              <div style={{ position: 'absolute', top: -2, left: 0, right: 0, height: 3, background: color, borderRadius: 2, zIndex: 2, pointerEvents: 'none' }} />
            )}
            {item._movie ? (
              <div
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('itemId', String(item.id))
                  e.dataTransfer.setData('fromGroup', String(group.id))
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnd={(e) => { e.currentTarget.style.opacity = '1' }}
                style={{ userSelect: 'none' }}
              >
                <MovieCard
                  movie={item._movie}
                  sectionKey={group.section_key}
                  onContextMenu={(e) => onItemContextMenu(e, item)}
                  noDrag
                />
              </div>
            ) : (
              <NoteItemCard
                item={item}
                groupId={group.id}
                accentColor={color}
                onClick={() => onItemClick(item)}
                onContextMenu={(e) => onItemContextMenu(e, item)}
              />
            )}
            {dragMarker?.targetId === item.id && dragMarker.position === 'after' && (
              <div style={{ position: 'absolute', bottom: -2, left: 0, right: 0, height: 3, background: color, borderRadius: 2, zIndex: 2, pointerEvents: 'none' }} />
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '20px 0', opacity: 0.4 }}>Bo'sh — bu yerga tashlang</div>
        )}
      </div>
    </div>
  )
}

function NoteItemCard({ item, groupId, accentColor, onClick, onContextMenu }) {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('itemId', String(item.id))
    e.dataTransfer.setData('fromGroup', String(groupId))
    e.dataTransfer.effectAllowed = 'move'
    e.currentTarget.style.opacity = '0.5'
  }
  const handleDragEnd = (e) => { e.currentTarget.style.opacity = '1' }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onContextMenu={onContextMenu}
      onClick={onClick}
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '10px 12px',
        cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s, transform 0.15s',
        position: 'relative', overflow: 'hidden', userSelect: 'none',
        minHeight: 52,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {/* Cover xira background */}
      {item.cover_url && (
        <>
          <div style={{ position: 'absolute', right: 0, top: 0, width: 70, height: '100%', background: 'linear-gradient(to right, var(--bg-card) 0%, transparent 100%)', zIndex: 1 }} />
          <img src={item.cover_url} alt="" style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: 70, objectFit: 'cover', opacity: 0.15 }} />
        </>
      )}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 3 }}>{item.title}</div>
        {item.subtitle && (
          <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginBottom: 2 }}>{item.subtitle}</div>
        )}
        {item.note && (
          <div style={{ color: 'var(--text-muted)', fontSize: 11, fontStyle: 'italic', marginTop: 3 }}>{item.note}</div>
        )}
      </div>
    </div>
  )
}

function NoteItemModal({ item, note, onClose, onSave, onDelete, isEdit }) {
  const [title, setTitle] = useState(item?.title || '')
  const [subtitle, setSubtitle] = useState(item?.subtitle || '')
  const [coverUrl, setCoverUrl] = useState(item?.cover_url || '')
  const [noteText, setNoteText] = useState(item?.note || '')
  const noteType = note?.type || 'custom'
  const subtitlePlaceholder = {
    movie: 'Janr · Rejissyor (masalan: Action · Nolan)',
    books: 'Muallif · Yil (masalan: J.K. Rowling · 1997)',
    games: 'Janr · Yil (masalan: RPG · 2023)',
    travel: 'Mamlakat, shahar',
    custom: 'Muallif, joy, platforma...',
  }[noteType] || 'Muallif, joy, platforma...'
  const [animateOpen, setAnimateOpen] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [enrichResults, setEnrichResults] = useState([])
  const [enrichError, setEnrichError] = useState(null)
  const [showEnrich, setShowEnrich] = useState(false)
  const [enrichQuery, setEnrichQuery] = useState('')

  const handleEnrichSearch = async (q) => {
    const query = (q ?? enrichQuery ?? title).trim()
    if (!query || noteType === 'custom') return
    setEnriching(true)
    setEnrichError(null)
    setEnrichResults([])
    try {
      const res = await window.api.searchContent(noteType, query)
      if (res?.error) { setEnrichError(res.error); setEnriching(false); return }
      const arr = Array.isArray(res) ? res : []
      setEnrichResults(arr)
      if (!arr.length) setEnrichError('Natija topilmadi')
    } catch (e) { setEnrichError(e.message) }
    setEnriching(false)
  }

  const openEnrich = () => {
    setEnrichQuery(title.trim())
    setShowEnrich(v => {
      if (!v) { setTimeout(() => handleEnrichSearch(title.trim()), 0) }
      return !v
    })
  }

  const applyEnrich = (r) => {
    if (r.cover_url) setCoverUrl(r.cover_url)
    if (r.subtitle) setSubtitle(r.subtitle)
    setShowEnrich(false)
    setEnrichResults([])
  }

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimateOpen(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const handleClose = (e) => {
    e?.stopPropagation()
    setAnimateOpen(false)
    setTimeout(onClose, 240)
  }

  const handleSave = () => {
    if (!title.trim()) return
    onSave({ title: title.trim(), subtitle: subtitle.trim(), cover_url: coverUrl.trim() || null, note: noteText.trim() })
  }

  const modalH = `min(${Math.round(window.innerHeight * 0.67)}px, 90vh)`

  return ReactDOM.createPortal(
    <div
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: animateOpen ? 'rgba(4,4,4,0.85)' : 'rgba(4,4,4,0)',
        backdropFilter: animateOpen ? 'blur(16px)' : 'blur(0px)',
        WebkitBackdropFilter: animateOpen ? 'blur(16px)' : 'blur(0px)',
        transition: 'background 0.25s ease, backdrop-filter 0.25s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', width: 'min(820px, 92vw)', height: modalH,
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 24, padding: 24, overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20,
          opacity: animateOpen ? 1 : 0,
          transform: animateOpen ? 'scale(1) translateY(0)' : 'scale(0.93) translateY(24px)',
          transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease',
        }}
      >
        {/* Cover panel */}
        <div style={{
          borderRadius: 16, overflow: 'hidden', background: '#111', height: '100%',
          opacity: animateOpen ? 1 : 0.6,
          transform: animateOpen ? 'scale(1)' : 'scale(0.94)',
          transition: 'transform 0.3s ease 0.06s, opacity 0.3s ease 0.06s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {coverUrl ? (
            <img src={coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 16 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{note?.icon || '📝'}</div>
              Cover yo'q
            </div>
          )}
        </div>

        {/* Content panel */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 12,
          color: 'var(--text-primary)', overflowY: 'auto', paddingRight: 4,
          opacity: animateOpen ? 1 : 0,
          transform: animateOpen ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.28s ease 0.14s, transform 0.28s ease 0.14s',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Sarlavha..."
                style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 22, fontWeight: 700, outline: 'none', fontFamily: 'Space Grotesk', paddingBottom: 6, marginBottom: 8 }}
              />
              <input
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                placeholder={subtitlePlaceholder}
                style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 13, outline: 'none', fontFamily: 'Space Grotesk' }}
              />
            </div>
            <button onClick={handleClose} style={{ border: 'none', background: '#252525', color: '#aaa', width: 36, height: 36, borderRadius: 10, cursor: 'pointer', fontSize: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>

          <div>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              Cover URL
              {noteType !== 'custom' && (
                <button
                  onClick={openEnrich}
                  style={{ background: showEnrich ? 'rgba(124,58,237,0.25)' : 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 5, color: '#a78bfa', fontSize: 10, padding: '1px 7px', cursor: 'pointer', fontFamily: 'Space Grotesk' }}
                >{enriching ? '...' : '🔍 API dan qidirish'}</button>
              )}
            </div>
            {showEnrich && (
              <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, marginBottom: 6 }}>
                <div style={{ display: 'flex', gap: 6, padding: '6px 8px', borderBottom: '1px solid #1a1a1a' }}>
                  <input
                    autoFocus
                    value={enrichQuery}
                    onChange={e => setEnrichQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleEnrichSearch()}
                    placeholder="Inglizcha nom kiriting..."
                    style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', borderRadius: 5, padding: '4px 8px', color: '#efefef', fontSize: 11, outline: 'none', fontFamily: 'Space Grotesk' }}
                  />
                  <button onClick={() => handleEnrichSearch()} disabled={enriching} style={{ background: '#7c3aed', border: 'none', borderRadius: 5, color: 'white', padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontFamily: 'Space Grotesk' }}>{enriching ? '...' : 'Qidirish'}</button>
                </div>
                <div style={{ maxHeight: 130, overflowY: 'auto' }}>
                {enrichError && <div style={{ padding: '8px 12px', color: '#ef4444', fontSize: 11 }}>{enrichError}</div>}
                {enrichResults.map((r, i) => (
                  <div key={i} onClick={() => applyEnrich(r)}
                    style={{ display: 'flex', gap: 8, padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #1a1a1a', alignItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1a1a1a'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {r.cover_url && <img src={r.cover_url} alt="" style={{ width: 28, height: 38, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#efefef', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{r.title}</div>
                      {r.subtitle && <div style={{ fontSize: 10, color: '#888' }}>{r.subtitle}</div>}
                    </div>
                  </div>
                ))}
                </div>
              </div>
            )}
            <input
              value={coverUrl}
              onChange={e => setCoverUrl(e.target.value)}
              placeholder="https://..."
              style={{ width: '100%', background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 6, padding: '6px 10px', color: '#efefef', fontSize: 12, outline: 'none', fontFamily: 'Space Grotesk' }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>Izoh</div>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Qo'shimcha izohlar..."
              style={{ width: '100%', height: '100px', background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 6, padding: '8px 10px', color: '#efefef', fontSize: 12, outline: 'none', fontFamily: 'Space Grotesk', resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
            {isEdit && onDelete ? (
              <button onClick={onDelete} style={btnS('rgba(239,68,68,0.12)', '#ef4444')}>O'chirish</button>
            ) : <div />}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleClose} style={btnS('#222', '#888')}>Bekor</button>
              <button onClick={handleSave} disabled={!title.trim()} style={btnS('#7c3aed', 'white', !title.trim())}>Saqlash</button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function AddItemModal({ onClose, onSave, note }) {
  const noteType = note?.type || 'custom'
  const isSearchable = noteType !== 'custom'

  const [mode, setMode] = useState(isSearchable ? 'search' : 'manual')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [selected, setSelected] = useState(null)

  const typeLabel = { books: '📚 Kitob', travel: '✈️ Joy', games: '🎮 O\'yin', custom: '📝' }[noteType] || '📝'

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    setSearchError(null)
    setResults([])
    setSelected(null)
    const res = await window.api.searchContent(noteType, query.trim())
    setSearching(false)
    if (res?.error) { setSearchError(res.error); return }
    if (res?.redirect === 'use_tmdb') { setSearchError('Movie note uchun Movie note ichida qo\'shing'); return }
    setResults(Array.isArray(res) ? res : [])
  }

  const handleSelect = (r) => {
    setSelected(r)
  }

  const handleSaveSelected = () => {
    if (!selected) return
    onSave({
      title: selected.title,
      subtitle: selected.subtitle || '',
      cover_url: selected.cover_url || null,
      note: selected.note || '',
    })
  }

  if (mode === 'search') {
    return ReactDOM.createPortal(
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(4,4,4,0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{ width: 'min(680px, 92vw)', maxHeight: '85vh', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column' }}
        >
          {/* Header */}
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{typeLabel} qidirish</span>
            <div style={{ flex: 1 }} />
            <button onClick={() => setMode('manual')} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, padding: '3px 10px', fontFamily: 'Space Grotesk' }}>Qo'lda kiritish</button>
            <button onClick={onClose} style={{ background: '#252525', border: 'none', color: '#aaa', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>

          {/* Search bar */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder={`Nomi bo'yicha qidirish...`}
              style={{ flex: 1, background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#efefef', fontSize: 13, outline: 'none', fontFamily: 'Space Grotesk' }}
            />
            <button
              onClick={handleSearch}
              disabled={!query.trim() || searching}
              style={btnS('#7c3aed', 'white', !query.trim() || searching)}
            >
              {searching ? '...' : 'Qidirish'}
            </button>
          </div>

          {/* Results */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {searchError && (
              <div style={{ padding: '20px', color: '#ef4444', fontSize: 13, textAlign: 'center' }}>{searchError}</div>
            )}
            {!searchError && results.length === 0 && !searching && (
              <div style={{ padding: '32px 20px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
                Qidiruv natijasi bu yerda ko'rinadi
              </div>
            )}
            {results.map((r, i) => (
              <div
                key={i}
                onClick={() => handleSelect(r)}
                style={{
                  display: 'flex', gap: 12, padding: '12px 20px',
                  cursor: 'pointer', borderBottom: '1px solid #1a1a1a',
                  background: selected === r ? 'rgba(124,58,237,0.1)' : 'transparent',
                  borderLeft: selected === r ? '3px solid #7c3aed' : '3px solid transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (selected !== r) e.currentTarget.style.background = '#1a1a1a' }}
                onMouseLeave={e => { if (selected !== r) e.currentTarget.style.background = 'transparent' }}
              >
                {/* Cover */}
                <div style={{ width: 48, height: 64, borderRadius: 6, overflow: 'hidden', background: '#111', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {r.cover_url ? (
                    <img src={r.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 20 }}>{note?.icon || '📝'}</span>
                  )}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                  {r.subtitle && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{r.subtitle}</div>}
                  {r.year && !r.subtitle?.includes(r.year) && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.year}</div>}
                  {r.note && <div style={{ fontSize: 11, color: '#444', marginTop: 3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.note}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          {selected && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(124,58,237,0.06)', flexShrink: 0 }}>
              <div style={{ flex: 1, fontSize: 12, color: '#a78bfa', fontWeight: 600 }}>✓ {selected.title}</div>
              <button onClick={handleSaveSelected} style={btnS('#7c3aed', 'white')}>Qo'shish</button>
            </div>
          )}
        </div>
      </div>,
      document.body
    )
  }

  return <NoteItemModal item={null} note={note} onClose={onClose} onSave={onSave} isEdit={false} />
}

function EditItemModal({ item, note, onClose, onSave, onDelete }) {
  return <NoteItemModal item={item} note={note} onClose={onClose} onSave={onSave} onDelete={onDelete} isEdit />
}

function CreateGroupModal({ onClose, onCreate, creating }) {
  const [name, setName] = useState('')
  return (
    <Modal title="+ Create New Note Group" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>Group nomi *</div>
          <input
            autoFocus value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onCreate(name)}
            placeholder="Masalan: Reading, Completed, Wishlist..."
            style={{ width: '100%', background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 7, padding: '8px 12px', color: '#efefef', fontSize: 13, outline: 'none', fontFamily: 'Space Grotesk' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={btnS('#222', '#888')}>Bekor</button>
          <button onClick={() => onCreate(name)} disabled={!name.trim() || creating} style={btnS('#7c3aed', 'white', !name.trim() || creating)}>
            {creating ? 'Yaratilmoqda...' : 'Yaratish'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function CtxMenu({ x, y, items, onClose }) {
  return (
    <div
      style={{ position: 'fixed', left: Math.min(x, window.innerWidth - 190), top: Math.min(y, window.innerHeight - 220), zIndex: 9999, background: '#1e1e1e', border: '1px solid #333', borderRadius: 8, padding: '4px 0', minWidth: 175, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
      onClick={e => e.stopPropagation()}
    >
      {items.map((item, i) => (
        <div
          key={i}
          style={{ padding: '7px 16px', cursor: 'pointer', color: item.color || 'var(--text-primary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}
          onMouseEnter={e => e.currentTarget.style.background = '#2a2a2a'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          onClick={() => { item.action(); onClose() }}
        >
          <span style={{ opacity: 0.6, fontSize: 12 }}>{item.icon}</span>
          {item.label}
        </div>
      ))}
    </div>
  )
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onCancel}
    >
      <div style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: 14, padding: '28px 28px 20px', minWidth: 320, maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: 24 }}>{message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onCancel}
            style={{ background: 'transparent', border: '1px solid #333', borderRadius: 8, color: 'var(--text-muted)', padding: '8px 20px', cursor: 'pointer', fontSize: 13, fontFamily: 'Space Grotesk' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#555'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#333'}
          >Bekor qilish</button>
          <button onClick={onConfirm}
            style={{ background: '#ef4444', border: 'none', borderRadius: 8, color: '#fff', padding: '8px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Space Grotesk' }}
            onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
            onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}
          >O'chirish</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function btnS(bg, color, disabled) {
  return {
    background: bg, color, border: 'none', borderRadius: 7,
    padding: '8px 18px', cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 13, fontWeight: 500, fontFamily: 'Space Grotesk',
    opacity: disabled ? 0.4 : 1,
  }
}

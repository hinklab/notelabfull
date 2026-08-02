import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react'
import ReactDOM from 'react-dom'
import { Modal } from '../modals/SettingsModal.jsx'
import MovieCard from '../cards/MovieCard.jsx'
import { Pencil, X, Plus, Scissors, Copy, Clipboard, ArrowRight, AlignJustify, Trash2, ImageOff, Check, Clock, ListTodo, Play, CheckCircle } from 'lucide-react'

function hexToRgba(hex, alpha) {
  if (!hex || hex.length < 7) return `rgba(124,58,237,${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function getDropPosition(items, clientY, containerRef, prevMarker = null) {
  if (!containerRef.current || items.length === 0) return { targetId: null, position: 'after', insertIndex: 0 }
  const cardEls = Array.from(containerRef.current.querySelectorAll('[data-item-id]'))
  if (cardEls.length === 0) return { targetId: null, position: 'after', insertIndex: 0 }

  let bestIndex = 0
  let minDistance = Infinity
  let isBefore = true

  cardEls.forEach((el, index) => {
    const rect = el.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const distance = Math.abs(clientY - midY)

    if (distance < minDistance) {
      minDistance = distance
      bestIndex = index
      
      // Hysteresis dead-zone: if clientY is within 6px of midpoint and we have a previous marker position, preserve previous position to prevent flickering
      if (prevMarker && Math.abs(clientY - midY) < 6 && String(prevMarker.targetId) === String(el.dataset.itemId)) {
        isBefore = prevMarker.position === 'before'
      } else {
        isBefore = clientY < midY
      }
    }
  })

  const targetEl = cardEls[bestIndex]
  const targetId = String(targetEl.dataset.itemId)
  const position = isBefore ? 'before' : 'after'

  const idx = items.findIndex(i => String(i.id) === targetId)
  const insertIndex = Math.max(0, position === 'before' ? idx : idx + 1)

  return { targetId, position, insertIndex }
}

export default function NoteBoard({ note, refreshTrigger, search = '' }) {
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
  const boardCardPositionsRef = useRef(new Map())

  const snapshotAllCardPositions = useCallback(() => {
    const cardEls = Array.from(document.querySelectorAll('[data-item-id]'))
      .filter(el => el.offsetParent !== null && el.getBoundingClientRect().width > 0)
    const posMap = new Map()
    cardEls.forEach(el => {
      const id = String(el.dataset.itemId)
      posMap.set(id, el.getBoundingClientRect())
    })
    console.log('[FLIP Snapshot] Captured visible positions count:', posMap.size)
    boardCardPositionsRef.current = posMap
  }, [])

  // Board-level FLIP Layout Sliding Animation for Cross-Column and In-Column Moves
  useLayoutEffect(() => {
    console.log('[FLIP effect] fired at', performance.now())
    const firstPositions = boardCardPositionsRef.current
    if (!firstPositions || firstPositions.size === 0) return

    const cardElements = Array.from(document.querySelectorAll('[data-item-id]'))
      .filter(el => el.offsetParent !== null && el.getBoundingClientRect().width > 0)

    cardElements.forEach(el => {
      const id = String(el.dataset.itemId)
      const rect = el.getBoundingClientRect()

      if (firstPositions.has(id)) {
        const firstRect = firstPositions.get(id)
        const deltaX = firstRect.left - rect.left
        const deltaY = firstRect.top - rect.top

        // If card moved across columns (deltaX > 50px), animate cleanly inside its new column to avoid CSS container clipping
        const isCrossColumnMove = Math.abs(deltaX) > 50

        if (isCrossColumnMove) {
          // Cross-column entering card: scale & fade in smoothly inside destination column
          el.style.transform = 'translate3d(0, -16px, 0) scale(0.94)'
          el.style.opacity = '0'
          el.style.transition = 'none'

          void el.offsetHeight

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              el.style.transition = 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease'
              el.style.transform = 'translate3d(0, 0, 0) scale(1)'
              el.style.opacity = '1'
            })
          })
        } else if (Math.abs(deltaY) > 1) {
          // Within-column shift (cards sliding up in source column, or sliding down in destination column)
          el.style.transform = `translate3d(0, ${deltaY}px, 0)`
          el.style.transition = 'none'

          void el.offsetHeight

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              el.style.transition = 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)'
              el.style.transform = 'translate3d(0, 0, 0)'
            })
          })
        }
      } else {
        // Brand new item entering board
        el.style.transform = 'translate3d(0, -16px, 0) scale(0.94)'
        el.style.opacity = '0'
        el.style.transition = 'none'

        void el.offsetHeight

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            el.style.transition = 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease'
            el.style.transform = 'translate3d(0, 0, 0) scale(1)'
            el.style.opacity = '1'
          })
        })
      }
    })

    // Clear snapshot after animation triggers
    boardCardPositionsRef.current = new Map()
  }, [itemsByGroup])

  const showConfirm = (message) => new Promise(resolve => {
    setConfirmState({ message, resolve })
  })

  const noteId = note?.id ?? null
  const isMovieNote = note?.is_movie === true || note?.type === 'movie' || true

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
    const tempId = 'temp_' + Date.now()
    const sectionKey = getGroupSectionKey(groupId)

    // 1. Optimistic UI update: render new card instantly!
    const tempItem = isMovieNote ? {
      id: tempId,
      title: data.title,
      section: sectionKey,
      note_id: noteId,
      poster_path: data.poster_path || data.cover_url || null,
      rating: data.rating || null,
      vote_count: data.vote_count || 0,
      genre: data.genre || '-',
      director: data.director || '-',
      overview: data.overview || '',
      release_year: data.release_year || '-',
      media_type: data.media_type || 'movie',
      position: 0,
      _movie: {
        id: tempId,
        title: data.title,
        section: sectionKey,
        poster_path: data.poster_path || data.cover_url || null,
        rating: data.rating || null,
        vote_count: data.vote_count || 0,
        genre: data.genre || '-',
        director: data.director || '-',
        overview: data.overview || '',
        release_year: data.release_year || '-',
        media_type: data.media_type || 'movie',
      }
    } : {
      id: tempId,
      group_id: groupId,
      title: data.title,
      subtitle: data.subtitle || '',
      cover_url: data.cover_url || null,
      note: data.note || '',
      position: 0,
    }

    setItemsByGroup(prev => ({
      ...prev,
      [groupId]: [tempItem, ...(prev[groupId] || [])]
    }))
    setAddItemGroup(null)

    // 2. Perform API call in background and replace temp item
    try {
      if (isMovieNote) {
        await window.api.addMovie({
          title: data.title,
          release_date: data.release_date || null,
          release_year: data.release_year || '-',
          rating: data.rating || null,
          vote_count: data.vote_count || 0,
          poster_path: data.poster_path || data.cover_url || null,
          genre: data.genre || '-',
          director: data.director || '-',
          tmdb_id: data.tmdb_id || null,
          imdb_id: data.imdb_id || null,
          media_type: data.media_type || null,
          note: data.note || '',
          section: sectionKey,
          note_id: noteId,
        })
      } else {
        await window.api.addItem(groupId, data)
      }
      await reloadGroup(groupId)
    } catch (err) {
      console.error('Failed to add item:', err)
      await reloadGroup(groupId)
    }
  }

  const handleUpdateItem = async (id, data, groupId) => {
    // 1. Optimistic UI update
    setItemsByGroup(prev => {
      const list = [...(prev[groupId] || [])]
      const idx = list.findIndex(i => i.id === id)
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          title: data.title !== undefined ? data.title : list[idx].title,
          note: data.note !== undefined ? data.note : list[idx].note,
          cover_url: data.cover_url !== undefined ? data.cover_url : list[idx].cover_url,
          poster_path: data.cover_url !== undefined ? data.cover_url : list[idx].poster_path,
          _movie: list[idx]._movie ? {
            ...list[idx]._movie,
            title: data.title !== undefined ? data.title : list[idx]._movie.title,
            note: data.note !== undefined ? data.note : list[idx]._movie.note,
            poster_path: data.cover_url !== undefined ? data.cover_url : list[idx]._movie.poster_path,
          } : null
        }
      }
      return { ...prev, [groupId]: list }
    })
    setEditItem(null)

    // 2. Perform API call in background
    try {
      if (isMovieNote) {
        await window.api.updateMovie(id, { title: data.title, note: data.note, poster_path: data.cover_url })
      } else {
        await window.api.updateItem(id, data)
      }
    } catch (err) {
      console.error('Failed to update item:', err)
      await reloadGroup(groupId)
    }
  }

  const handleDeleteItem = async (item) => {
    const groupId = item.group_id || (isMovieNote ? (groups.find(g => g.section_key === item.section) || {}).id : null)

    // 1. Optimistic UI update: remove card instantly
    if (groupId) {
      setItemsByGroup(prev => ({
        ...prev,
        [groupId]: (prev[groupId] || []).filter(i => i.id !== item.id)
      }))
    }
    setEditItem(null)

    // 2. Perform API call in background
    try {
      if (isMovieNote) {
        await window.api.deleteMovie(item.id)
      } else {
        await window.api.deleteItem(item.id)
      }
    } catch (err) {
      console.error('Failed to delete item:', err)
      if (groupId) await reloadGroup(groupId)
    }
  }

  const handleMoveItem = async (itemId, toGroupId, insertIndex) => {
    // Capture pre-move positions of ALL cards across entire board for smooth cross-column FLIP animation
    snapshotAllCardPositions()

    // 1. Optimistic UI update: move item instantly in local state
    let fromGroupId = null
    Object.keys(itemsByGroup).forEach(gId => {
      if ((itemsByGroup[gId] || []).some(item => String(item.id) === String(itemId))) {
        fromGroupId = gId
      }
    })

    if (fromGroupId) {
      setItemsByGroup(prev => {
        const sourceItems = [...(prev[fromGroupId] || [])]
        const targetItems = String(fromGroupId) === String(toGroupId) ? sourceItems : [...(prev[toGroupId] || [])]

        const itemIdx = sourceItems.findIndex(i => String(i.id) === String(itemId))
        if (itemIdx === -1) return prev
        const [movedItem] = sourceItems.splice(itemIdx, 1)

        const safeIndex = insertIndex != null ? Math.min(insertIndex, targetItems.length) : targetItems.length
        targetItems.splice(Math.max(0, safeIndex), 0, movedItem)

        return {
          ...prev,
          [fromGroupId]: sourceItems,
          [toGroupId]: targetItems,
        }
      })
    }

    // 2. Perform API call in background
    try {
      if (isMovieNote) {
        const targetGroup = groups.find(g => String(g.id) === String(toGroupId))
        const sectionKey = targetGroup?.section_key || (String(toGroupId) === '1' ? 'futured' : String(toGroupId) === '2' ? 'todo' : String(toGroupId) === '3' ? 'doing' : 'done')
        await window.api.moveMovie(itemId, sectionKey, insertIndex)
      } else {
        await window.api.moveItem(itemId, toGroupId, insertIndex)
      }
    } catch (err) {
      console.error('Failed to move item:', err)
      await loadGroups()
    }
  }

  const handleReorderItem = async (itemId, targetId, position, groupId) => {
    snapshotAllCardPositions()
    const items = itemsByGroup[groupId] || []
    const ids = items.map(i => i.id)
    const fromIdx = ids.findIndex(id => String(id) === String(itemId))
    const targetIdx = ids.findIndex(id => String(id) === String(targetId))
    if (fromIdx === -1) return

    // 1. Optimistic UI update
    setItemsByGroup(prev => {
      const currentList = [...(prev[groupId] || [])]
      const from = currentList.findIndex(i => String(i.id) === String(itemId))
      const target = currentList.findIndex(i => String(i.id) === String(targetId))
      if (from === -1 || target === -1) return prev

      const [moved] = currentList.splice(from, 1)
      const insertIdx = position === 'before' ? target : target + 1
      currentList.splice(Math.max(0, insertIdx), 0, moved)

      return { ...prev, [groupId]: currentList }
    })

    // 2. Perform API call in background
    try {
      ids.splice(fromIdx, 1)
      const insertIdx = position === 'before' ? targetIdx : targetIdx + 1
      ids.splice(Math.max(0, insertIdx), 0, itemId)

      if (isMovieNote) {
        const targetGroup = groups.find(g => String(g.id) === String(groupId))
        const sectionKey = targetGroup?.section_key || (String(groupId) === '1' ? 'futured' : String(groupId) === '2' ? 'todo' : String(groupId) === '3' ? 'doing' : 'done')
        await window.api.reorderMovies(sectionKey, ids)
      } else {
        await window.api.reorderItems(groupId, ids)
      }
    } catch (err) {
      console.error('Failed to reorder item:', err)
      await reloadGroup(groupId)
    }
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

  // Responsive: detect compact/mobile mode
  const boardRef = useRef(null)
  const [isCompact, setIsCompact] = useState(false)
  const [activeSection, setActiveSection] = useState(null)

  useEffect(() => {
    const el = boardRef.current?.parentElement || boardRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setIsCompact(entry.contentRect.width < 700)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // When compact mode activates, default to the first section
  useEffect(() => {
    if (isCompact && groups.length > 0 && !activeSection) {
      setActiveSection(groups[0].section_key)
    }
  }, [isCompact, groups, activeSection])

  const SIDEBAR_ICONS = { futured: Clock, todo: ListTodo, doing: Play, done: CheckCircle }

  const filteredItemsByGroup = useMemo(() => {
    const q = (search || '').trim().toLowerCase()
    if (!q) return itemsByGroup

    const result = {}
    for (const [groupId, items] of Object.entries(itemsByGroup)) {
      result[groupId] = (items || []).filter(item => {
        const title = (item.title || '').toLowerCase()
        const subtitle = (item.subtitle || '').toLowerCase()
        const noteText = (item.note || '').toLowerCase()
        const director = (item._movie?.director || '').toLowerCase()
        const genre = (item._movie?.genre || '').toLowerCase()
        return (
          title.includes(q) ||
          subtitle.includes(q) ||
          noteText.includes(q) ||
          director.includes(q) ||
          genre.includes(q)
        )
      })
    }
    return result
  }, [itemsByGroup, search])

  const renderColumn = (group) => (
    <NoteColumn
      key={group.id}
      group={group}
      items={filteredItemsByGroup[group.id] || []}
      boardCardPositionsRef={boardCardPositionsRef}
      itemClipboard={itemClipboard}
      onAdd={() => setAddItemGroup(group.id)}
      renameSignal={renameGroupId === group.id}
      onRenameConsumed={() => setRenameGroupId(null)}
      onRename={() => setRenameGroupId(group.id)}
      onDelete={() => handleDeleteGroup(group)}
      onItemContextMenu={(e, item) => { e.preventDefault(); e.stopPropagation(); setItemContextMenu({ x: e.clientX, y: e.clientY, item }) }}
      onItemClick={(item) => setEditItem(item)}
      onItemDelete={(item) => handleDeleteItem(item)}
      onMoveItem={handleMoveItem}
      onReorderItem={handleReorderItem}
      isDragging={draggingGroupId === group.id}
      onGroupDragStart={() => handleGroupDragStart(group.id)}
      onGroupDragEnd={handleGroupDragEnd}
      onGroupDragOver={() => handleGroupDragOverCol(group.id)}
      onGroupDrop={handleGroupDrop}
    />
  )

  const activeGroup = isCompact ? groups.find(g => g.section_key === activeSection) : null

  return (
    <div ref={boardRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {isCompact ? (
        <div className="board-responsive">
          {/* Sidebar */}
          <div className="board-sidebar">
            {groups.map(group => {
              const Icon = SIDEBAR_ICONS[group.section_key] || ListTodo
              const label = group.name
              const count = (filteredItemsByGroup[group.id] || []).length
              const isActive = activeSection === group.section_key
              return (
                <button
                  key={group.id}
                  className={`board-sidebar-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveSection(group.section_key)}
                  style={isActive ? { borderLeft: `3px solid ${group.color || '#a78bfa'}` } : {}}
                >
                  <div className="sidebar-dot" style={{ background: group.color || '#a78bfa' }} />
                  <Icon size={18} />
                  <span style={{ fontSize: 8, lineHeight: 1, marginTop: 1 }}>{label}</span>
                  <span className="sidebar-count">{count}</span>
                </button>
              )
            })}
          </div>
          {/* Main column */}
          <div className="board-mobile-main" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {activeGroup && renderColumn(activeGroup)}
          </div>
        </div>
      ) : (
        <div className="board">
          {groups.map(group => renderColumn(group))}
        </div>
      )}

      {/* Modals */}

      {addItemGroup && (
        <AddItemModal
          onClose={() => setAddItemGroup(null)}
          onSave={(data) => handleAddItem(addItemGroup, data)}
          note={note}
          existingMovies={isMovieNote ? Object.values(itemsByGroup).flat().map(i => i._movie).filter(Boolean) : []}
          groups={groups}
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
            { label: 'Tahrirlash', Icon: Pencil, action: () => { setEditItem(itemContextMenu.item); setItemContextMenu(null) } },
            { label: 'Kesib olish', Icon: Scissors, action: () => handleItemCut(itemContextMenu.item) },
            { label: 'Nusxa olish', Icon: Copy, action: () => handleItemCopy(itemContextMenu.item) },
            itemClipboard && { label: 'Joylashtirish', Icon: Clipboard, action: () => handleItemPaste(itemContextMenu.item.group_id) },
            { label: "O'chirish", Icon: X, action: () => { handleDeleteItem(itemContextMenu.item); setItemContextMenu(null) }, color: '#ef4444' },
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
            { label: 'Tahrirlash', Icon: Pencil, action: () => { setRenameGroupId(groupContextMenu.group.id); setGroupContextMenu(null) } },
            { label: 'Kesib olish', Icon: Scissors, action: () => handleGroupCut(groupContextMenu.group) },
            { label: 'Nusxa olish', Icon: Copy, action: () => handleGroupCopy(groupContextMenu.group) },
            groupClipboard && { label: 'Joylashtirish', Icon: Clipboard, action: handleGroupPaste },
            { label: "O'chirish", Icon: X, action: () => { handleDeleteGroup(groupContextMenu.group); setGroupContextMenu(null) }, color: '#ef4444' },
          ].filter(Boolean)}
          onClose={() => setGroupContextMenu(null)}
        />
      )}
    </div>
  )
}

function NoteColumn({ group, items, boardCardPositionsRef, itemClipboard, onAdd, renameSignal, onRenameConsumed, onRename, onDelete, onGroupContextMenu, onItemContextMenu, onItemClick, onItemDelete, onMoveItem, onReorderItem, isDragging, onGroupDragStart, onGroupDragEnd, onGroupDragOver, onGroupDrop }) {
  const color = group.color || '#a78bfa'
  const bg = hexToRgba(color, 0.12)
  const border = hexToRgba(color, 0.3)
  const [dragMarker, setDragMarker] = useState(null)
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(group.name)
  const [headerHovered, setHeaderHovered] = useState(false)
  const cardsRef = useRef(null)
  const rafRef = useRef(null)
  const prevItemsKeyRef = useRef('')
  const prevPositionsRef = useRef(new Map())

  // FLIP Layout Sliding Animation: when items move or shift, cards below smoothly slide up into place
  useLayoutEffect(() => {
    const container = cardsRef.current
    if (!container) return

    const cardElements = Array.from(container.querySelectorAll('[data-item-id]'))
    const currentItemsKey = items.map(i => String(i.id)).join(',')
    const hasItemChanges = currentItemsKey !== prevItemsKeyRef.current

    if (hasItemChanges && prevItemsKeyRef.current !== '') {
      const firstPositions = (boardCardPositionsRef && boardCardPositionsRef.current && boardCardPositionsRef.current.size > 0)
        ? boardCardPositionsRef.current
        : prevPositionsRef.current

      cardElements.forEach(el => {
        const id = String(el.dataset.itemId)
        const rect = el.getBoundingClientRect()

        if (firstPositions && firstPositions.has(id)) {
          const firstRect = firstPositions.get(id)
          const deltaY = firstRect.top - rect.top
          const deltaX = firstRect.left - rect.left
          if (Math.abs(deltaY) > 1 || Math.abs(deltaX) > 1) {
            el.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`
            el.style.transition = 'none'

            void el.offsetHeight

            requestAnimationFrame(() => {
              el.style.transition = 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)'
              el.style.transform = 'translate3d(0, 0, 0)'
            })
          }
        } else {
          // New item entering column: slide & scale in
          el.style.transform = 'translate3d(0, -16px, 0) scale(0.94)'
          el.style.opacity = '0'
          el.style.transition = 'none'

          void el.offsetHeight

          requestAnimationFrame(() => {
            el.style.transition = 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease'
            el.style.transform = 'translate3d(0, 0, 0) scale(1)'
            el.style.opacity = '1'
          })
        }
      })
    }

    prevItemsKeyRef.current = currentItemsKey

    // Snapshot card positions for local fallback and next update
    const newPositions = new Map(prevPositionsRef.current)
    cardElements.forEach(el => {
      newPositions.set(String(el.dataset.itemId), el.getBoundingClientRect())
    })
    prevPositionsRef.current = newPositions
  }, [items, boardCardPositionsRef])

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
      setDragMarker(prev => {
        const next = getDropPosition(items, clientY, cardsRef, prev)
        return (prev?.targetId === next.targetId && prev?.position === next.position) ? prev : next
      })
    })
  }, [items])

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (cardsRef.current) cardsRef.current.style.outline = `2px dashed ${color}`
    updateMarker(e.clientY)
  }
  const handleDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return
    if (cardsRef.current) cardsRef.current.style.outline = 'none'
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setDragMarker(null)
  }
  const handleDrop = async (e) => {
    e.preventDefault()
    if (cardsRef.current) cardsRef.current.style.outline = 'none'
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    // Instantly hide marker visually without triggering React state re-render
    const markerEls = cardsRef.current?.querySelectorAll('.drag-marker-line')
    markerEls?.forEach(m => { m.style.opacity = '0'; m.style.display = 'none' })

    const rawItemId = e.dataTransfer.getData('itemId')
    const rawFromGroup = e.dataTransfer.getData('fromGroup')
    if (!rawItemId) {
      setTimeout(() => setDragMarker(null), 0)
      return
    }
    const dropInfo = getDropPosition(items, e.clientY, cardsRef)
    if (String(rawFromGroup) === String(group.id)) {
      if (dropInfo.targetId != null) await onReorderItem(rawItemId, dropInfo.targetId, dropInfo.position, group.id)
    } else {
      await onMoveItem(rawItemId, group.id, dropInfo.insertIndex)
    }

    // Delay React state clear by 340ms so state re-render fires AFTER 320ms FLIP animation completes
    setTimeout(() => setDragMarker(null), 340)
  }

  const handleRename = async () => {
    if (!nameVal.trim()) { setEditingName(false); return }
    await window.api.updateGroup(group.id, { name: nameVal.trim() })
    setEditingName(false)
  }
  const handleTouchDragMove = (item, clientX, clientY) => {
    const dropInfo = getDropPosition(items, clientY, cardsRef)
    updateMarker(clientY)
  }

  const handleTouchDragEnd = async (item, clientX, clientY) => {
    // Instantly hide marker visually
    const markerEls = cardsRef.current?.querySelectorAll('.drag-marker-line')
    markerEls?.forEach(m => { m.style.opacity = '0'; m.style.display = 'none' })

    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const el = document.elementFromPoint(clientX, clientY)
    const colEl = el?.closest('.note-column')
    const targetGroupId = colEl?.dataset?.groupId || group.id

    const dropInfo = getDropPosition(items, clientY, cardsRef)

    if (String(targetGroupId) === String(group.id)) {
      if (dropInfo.targetId != null) {
        await onReorderItem(item.id, dropInfo.targetId, dropInfo.position, group.id)
      }
    } else {
      await onMoveItem(item.id, targetGroupId, dropInfo.insertIndex)
    }

    // Delay React state clear by 340ms
    setTimeout(() => setDragMarker(null), 340)
  }

  const colBtnStyle = { background: 'transparent', border: 'none', borderRadius: 5, color: 'var(--text-muted)', width: 22, height: 22, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'color 0.12s, background 0.12s' }

  return (
    <div
      data-group-id={group.id}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('groupdrag')) {
          e.preventDefault()
          onGroupDragOver?.()
        } else {
          handleDragOver(e)
        }
      }}
      onDragLeave={handleDragLeave}
      onDrop={(e) => {
        if (e.dataTransfer.types.includes('groupdrag')) {
          e.preventDefault()
          onGroupDrop?.()
        } else {
          handleDrop(e)
        }
      }}
      className="note-column"
      style={{ background: 'var(--bg-surface)', borderRadius: 10, border: `1px solid ${isDragging ? color : 'var(--border)'}`, flexShrink: 0, opacity: isDragging ? 0.5 : 1, transition: 'opacity 0.15s, border-color 0.15s' }}
    >
      <div
        className="column-header-sticky"
        style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6, borderRadius: '10px 10px 0 0', borderTop: `3px solid ${color}`, background: 'var(--bg-surface)', flexShrink: 0 }}
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
            style={{ background: 'transparent', border: 'none', borderBottom: `1px solid ${color}`, color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, outline: 'none', fontFamily: 'inherit', flex: 1, userSelect: 'text', cursor: 'text' }}
          />
        ) : (
          <span
            onDoubleClick={() => setEditingName(true)}
            style={{ background: bg, color, border: `1px solid ${border}`, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600, cursor: 'default', flexShrink: 0 }}
          >{group.name}</span>
        )}
        {!editingName && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{items.length}</span>}
        {/* Fixed system columns — no edit/delete buttons needed */}
        <div style={{ flex: 1 }} />

        <button
          onClick={onAdd}
          title="Film qo'shish"
          style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: 6, color, width: 26, height: 26, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        ><Plus size={14} /></button>
      </div>

      <div
        ref={cardsRef}
        className="column-cards"
        style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 100, borderRadius: '0 0 10px 10px', transition: 'outline 0.1s' }}
      >
        {items.map(item => (
          <div key={item.id} data-item-id={item.id} style={{ position: 'relative' }}>
            {dragMarker?.targetId === item.id && dragMarker.position === 'before' && (
              <div className="drag-marker-line" style={{ position: 'absolute', top: -2, left: 0, right: 0, height: 3, background: color, borderRadius: 2, zIndex: 2, pointerEvents: 'none' }} />
            )}
            {item._movie ? (
              <MovieCard
                movie={item._movie}
                sectionKey={group.section_key}
                onContextMenu={(e) => onItemContextMenu(e, item)}
                onDelete={() => onItemDelete?.(item)}
                onDragStart={(e) => {
                  e.dataTransfer.setData('itemId', String(item.id))
                  e.dataTransfer.setData('fromGroup', String(group.id))
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onTouchDragMove={(movie, x, y) => handleTouchDragMove(item, x, y)}
                onTouchDragEnd={(movie, x, y) => handleTouchDragEnd(item, x, y)}
              />
            ) : (
              <NoteItemCard
                item={item}
                groupId={group.id}
                accentColor={color}
                onClick={() => onItemClick(item)}
                onContextMenu={(e) => onItemContextMenu(e, item)}
                onTouchDragMove={(itm, x, y) => handleTouchDragMove(item, x, y)}
                onTouchDragEnd={(itm, x, y) => handleTouchDragEnd(item, x, y)}
              />
            )}
            {dragMarker?.targetId === item.id && dragMarker.position === 'after' && (
              <div className="drag-marker-line" style={{ position: 'absolute', bottom: -2, left: 0, right: 0, height: 3, background: color, borderRadius: 2, zIndex: 2, pointerEvents: 'none' }} />
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

function NoteItemCard({ item, groupId, accentColor, onClick, onContextMenu, onTouchDragStart, onTouchDragMove, onTouchDragEnd }) {
  const [isTouchDragging, setIsTouchDragging] = useState(false)
  const [touchDelta, setTouchDelta] = useState({ x: 0, y: 0 })
  const touchStartPos = useRef({ x: 0, y: 0, time: 0 })
  const lastTapTimeRef = useRef(0)
  const contextTimerRef = useRef(null)
  const isTouchDraggingRef = useRef(false)
  const contextOpenedRef = useRef(false)

  const clearTimers = () => {
    if (contextTimerRef.current) { clearTimeout(contextTimerRef.current); contextTimerRef.current = null }
  }

  const handleDragStart = (e) => {
    e.dataTransfer.setData('itemId', String(item.id))
    e.dataTransfer.setData('fromGroup', String(groupId))
    e.dataTransfer.effectAllowed = 'move'
    const el = e.currentTarget
    setTimeout(() => {
      if (el) el.style.opacity = '0'
    }, 0)
  }
  const handleDragEnd = (e) => { if (e.currentTarget) e.currentTarget.style.opacity = '1' }

  const handleTouchStart = (e) => {
    const touch = e.touches[0]
    touchStartPos.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
    isTouchDraggingRef.current = false
    contextOpenedRef.current = false
    setTouchDelta({ x: 0, y: 0 })
    clearTimers()

    if (onContextMenu) {
      contextTimerRef.current = setTimeout(() => {
        contextOpenedRef.current = true
        isTouchDraggingRef.current = false
        setIsTouchDragging(false)
        setTouchDelta({ x: 0, y: 0 })
        onContextMenu({
          preventDefault: () => {},
          stopPropagation: () => {},
          clientX: touchStartPos.current.x,
          clientY: touchStartPos.current.y
        })
      }, 3000)
    }
  }

  const handleTouchMove = (e) => {
    const touch = e.touches[0]
    const dx = touch.clientX - touchStartPos.current.x
    const dy = touch.clientY - touchStartPos.current.y
    const dist = Math.hypot(dx, dy)

    if (!isTouchDraggingRef.current && !contextOpenedRef.current) {
      if (dist > 8) {
        clearTimers()
        isTouchDraggingRef.current = true
        setIsTouchDragging(true)
        setTouchDelta({ x: dx, y: dy })
        onTouchDragStart?.(item, touch.clientX, touch.clientY)
      }
    }

    if (isTouchDraggingRef.current) {
      if (e.cancelable) e.preventDefault()
      setTouchDelta({ x: dx, y: dy })
      onTouchDragMove?.(item, touch.clientX, touch.clientY)
    }
  }

  const handleTouchEnd = (e) => {
    clearTimers()
    const touch = e.changedTouches[0] || e.touches[0]

    if (contextOpenedRef.current) {
      contextOpenedRef.current = false
      setTouchDelta({ x: 0, y: 0 })
      return
    }

    if (isTouchDraggingRef.current) {
      isTouchDraggingRef.current = false
      setIsTouchDragging(false)
      setTouchDelta({ x: 0, y: 0 })
      onTouchDragEnd?.(item, touch?.clientX || touchStartPos.current.x, touch?.clientY || touchStartPos.current.y)
      return
    }

    // No drag and no context menu: treat as a tap to open detail modal
    onClick?.()
    // Reset tap timer
    lastTapTimeRef.current = 0
  }

  const handleTouchCancel = () => {
    clearTimers()
    if (isTouchDraggingRef.current) {
      isTouchDraggingRef.current = false
      setIsTouchDragging(false)
      setTouchDelta({ x: 0, y: 0 })
      onTouchDragEnd?.(item, touchStartPos.current.x, touchStartPos.current.y)
    }
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onContextMenu={onContextMenu}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      style={{
        background: isTouchDragging ? 'var(--bg-card-hover)' : 'var(--bg-card)',
        border: isTouchDragging ? '1.5px solid var(--accent, #7c3aed)' : '1px solid var(--border)',
        borderRadius: 8, padding: '10px 12px',
        cursor: 'pointer', transition: isTouchDragging ? 'none' : 'border-color 0.15s, background 0.15s, transform 0.15s',
        position: 'relative', overflow: 'hidden', userSelect: 'none',
        minHeight: 52,
        transform: isTouchDragging ? `translate3d(${touchDelta.x}px, ${touchDelta.y}px, 0) scale(1.04)` : 'none',
        boxShadow: isTouchDragging ? '0 20px 45px rgba(0,0,0,0.8)' : 'none',
        zIndex: isTouchDragging ? 99999 : 1,
        opacity: isTouchDragging ? 0.95 : 1,
        touchAction: 'none',
      }}
      onMouseEnter={e => { if (!isTouchDragging) { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
      onMouseLeave={e => { if (!isTouchDragging) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.transform = 'translateY(0)' } }}
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
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}><ImageOff size={28} color="var(--text-muted)" /></div>
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
                style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 22, fontWeight: 700, outline: 'none', fontFamily: 'inherit', paddingBottom: 6, marginBottom: 8 }}
              />
              <input
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                placeholder={subtitlePlaceholder}
                style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
            <button onClick={handleClose} style={{ border: 'none', background: '#252525', color: '#aaa', width: 36, height: 36, borderRadius: 10, cursor: 'pointer', fontSize: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
          </div>

          <div>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              Cover URL
              {noteType !== 'custom' && (
                <button
                  onClick={openEnrich}
                  style={{ background: showEnrich ? 'rgba(124,58,237,0.25)' : 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 5, color: '#a78bfa', fontSize: 10, padding: '1px 7px', cursor: 'pointer', fontFamily: 'inherit' }}
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
                    style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', borderRadius: 5, padding: '4px 8px', color: '#efefef', fontSize: 11, outline: 'none', fontFamily: 'inherit' }}
                  />
                  <button onClick={() => handleEnrichSearch()} disabled={enriching} style={{ background: '#7c3aed', border: 'none', borderRadius: 5, color: 'white', padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>{enriching ? '...' : 'Qidirish'}</button>
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
              style={{ width: '100%', background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 6, padding: '6px 10px', color: '#efefef', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>Izoh</div>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Qo'shimcha izohlar..."
              style={{ width: '100%', height: '100px', background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 6, padding: '8px 10px', color: '#efefef', fontSize: 12, outline: 'none', fontFamily: 'inherit', resize: 'none' }}
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

const SECTION_LABELS = { futured: 'Kutilmoqda', todo: 'Ko\'rish kerak', doing: 'Ko\'rilmoqda', done: 'Ko\'rilgan' }

function AddItemModal({ onClose, onSave, note, existingMovies = [], groups = [] }) {
  const noteType = note?.type || 'custom'
  const isSearchable = noteType !== 'custom'

  const [mode, setMode] = useState(isSearchable ? 'search' : 'manual')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [dupMessage, setDupMessage] = useState(null)

  // Build a map of existing movie ids for fast lookup
  const existingMap = useMemo(() => {
    const map = {}
    for (const m of existingMovies) {
      if (m.tmdb_id) map['tmdb_' + m.tmdb_id] = m
      if (m.imdb_id) map['imdb_' + m.imdb_id] = m
    }
    return map
  }, [existingMovies])

  const findExisting = (r) => {
    if (r.tmdb_id && existingMap['tmdb_' + r.tmdb_id]) return existingMap['tmdb_' + r.tmdb_id]
    if (r.imdb_id && existingMap['imdb_' + r.imdb_id]) return existingMap['imdb_' + r.imdb_id]
    return null
  }

  const typeLabel = { books: 'Kitob', travel: 'Joy', games: "O'yin", custom: '' }[noteType] || ''

  const performSearch = useCallback(async (q) => {
    const trimmed = (q || '').trim()
    if (!trimmed) {
      setResults([])
      setSearching(false)
      setSearchError(null)
      return
    }
    setSearching(true)
    setSearchError(null)
    const res = await window.api.searchContent(noteType, trimmed)
    setSearching(false)
    if (res?.error) { setSearchError(res.error); return }
    setResults(Array.isArray(res) ? res : [])
  }, [noteType])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const timer = setTimeout(() => {
      performSearch(query)
    }, 350)
    return () => clearTimeout(timer)
  }, [query, performSearch])

  const handleSearch = () => {
    performSearch(query)
  }

  const handleSelect = (r) => {
    const existing = findExisting(r)
    if (existing) {
      const sectionLabel = SECTION_LABELS[existing.section] || existing.section || '?'
      const typeWord = r.media_type === 'tv' ? 'seriali' : (existing.genre && existing.genre.toLowerCase().includes('animation') ? 'multfilmi' : 'filmi')
      setDupMessage(`"${r.title}" ${typeWord} allaqachon "${sectionLabel}"ga qo'shilgan`)
      setTimeout(() => setDupMessage(null), 3500)
      return
    }
    setDupMessage(null)
    setSelected(r)
  }

  const handleSaveSelected = () => {
    if (!selected) return
    onSave({
      title: selected.title,
      release_date: selected.release_date || null,
      release_year: selected.release_year || selected.year || '-',
      rating: selected.rating || null,
      vote_count: selected.vote_count || 0,
      poster_path: selected.poster_path || selected.cover_url || null,
      cover_url: selected.cover_url || selected.poster_path || null,
      genre: selected.genre || '-',
      director: selected.director || '-',
      tmdb_id: selected.tmdb_id || null,
      imdb_id: selected.imdb_id || null,
      media_type: selected.media_type || null,
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
            <button onClick={() => setMode('manual')} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, padding: '3px 10px', fontFamily: 'inherit' }}>Qo'lda kiritish</button>
            <button onClick={onClose} style={{ background: '#252525', border: 'none', color: '#aaa', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
          </div>

          {/* Search bar */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder={`Nomi bo'yicha qidirish...`}
              style={{ flex: 1, background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#efefef', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
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
            {results.map((r, i) => {
              const isSelected = selected && (selected.tmdb_id ? selected.tmdb_id === r.tmdb_id : selected.title === r.title)
              const existingMovie = findExisting(r)
              const isDuplicate = !!existingMovie
              const dupSection = isDuplicate ? (SECTION_LABELS[existingMovie.section] || existingMovie.section) : null
              return (
                <div
                  key={r.tmdb_id || r.imdb_id || i}
                  onClick={() => handleSelect(r)}
                  style={{
                    display: 'flex', gap: 14, padding: '12px 20px',
                    cursor: isDuplicate ? 'default' : 'pointer',
                    borderBottom: '1px solid var(--border)',
                    background: isSelected ? 'rgba(124,58,237,0.15)' : 'transparent',
                    borderLeft: isSelected ? '4px solid var(--accent)' : '4px solid transparent',
                    opacity: isDuplicate ? 0.45 : 1,
                    transition: 'background 0.12s, border-left 0.12s, opacity 0.15s',
                  }}
                  onMouseEnter={e => { if (!isSelected && !isDuplicate) e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  {/* Cover */}
                  <div style={{ width: 44, height: 60, borderRadius: 6, overflow: 'hidden', background: 'var(--bg-card)', flexShrink: 0, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {r.cover_url ? (
                      <img src={r.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isDuplicate ? 'grayscale(0.7)' : 'none' }} />
                    ) : (
                      <Plus size={16} color="var(--text-muted)" />
                    )}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: isDuplicate ? 'var(--text-muted)' : 'var(--text-primary)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                      {r.year && r.year !== '-' && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, flexShrink: 0 }}>({r.year})</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {r.media_type && (
                        <span style={{ background: 'var(--border)', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: isDuplicate ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                          {r.media_type === 'tv' ? 'Serial' : 'Kino'}
                        </span>
                      )}
                      {r.rating && (
                        <span style={{ color: isDuplicate ? 'var(--text-muted)' : '#fbbf24', fontWeight: 600, fontSize: 11 }}>⭐ {r.rating}</span>
                      )}
                      {isDuplicate && (
                        <span style={{ color: '#f59e0b', fontSize: 10, fontWeight: 600, background: 'rgba(245,158,11,0.12)', padding: '1px 7px', borderRadius: 4 }}>
                          ✓ {dupSection}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Duplicate message toast */}
          {dupMessage && (
            <div style={{ padding: '10px 20px', borderTop: '1px solid rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.08)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check size={14} color="#f59e0b" />
              <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>{dupMessage}</span>
            </div>
          )}

          {/* Footer */}
          {selected && !dupMessage && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(124,58,237,0.06)', flexShrink: 0 }}>
              <div style={{ flex: 1, fontSize: 12, color: '#a78bfa', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Check size={14} color="#a78bfa" /> {selected.title}</div>
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
            style={{ width: '100%', background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 7, padding: '8px 12px', color: '#efefef', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
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
      {items.map((item, i) => {
        const IconCmp = item.Icon
        return (
          <div
            key={i}
            style={{ padding: '7px 16px', cursor: 'pointer', color: item.color || 'var(--text-primary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}
            onMouseEnter={e => e.currentTarget.style.background = '#2a2a2a'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            onClick={() => { item.action(); onClose() }}
          >
            <span style={{ opacity: 0.6, display: 'flex', alignItems: 'center' }}>
              {IconCmp && <IconCmp size={12} />}
            </span>
            {item.label}
          </div>
        )
      })}
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
            style={{ background: 'transparent', border: '1px solid #333', borderRadius: 8, color: 'var(--text-muted)', padding: '8px 20px', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#555'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#333'}
          >Bekor qilish</button>
          <button onClick={onConfirm}
            style={{ background: '#ef4444', border: 'none', borderRadius: 8, color: '#fff', padding: '8px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}
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
    fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
    opacity: disabled ? 0.4 : 1,
  }
}

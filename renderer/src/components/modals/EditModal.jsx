import React, { useState } from 'react'
import { Modal } from './SettingsModal.jsx'
import { Pencil, Plus } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext.jsx'

function MovieForm({ initial, onSave, onClose, title }) {
  const { t } = useLanguage()
  const [data, setData] = useState({
    title: '', release_year: '', rating: '', vote_count: '',
    genre: '', director: '', seasons: '', note: '', ...initial
  })

  const set = (k) => (e) => setData(d => ({ ...d, [k]: e.target.value }))

  return (
    <Modal title={title} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Row label={`${t('modals.movieTitle')} *`}>
          <Input value={data.title} onChange={set('title')} placeholder="Inception" />
        </Row>
        <div style={{ display: 'flex', gap: 10 }}>
          <Row label={t('modals.movieYear')} style={{ flex: 1 }}>
            <Input value={data.release_year} onChange={set('release_year')} placeholder="2024" />
          </Row>
          <Row label={t('modals.movieRating')} style={{ flex: 1 }}>
            <Input value={data.rating} onChange={set('rating')} placeholder="8.5" />
          </Row>
        </div>
        <Row label={t('modals.movieGenre')}>
          <Input value={data.genre} onChange={set('genre')} placeholder="Action, Drama" />
        </Row>
        <Row label={t('modals.movieDirector')}>
          <Input value={data.director} onChange={set('director')} placeholder="Christopher Nolan" />
        </Row>
        <Row label={t('modals.movieSeasons')}>
          <Input value={data.seasons} onChange={set('seasons')} placeholder="3 season / —" />
        </Row>
        <Row label={t('modals.movieOverview')}>
          <textarea
            value={data.note}
            onChange={set('note')}
            placeholder={t('modals.movieOverview')}
            rows={2}
            style={{
              width: '100%', background: '#1e1e1e', border: '1px solid #2a2a2a',
              borderRadius: 7, padding: '7px 10px', color: '#efefef', fontSize: 13,
              outline: 'none', resize: 'vertical', fontFamily: 'inherit',
            }}
          />
        </Row>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
          <button onClick={onClose} style={btn('#222', '#888')}>{t('common.cancel')}</button>
          <button
            onClick={() => data.title && onSave(data)}
            style={btn('#7c3aed', 'white')}
          >{t('modals.saveChanges')}</button>
        </div>
      </div>
    </Modal>
  )
}

export default function EditModal({ movie, onSave, onClose }) {
  const { t } = useLanguage()
  return <MovieForm title={t('modals.editTitle')} initial={movie} onSave={onSave} onClose={onClose} />
}

export function AddModal({ section, onSave, onClose }) {
  const { t } = useLanguage()
  const sectionLabel = t(`sections.${section}`, null, section)
  return <MovieForm title={`${t('common.add')}: ${sectionLabel}`} initial={{}} onSave={onSave} onClose={onClose} />
}

function Row({ label, children, style }) {
  return (
    <div style={style}>
      <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width: '100%', background: '#1e1e1e', border: '1px solid #2a2a2a',
        borderRadius: 7, padding: '7px 10px', color: '#efefef', fontSize: 13,
        outline: 'none', fontFamily: 'inherit',
      }}
    />
  )
}

function btn(bg, color) {
  return {
    background: bg, color, border: 'none', borderRadius: 7,
    padding: '8px 18px', cursor: 'pointer', fontSize: 13,
    fontFamily: 'inherit',
  }
}

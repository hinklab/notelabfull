import React, { useState } from 'react'
import { Modal } from './SettingsModal.jsx'
import { Pencil, Plus } from 'lucide-react'

const SECTIONS = {
  futured: 'Chiqadigan',
  todo: "Ko'rmoqchi",
  doing: "Ko'rayotgan",
  done: "Ko'rib bo'lgan",
}

function MovieForm({ initial, onSave, onClose, title }) {
  const [data, setData] = useState({
    title: '', release_year: '', rating: '', vote_count: '',
    genre: '', director: '', seasons: '', note: '', ...initial
  })

  const set = (k) => (e) => setData(d => ({ ...d, [k]: e.target.value }))

  return (
    <Modal title={title} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Row label="Nomi *">
          <Input value={data.title} onChange={set('title')} placeholder="Kino nomi" />
        </Row>
        <div style={{ display: 'flex', gap: 10 }}>
          <Row label="Yil" style={{ flex: 1 }}>
            <Input value={data.release_year} onChange={set('release_year')} placeholder="2024" />
          </Row>
          <Row label="Reyting" style={{ flex: 1 }}>
            <Input value={data.rating} onChange={set('rating')} placeholder="8.5" />
          </Row>
        </div>
        <Row label="Janr">
          <Input value={data.genre} onChange={set('genre')} placeholder="Action, Drama" />
        </Row>
        <Row label="Rejissyor">
          <Input value={data.director} onChange={set('director')} placeholder="Christopher Nolan" />
        </Row>
        <Row label="Sezonlar">
          <Input value={data.seasons} onChange={set('seasons')} placeholder="3 season / —" />
        </Row>
        <Row label="Izoh">
          <textarea
            value={data.note}
            onChange={set('note')}
            placeholder="Qo'shimcha izoh..."
            rows={2}
            style={{
              width: '100%', background: '#1e1e1e', border: '1px solid #2a2a2a',
              borderRadius: 7, padding: '7px 10px', color: '#efefef', fontSize: 13,
              outline: 'none', resize: 'vertical', fontFamily: 'inherit',
            }}
          />
        </Row>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
          <button onClick={onClose} style={btn('#222', '#888')}>Bekor</button>
          <button
            onClick={() => data.title && onSave(data)}
            style={btn('#7c3aed', 'white')}
          >Saqlash</button>
        </div>
      </div>
    </Modal>
  )
}

export default function EditModal({ movie, onSave, onClose }) {
  return <MovieForm title="Tahrirlash" initial={movie} onSave={onSave} onClose={onClose} />
}

export function AddModal({ section, onSave, onClose }) {
  return <MovieForm title={`${SECTIONS[section]} ga qo'shish`} initial={{}} onSave={onSave} onClose={onClose} />
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

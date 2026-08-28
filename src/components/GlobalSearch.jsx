import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserProfileModal from './UserProfileModal';
import { getAllCompanyUsers } from '../services/userService';
import { getFlagForSede } from '../utils/flags';

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const u = await getAllCompanyUsers();
        setUsers(u);
      } catch(e) {}
    }
    load();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const filtered = users.filter(u => {
      const n = (u.name || u.nombre || u.displayName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const r = (u.role || u.rol || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const s = (u.sede || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return n.includes(q) || r.includes(q) || s.includes(q) || (u.email || '').toLowerCase().includes(q);
    });
    setResults(filtered.slice(0, 10));
  }, [query, users]);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '300px', zIndex: 100 }}>
      {selectedUser && <UserProfileModal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} user={selectedUser} />} style={{ position: 'relative', width: '300px', zIndex: 100 }}>
      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input 
          type="text" 
          placeholder="Buscar persona en la red Causa..."
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '0.5rem 0.5rem 0.5rem 2.2rem',
            borderRadius: '20px',
            color: 'var(--text-heading)',
            fontSize: '0.85rem'
          }}
        />
        {query && <X size={14} onClick={() => {setQuery(''); setIsOpen(false)}} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted)' }} />}
      </div>

      {isOpen && query.trim() && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '0.5rem',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {results.length > 0 ? results.map((r, i) => {
            const hasPhone = r.whatsapp || r.phone || r.telefono || r.cleanPhone;
            const phoneVal = (r.whatsappUrl ? r.whatsappUrl.split('phone=')[1] : null) || r.cleanPhone || r.phone || r.telefono || r.whatsapp;
            const phoneStr = (phoneVal || '').toString().replace(/\D/g, '');
            const phoneUrl = r.whatsappUrl || (phoneStr ? `https://wa.me/${phoneStr}` : null);
            const chatUrl = r.email ? `https://chat.google.com/dm/${r.email}` : null;
            const roleLabel = (r.role || r.rol || 'Sin cargo').replace(/_/g, ' ').toUpperCase();

            return (
              <div 
                key={r.id || i}
                style={{
                  padding: '0.8rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'background 0.2s', cursor: 'pointer'
                }}
                className="hover-glow"
                onClick={() => {
                  setIsOpen(false);
                  setQuery('');
                  setSelectedUser(r);
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {getFlagForSede(r.sede)} {r.name || r.nombre || r.displayName || 'Usuario'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--crear-gold)', fontWeight: 'bold', marginTop: '2px' }}>
                    {roleLabel} {r.sede ? `• ${r.sede}` : ''}
                  </div>
                  {(r.email || hasPhone) && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {chatUrl && (
                        <a href={chatUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '0.2rem 0.5rem', background: 'rgba(0,191,255,0.1)', color: 'var(--crear-blue)', borderRadius: '4px', fontSize: '0.7rem', textDecoration: 'none', border: '1px solid rgba(0,191,255,0.2)' }}>
                          Google Chat
                        </a>
                      )}
                      {phoneUrl && (
                        <a href={phoneUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '0.2rem 0.5rem', background: 'rgba(37,211,102,0.1)', color: '#25D366', borderRadius: '4px', fontSize: '0.7rem', textDecoration: 'none', border: '1px solid rgba(37,211,102,0.2)' }}>
                          WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          }) : (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No se encontró a nadie con "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}






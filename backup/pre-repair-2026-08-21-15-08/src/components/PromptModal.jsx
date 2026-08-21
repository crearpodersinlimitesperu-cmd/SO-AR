import React, { useState, useEffect } from 'react';
import { useUI } from '../context/UIContext';

export default function PromptModal() {
  const { promptState, handlePromptClose } = useUI();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (promptState.isOpen) {
      setValue(promptState.defaultValue);
    }
  }, [promptState.isOpen, promptState.defaultValue]);

  if (!promptState.isOpen) return null;

  const onSubmit = (e) => {
    e.preventDefault();
    handlePromptClose(value);
  };

  const onCancel = () => {
    handlePromptClose(null);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div className="glass-panel" style={{
        padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '400px',
        backgroundColor: '#1f2937', color: '#f3f4f6', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#d4af37', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{promptState.title}</h3>
        <form onSubmit={onSubmit}>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{ 
              width: '100%', padding: '0.75rem', marginBottom: '1.5rem', 
              borderRadius: '6px', border: '1px solid #4b5563', 
              backgroundColor: '#374151', color: 'white', fontSize: '1rem',
              boxSizing: 'border-box'
            }}
            autoFocus
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" onClick={onCancel} className="btn-secondary" style={{ padding: '0.5rem 1.5rem' }}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1.5rem' }}>
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

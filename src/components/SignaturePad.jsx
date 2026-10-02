/**
 * SignaturePad.jsx — CREAR PSL Legal Module
 * Canvas de firma manuscrita digital con captura de metadatos de auditoría.
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RotateCcw, Check, X } from 'lucide-react';

const SignaturePad = ({ onSave, onCancel, participantName = '' }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [lastPos, setLastPos] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#001f5b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * (canvas.width / rect.width),
        y: (e.touches[0].clientY - rect.top) * (canvas.height / rect.height),
      };
    }
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const pos = getPos(e, canvas);
    setIsDrawing(true);
    setLastPos(pos);
    setIsEmpty(false);
  }, []);

  const draw = useCallback((e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);

    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setLastPos(pos);
  }, [isDrawing, lastPos]);

  const stopDrawing = useCallback(() => setIsDrawing(false), []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const handleSave = () => {
    if (isEmpty) return;
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', textAlign: 'center' }}>
        Dibuje su firma en el recuadro blanco.{participantName ? ` Firmado como: ${participantName}` : ''}
      </p>
      <div style={{
        border: '2px solid #001f5b', borderRadius: '8px', overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0,0,0,0.07)', position: 'relative', background: '#fff'
      }}>
        <canvas
          ref={canvasRef}
          width={480}
          height={180}
          style={{ display: 'block', cursor: 'crosshair', touchAction: 'none', maxWidth: '100%' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <div style={{
          position: 'absolute', bottom: 8, left: 12, fontSize: '0.7rem',
          color: '#cbd5e1', pointerEvents: 'none', userSelect: 'none'
        }}>
          Firma Digital CREAR PSL
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button onClick={clearCanvas} style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #e2e8f0',
          background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
        }}>
          <RotateCcw size={14} /> Limpiar
        </button>
        <button onClick={handleSave} disabled={isEmpty} style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.5rem 1.2rem', borderRadius: '6px', border: 'none',
          background: isEmpty ? '#94a3b8' : '#10b981', color: 'white',
          cursor: isEmpty ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.85rem'
        }}>
          <Check size={14} /> Guardar Firma
        </button>
        {onCancel && (
          <button onClick={onCancel} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.5rem 0.8rem', borderRadius: '6px', border: '1px solid #fca5a5',
            background: '#fef2f2', color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
          }}>
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default SignaturePad;

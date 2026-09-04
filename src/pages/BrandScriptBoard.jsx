import React, { useState } from 'react';
import { BookOpen, Copy, Check } from 'lucide-react';

export default function BrandScriptBoard() {
  const [copiedKey, setCopiedKey] = useState(null);
  const [selectedSede, setSelectedSede] = useState('Lima'); // Default para el guion

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const bgCard = 'rgba(0, 0, 0, 0.2)';
  const borderCard = 'rgba(255, 255, 255, 0.05)';
  const gold = '#d4af37';
  const textLight = '#f8fafc';
  const textMuted = '#94a3b8';
  const bgSurface = 'rgba(255,255,255,0.02)';

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', color: 'white', fontFamily: '"Inter", sans-serif' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <BookOpen size={28} color={gold} />
        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold' }}>BrandScript & Guiones MJ</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Header del Manual */}
        <div style={{ background: bgCard, padding: '1.5rem', borderRadius: '12px', border: `1px solid ${borderCard}`, borderLeft: `5px solid ${gold}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: gold, background: '#78350f33', padding: '0.2rem 0.6rem', borderRadius: '4px', textTransform: 'uppercase' }}>
                Manual Oficial de Enrolamiento Narrativo - Edición V1.0 (2026)
              </span>
              <h3 style={{ margin: '0.5rem 0 0.2rem', fontSize: '1.3rem', color: textLight }}>
                BrandScript SB7 & Guiones de Conversión para Maestría del Juego (MJ)
              </h3>
              <p style={{ margin: 0, color: textMuted, fontSize: '0.85rem' }}>
                Alineación de Mánagers y Capitanes bajo el StoryBrand Framework y Neuromarketing Ético. Cero manipulación, 100% libre elección y fisionomía de Creador.
              </p>
            </div>
          </div>
        </div>

        {/* MATRIZ SB7-MJ */}
        <div style={{ background: bgCard, padding: '1.5rem', borderRadius: '12px', border: `1px solid ${borderCard}` }}>
          <h4 style={{ margin: '0 0 1rem 0', color: gold, fontSize: '1.1rem' }}>
            🗺️ Matriz del BrandScript Oficial (SB7-MJ)
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {[
              { title: '1. El Personaje (El Héroe)', desc: 'Graduado de C2: un líder que despertó su poder en sala y busca materializarlo en su vida cotidiana.', border: '#3b82f6' },
              { title: '2. Tiene un Problema (El Efecto Lunes)', desc: 'Externo (entorno inercial), Interno (miedo al auto-sabotaje y soledad), Filosófico (inaceptable volver a vivir promedio).', border: '#ef4444' },
              { title: '3. Conoce un Guía (El Entrenador/MJ)', desc: 'No somos los héroes de su historia. Somos su reflejo de posibilidad. Mostramos empatía ("yo también viví el lunes") y autoridad (los resultados de Crear).', border: '#10b981' },
              { title: '4. Le Da un Plan (El Contenedor)', desc: 'Plan de Proceso (El FI de 15 min para mapear su visión) y Plan de Acuerdo (Compromiso de integridad sin excusas).', border: '#f59e0b' },
              { title: '5. Lo Llama a la Acción', desc: 'Directo: Agendar la sesión de Futuro Imposible, transicionar la reserva financiera y entrar a la cancha a jugar.', border: '#8b5cf6' },
              { title: '6. Evita el Fracaso', desc: 'Si no actúa: Regresar a la inercia, perder la tribu de fuego, apagar la fisionomía despertada el fin de semana.', border: '#64748b' },
              { title: '7. Termina en Éxito', desc: 'Con MJ: Rediseño total de finanzas, relaciones y carrera. Volverse la causa de su universo. El Creador encarnado.', border: '#14b8a6' },
            ].map((item, i) => (
              <div key={i} style={{ background: bgSurface, padding: '1rem', borderRadius: '8px', borderLeft: `4px solid ${item.border}` }}>
                <strong style={{ color: textLight, display: 'block', marginBottom: '0.3rem', fontSize: '0.9rem' }}>{item.title}</strong>
                <span style={{ color: textMuted, fontSize: '0.8rem', lineHeight: '1.4' }}>{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* GUIONES DE COMUNICACIÓN MÁNAGER - PARTICIPANTE */}
        <div style={{ background: bgCard, padding: '1.5rem', borderRadius: '12px', border: `1px solid ${borderCard}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, color: gold, fontSize: '1.1rem' }}>
              💬 Guiones de Conversión Mánager a Px (Scripts Directos)
            </h4>
            <select 
              value={selectedSede} 
              onChange={(e) => setSelectedSede(e.target.value)}
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: 'white', padding: '0.4rem', borderRadius: '6px', fontSize: '0.85rem' }}
            >
              <option value="Lima">Sede Lima</option>
              <option value="Quito">Sede Quito</option>
              <option value="Cuenca">Sede Cuenca</option>
              <option value="Guayaquil">Sede Guayaquil</option>
            </select>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            
            {/* Objeción Dinero */}
            <div style={{ background: bgSurface, padding: '1.2rem', borderRadius: '8px', borderTop: '2px solid #ef4444' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong style={{ color: '#ef4444', fontSize: '0.9rem' }}>Objeción: "No tengo el dinero ahorita"</strong>
                <button
                  onClick={() => copyText('En la cultura de Crear, operamos desde la Causa: si tú eres el creador de tu realidad, el dinero es una circunstancia a diseñar, no un límite inamovible. Si estructuramos un plan de abono de bajo riesgo en Nodus, ¿qué opciones ves viables para tu aporte de reserva este viernes?', 'obj1')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'transparent', border: 'none', color: textMuted, cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  {copiedKey === 'obj1' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                </button>
              </div>
              <div style={{ fontSize: '0.85rem', color: textLight, fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '4px' }}>
                «En la cultura de Crear, operamos desde la Causa: si tú eres el creador de tu realidad, el dinero es una circunstancia a diseñar, no un límite inamovible. Si estructuramos un plan de abono de bajo riesgo en Nodus, ¿qué opciones ves viables para tu aporte de reserva este viernes?»
              </div>
            </div>

          </div>
        </div>

        {/* PLANTILLAS DE WHATSAPP OFICIALES */}
        <div style={{ background: bgCard, padding: '1.5rem', borderRadius: '12px', border: `1px solid ${borderCard}` }}>
          <h4 style={{ margin: '0 0 1rem 0', color: gold, fontSize: '1.1rem' }}>
            📱 Plantillas Oficiales de WhatsApp (1-Clic para Copiar)
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem' }}>
            
            {/* WhatsApp 1 */}
            <div style={{ background: bgSurface, padding: '1.2rem', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong style={{ color: '#34d399', fontSize: '0.9rem' }}>Plantilla 1: Bienvenida Post-Graduación C2</strong>
                <button
                  onClick={() => copyText(`¡Felicidades, Creador! 🔥\n\nAún resuena en la sede la fisionomía y la fuerza de tu palabra declarada este fin de semana en Capítulo Dos. Has salido de "la arena" y hoy tienes en tus manos la posibilidad de diseñar tu propio destino.\n\nEl lunes ha llegado, y con él, la oportunidad de elegir: ¿volver a la inercia cotidiana o entrenar para consolidar tu Breakthrough?\n\nEl equipo de Mánagers y la comunidad de Maestría del Juego ya está lista para recibirte en el contenedor de los 90 días. Tu espacio de estiramiento está guardado.\n\nPaso 1: Ingresa a tu App Nodus 📲\nPaso 2: Agenda tu sesión de calibración de Futuro Imposible (FI) de 15 minutos aquí: [Enlace_Calendly]\nPaso 3: Sostiene tu palabra.\n\nSostener la fisionomía del Ser es el juego de los grandes. Nos vemos en la cancha.\n\nAtentamente,\nEl Equipo de Mánagers y Capitanes de ${selectedSede}\nCREAR PODER SIN LÍMITES 2026.`, 'waPostC2')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#0b132b', border: `1px solid ${borderCard}`, color: textLight, padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  {copiedKey === 'waPostC2' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  {copiedKey === 'waPostC2' ? '¡Copiado!' : 'Copiar Texto'}
                </button>
              </div>
              <div style={{ fontSize: '0.8rem', color: textMuted, whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                Principio de "Unidad" de Cialdini. Diseñado para reactivar la emoción del domingo e impulsar el agendamiento del FI de 15 min.
              </div>
            </div>

            {/* WhatsApp 2 */}
            <div style={{ background: bgSurface, padding: '1.2rem', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong style={{ color: gold, fontSize: '0.9rem' }}>Plantilla 2: Recordatorio Preventivo (Viernes 12:00 PM)</strong>
                <button
                  onClick={() => copyText(`Hola [Nombre] 🚨\n\nTe saludamos desde la oficina de la sede ${selectedSede}. Hoy es viernes de Capítulo Dos, un día clave para cuidar el contenedor de integridad que declaraste el jueves por la noche.\n\nPara asegurar que tu ingreso al bloque de confrontación de las 15:00 PM sea fluido y libre de distracciones logísticas:\n\n💳 Tu estado actual en Nodus requiere conciliación de caja.\n⏱ El cierre automático de registros contables de la plataforma se ejecutará a las 14:00 PM.\n\nQueremos cuidar tu experiencia y tu palabra. Por favor, acércate a la mesa externa de registro antes de la hora límite o envíanos tu comprobante digital por esta vía para validar tu "Ticket Verde" en el sistema.\n\nSi tienes algún quiebre técnico o financiero de última hora, avísanos de inmediato para diseñar juntos una solución de bajo riesgo con el Gerente de Sede antes de que el sistema aplique el bloqueo automático.\n\n¡Sostener tu palabra es tu mayor poder! Nos vemos en sala. 🛡️\nCREAR PODER SIN LÍMITES`, 'waPrev12')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#0b132b', border: `1px solid ${borderCard}`, color: textLight, padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  {copiedKey === 'waPrev12' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  {copiedKey === 'waPrev12' ? '¡Copiado!' : 'Copiar Texto'}
                </button>
              </div>
              <div style={{ fontSize: '0.8rem', color: textMuted, whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                Neuromarketing Preventivo. Sustituye la fricción de la penalización de "Palabra Rota" anticipándose al cierre contable de las 14:00 PM.
              </div>
            </div>

          </div>
        </div>

        {/* CHECKLIST DE IMPECABILIDAD */}
        <div style={{ background: bgCard, padding: '1.5rem', borderRadius: '12px', border: `1px solid ${borderCard}` }}>
          <h4 style={{ margin: '0 0 0.8rem 0', color: '#a855f7', fontSize: '1.1rem' }}>
            🛡️ Checklist de Impecabilidad del Enrolador Narrativo
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
            <div style={{ background: bgSurface, padding: '0.8rem', borderRadius: '6px', fontSize: '0.82rem' }}>
              <strong style={{ color: '#ec4899', display: 'block' }}>1. Cero Simpatía al Drama</strong>
              <span style={{ color: textMuted }}>No comprar justificaciones con lástima; sostenerlo en su grandeza de creador.</span>
            </div>
            <div style={{ background: bgSurface, padding: '0.8rem', borderRadius: '6px', fontSize: '0.82rem' }}>
              <strong style={{ color: '#38bdf8', display: 'block' }}>2. Datos vs. Interpretaciones</strong>
              <span style={{ color: textMuted }}>Separar los hechos objetivos de las historias basadas en el miedo.</span>
            </div>
            <div style={{ background: bgSurface, padding: '0.8rem', borderRadius: '6px', fontSize: '0.82rem' }}>
              <strong style={{ color: '#10b981', display: 'block' }}>3. Respeto a la Autonomía</strong>
              <span style={{ color: textMuted }}>Elección voluntaria. Erradicación total de culpa y escasez falsa.</span>
            </div>
            <div style={{ background: bgSurface, padding: '0.8rem', borderRadius: '6px', fontSize: '0.82rem' }}>
              <strong style={{ color: gold, display: 'block' }}>4. Fisionomía de Voz</strong>
              <span style={{ color: textMuted }}>Postura erguida, tono firme y amoroso; la vibración se transmite.</span>
            </div>
            <div style={{ background: bgSurface, padding: '0.8rem', borderRadius: '6px', fontSize: '0.82rem' }}>
              <strong style={{ color: '#a855f7', display: 'block' }}>5. Trazabilidad en Nodus</strong>
              <span style={{ color: textMuted }}>Registro limpio de acuerdos de pago y fechas límite para la Gerencia.</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

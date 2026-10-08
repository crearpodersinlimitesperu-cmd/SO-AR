import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

const CREATION_MESSAGES = [
  'La creación comienza cuando una posibilidad encuentra forma.',
  'Imaginamos lo que aún no existe; juntos le damos lugar.',
  'Cada idea abre un espacio nuevo para crear.',
  'Lo extraordinario también empieza con una chispa.',
  'Creamos posibilidades donde antes solo había preguntas.',
  'Una visión compartida puede abrir caminos inéditos.',
  'Damos forma a ideas que merecen existir.',
  'Crear es hacer visible una posibilidad nueva.',
  'Toda creación empieza por atreverse a imaginar.',
  'El poder de crear también es poder elegir qué sigue.',
  'De una chispa compartida nacen mundos nuevos.',
  'Aquí, las ideas se encuentran para crear algo distinto.'
];

function shuffleMessages(previousMessage) {
  const messages = [...CREATION_MESSAGES];
  for (let index = messages.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [messages[index], messages[randomIndex]] = [messages[randomIndex], messages[index]];
  }
  if (messages[0] === previousMessage) [messages[0], messages[1]] = [messages[1], messages[0]];
  return messages;
}

export default function MagicalLoadingScreen({ message = 'Preparando tu espacio de creación…' }) {
  const [messageSequence, setMessageSequence] = useState(() => ({ messages: shuffleMessages(), index: 0 }));

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setMessageSequence(sequence => {
        const nextIndex = sequence.index + 1;
        if (nextIndex < sequence.messages.length) return { ...sequence, index: nextIndex };
        return { messages: shuffleMessages(sequence.messages[sequence.index]), index: 0 };
      });
    }, 3600);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="magical-loading" role="status" aria-live="polite" aria-atomic="true">
      <div className="magical-loading__aura" aria-hidden="true" />
      <div className="magical-loading__sparkle" aria-hidden="true"><Sparkles size={30} strokeWidth={1.8} /></div>
      <div className="magical-loading__brand">CREAR <span>PODER SIN LÍMITES</span></div>
      <p className="magical-loading__message" key={messageSequence.index}>{messageSequence.messages[messageSequence.index]}</p>
      <div className="magical-loading__progress" aria-hidden="true"><span /></div>
      <p className="magical-loading__status">{message}</p>
    </div>
  );
}

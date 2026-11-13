import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getSceneForTime, buildSceneVoiceScript, ReelSoundtrackEngine } from '../src/utils/reelSoundtrackEngine.js';

describe('reelSoundtrackEngine: escenas, guion personalizado y motor WebAudio', () => {
  it('getSceneForTime mapea correctamente las 5 escenas de 0 a 23s', () => {
    assert.equal(getSceneForTime(0), 1);
    assert.equal(getSceneForTime(4.5), 2);
    assert.equal(getSceneForTime(9.2), 3);
    assert.equal(getSceneForTime(14.1), 4);
    assert.equal(getSceneForTime(19.0), 5);
  });

  it('buildSceneVoiceScript personaliza IMO, enrolado y sede en todas las escenas', () => {
    const s1 = buildSceneVoiceScript(1, { nombreImo: 'Carlos', nombreEnrolado: 'María', ciudad: 'Lima' });
    assert.ok(s1.includes('Carlos'));
    assert.ok(s1.includes('María'));

    const s2 = buildSceneVoiceScript(2, { nombreImo: 'Carlos', nombreEnrolado: 'María', ciudad: 'Lima' });
    assert.ok(s2.includes('Lima'));

    const s5 = buildSceneVoiceScript(5, { nombreImo: 'Carlos', nombreEnrolado: 'María', ciudad: 'Lima' });
    assert.ok(s5.includes('Leones con Leones'));
    assert.ok(s5.includes('Carlos'));
  });

  it('ReelSoundtrackEngine entrega energía y barras seguras incluso sin AudioContext (Node)', () => {
    const engine = new ReelSoundtrackEngine();
    assert.equal(engine.getEnergy(), 0);
    assert.equal(engine.getSpectrumBars(16).length, 16);
    assert.equal(engine.getAudioStreamTrack(), null);
  });
});

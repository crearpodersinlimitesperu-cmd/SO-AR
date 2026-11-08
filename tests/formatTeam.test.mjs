import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitConcatenatedTeamNumbers, formatTeamString } from '../src/utils/formatTeam.js';

describe('splitConcatenatedTeamNumbers & formatTeamString', () => {
  it('correctly splits 3-digit concatenated teams like 987 into individual teams', () => {
    assert.deepEqual(splitConcatenatedTeamNumbers('987'), ['9', '8', '7']);
    assert.deepEqual(splitConcatenatedTeamNumbers('876'), ['8', '7', '6']);
    assert.deepEqual(splitConcatenatedTeamNumbers('765'), ['7', '6', '5']);
    assert.deepEqual(splitConcatenatedTeamNumbers('123'), ['1', '2', '3']);
    assert.equal(formatTeamString('987'), 'Eq. 9, 8, 7');
  });

  it('correctly handles 4-digit sequences (1098, 2930, 1112)', () => {
    assert.deepEqual(splitConcatenatedTeamNumbers('1098'), ['10', '9', '8']);
    assert.deepEqual(splitConcatenatedTeamNumbers('2930'), ['29', '30']);
    assert.deepEqual(splitConcatenatedTeamNumbers('1112'), ['11', '12']);
    assert.equal(formatTeamString('1098'), 'Eq. 10, 9, 8');
  });

  it('correctly handles 5-digit sequences (11109, 10098)', () => {
    assert.deepEqual(splitConcatenatedTeamNumbers('11109'), ['11', '10', '9']);
    assert.deepEqual(splitConcatenatedTeamNumbers('10098'), ['100', '98']);
    assert.equal(formatTeamString('11109'), 'Eq. 11, 10, 9');
    assert.equal(formatTeamString('10098'), 'Eq. 100, 98');
  });

  it('correctly handles 6, 7, 8 and 9 digits sequences', () => {
    assert.deepEqual(splitConcatenatedTeamNumbers('121110'), ['12', '11', '10']);
    assert.deepEqual(splitConcatenatedTeamNumbers('293031'), ['29', '30', '31']);
    assert.deepEqual(splitConcatenatedTeamNumbers('1009896'), ['100', '98', '96']);
    assert.deepEqual(splitConcatenatedTeamNumbers('10210098'), ['102', '100', '98']);
    assert.deepEqual(splitConcatenatedTeamNumbers('126124122'), ['126', '124', '122']);
  });

  it('preserves single team numbers and non-concatenated inputs', () => {
    assert.deepEqual(splitConcatenatedTeamNumbers('31'), ['31']);
    assert.deepEqual(splitConcatenatedTeamNumbers('9'), ['9']);
    assert.deepEqual(splitConcatenatedTeamNumbers('100'), ['100']);
    assert.deepEqual(splitConcatenatedTeamNumbers(''), []);
    assert.deepEqual(splitConcatenatedTeamNumbers(null), []);
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { accents, appearanceColors } from '../src/appearance.ts';

test('all dark accents have distinct themed cards rather than a fixed green surface', () => {
  const cards = accents.map(accent => appearanceColors('dark', accent.value).card);
  assert.equal(new Set(cards).size, accents.length);
  assert.ok(cards.every(card => card !== '#12362E'));
  const yellow = appearanceColors('dark', 'yellow');
  const channels = [1, 3, 5].map(start => parseInt(yellow.card.slice(start, start + 2), 16));
  assert.ok(channels[0] > channels[1] && channels[1] > channels[2]);
});

test('light mode keeps neutral readable cards and uses the selected accent', () => {
  for (const accent of accents) {
    const colors = appearanceColors('light', accent.value);
    assert.equal(colors.card, '#ffffff');
    assert.equal(colors.primary, accent.color);
    assert.equal(colors.text, '#24242C');
  }
});

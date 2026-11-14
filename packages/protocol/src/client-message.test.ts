// Seasonal Spirits — the client message validator: only well-formed messages get through.

import { describe, expect, it } from 'vitest';
import { MAX_CLIENT_MESSAGE_BYTES, parseClientMessage } from './client-message.js';

describe('parseClientMessage', () => {
  it('accepts the three valid messages and returns only their known fields', () => {
    expect(parseClientMessage('{"kind":"player"}')).toEqual({ kind: 'player' });
    expect(parseClientMessage('{"kind":"spectator","x":1}')).toEqual({ kind: 'spectator' });
    expect(parseClientMessage('{"kind":"input","dx":0.6,"dy":-0.8,"x":5,"team":3}')).toEqual({
      kind: 'input',
      dx: 0.6,
      dy: -0.8,
    });
  });

  it('refuses anything that is not a JSON object', () => {
    for (const text of [
      '',
      'not json',
      'null',
      '[]',
      '[{"kind":"player"}]',
      '42',
      '"player"',
      'true',
    ]) {
      expect(parseClientMessage(text), text).toBeNull();
    }
  });

  it('refuses unknown kinds and missing or wrong-typed fields', () => {
    for (const text of [
      '{}',
      '{"kind":"admin"}',
      '{"kind":7}',
      '{"kind":"input"}',
      '{"kind":"input","dx":1}',
      '{"kind":"input","dx":"1","dy":0}',
      '{"kind":"input","dx":null,"dy":0}',
    ]) {
      expect(parseClientMessage(text), text).toBeNull();
    }
  });

  it('refuses Infinity, huge numbers and components outside [-1, 1]', () => {
    for (const text of [
      '{"kind":"input","dx":1e400,"dy":0}',
      '{"kind":"input","dx":1e308,"dy":0}',
      '{"kind":"input","dx":1.0001,"dy":0}',
      '{"kind":"input","dx":0,"dy":-2}',
    ]) {
      expect(parseClientMessage(text), text).toBeNull();
    }
  });

  it('does not let __proto__ smuggle in a kind', () => {
    expect(parseClientMessage('{"__proto__":{"kind":"player"}}')).toBeNull();
  });

  it('refuses a message longer than the bound before parsing it', () => {
    const long = JSON.stringify({ kind: 'player', pad: 'x'.repeat(MAX_CLIENT_MESSAGE_BYTES) });
    expect(parseClientMessage(long)).toBeNull();
  });
});

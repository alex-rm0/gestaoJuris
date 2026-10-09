import { expect, it } from 'vitest';
import { gerarPid, gerarToken, TOKEN_VALIDO } from './tokens';

it('token tem 32 caracteres alfanuméricos e é imprevisível', () => {
  const t = gerarToken();
  expect(t).toMatch(/^[A-Za-z0-9]{32}$/);
  expect(TOKEN_VALIDO.test(t)).toBe(true);
  expect(new Set(Array.from({ length: 200 }, gerarToken)).size).toBe(200);
});

it('pid tem 20 caracteres alfanuméricos', () => {
  expect(gerarPid()).toMatch(/^[A-Za-z0-9]{20}$/);
});

it('TOKEN_VALIDO recusa formatos estranhos', () => {
  for (const t of ['', 'abc', 'a/b'.padEnd(32, 'x'), 'x'.repeat(33), 'á'.repeat(32)]) expect(TOKEN_VALIDO.test(t)).toBe(false);
});

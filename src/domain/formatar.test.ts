import { expect, it } from 'vitest';
import { formatarData, formatarDia, formatarIntervalo, formatarSlot } from './formatar';

it('formata dias, slots e intervalos', () => {
  expect(formatarDia('2026-10-13')).toBe('ter 13/10');
  expect(formatarSlot('2026-10-13T10:00')).toBe('ter 13/10, 10:00');
  expect(formatarIntervalo('2026-10-13T10:00', '2026-10-13T11:00')).toBe('ter 13/10, 10:00–11:00');
  expect(formatarData('2026-10-13')).toBe('13/10/2026');
});

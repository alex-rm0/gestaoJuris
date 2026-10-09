import { describe, expect, it } from 'vitest';
import { contarPorSlot, respondeu, sugerirDatas } from './sugestoes';

const juri = {
  dataInicio: '2026-10-12',
  dataFim: '2026-10-13',
  horaInicio: '09:00',
  horaFim: '12:00',
  diasSemana: [1, 2, 3, 4, 5],
  duracaoMin: 60,
  participantesIds: ['a', 'b', 'c'],
};
const blocos = (dia: string, ...horas: string[]) => horas.map((h) => `${dia}T${h}`);

describe('sugerirDatas', () => {
  it('sem respostas (JU-R16)', () => {
    const r = sugerirDatas(juri, []);
    expect(r).toEqual({ sugestoes: [], haDataComTodos: false, semRespostas: true });
  });

  it('slots fora da grelha não contam como resposta (JU-R16, JU-R17)', () => {
    const r = sugerirDatas(juri, [{ pid: 'a', slots: ['2026-10-14T09:00'] }]);
    expect(r.semRespostas).toBe(true);
  });

  it('encontra a data com todos em primeiro (JU-R13, JU-R14, JU-R15)', () => {
    const r = sugerirDatas(juri, [
      { pid: 'a', slots: blocos('2026-10-13', '10:00', '10:30', '11:00') },
      { pid: 'b', slots: blocos('2026-10-13', '10:00', '10:30') },
      { pid: 'c', slots: [...blocos('2026-10-12', '09:00', '09:30'), ...blocos('2026-10-13', '10:00', '10:30')] },
    ]);
    expect(r.haDataComTodos).toBe(true);
    expect(r.sugestoes[0]).toEqual({ inicio: '2026-10-13T10:00', fim: '2026-10-13T11:00', disponiveis: ['a', 'b', 'c'], emFalta: [] });
  });

  it('precisa de todos os blocos da duração (JU-R13)', () => {
    const r = sugerirDatas(juri, [
      { pid: 'a', slots: blocos('2026-10-12', '09:00') },
      { pid: 'b', slots: blocos('2026-10-12', '09:00', '09:30') },
    ]);
    expect(r.sugestoes[0].disponiveis).toEqual(['b']);
    expect(r.sugestoes[0].emFalta).toEqual(['a', 'c']);
  });

  it('sem data com todos: indica quem falta (JU-R15)', () => {
    const r = sugerirDatas(juri, [
      { pid: 'a', slots: blocos('2026-10-12', '09:00', '09:30') },
      { pid: 'b', slots: blocos('2026-10-12', '09:00', '09:30') },
    ]);
    expect(r.haDataComTodos).toBe(false);
    expect(r.sugestoes[0]).toMatchObject({ inicio: '2026-10-12T09:00', disponiveis: ['a', 'b'], emFalta: ['c'] });
  });

  it('empate resolve pela data mais cedo (JU-R14)', () => {
    const r = sugerirDatas(juri, [{ pid: 'a', slots: [...blocos('2026-10-13', '09:00', '09:30'), ...blocos('2026-10-12', '11:00', '11:30')] }]);
    expect(r.sugestoes.map((s) => s.inicio)).toEqual(['2026-10-12T11:00', '2026-10-13T09:00']);
  });

  it('descarta inícios sobrepostos com o mesmo grupo (JU-R14)', () => {
    const r = sugerirDatas(juri, [{ pid: 'a', slots: blocos('2026-10-12', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30') }]);
    expect(r.sugestoes.map((s) => s.inicio)).toEqual(['2026-10-12T09:00', '2026-10-12T10:00', '2026-10-12T11:00']);
  });

  it('máximo 5 sugestões', () => {
    const todos = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
    const r = sugerirDatas(juri, [
      { pid: 'a', slots: [...blocos('2026-10-12', ...todos), ...blocos('2026-10-13', ...todos)] },
    ]);
    expect(r.sugestoes).toHaveLength(5);
  });

  it('ignora quem já não é participante (JU-R17)', () => {
    const r = sugerirDatas(juri, [{ pid: 'z', slots: blocos('2026-10-12', '09:00', '09:30') }]);
    expect(r.semRespostas).toBe(true);
  });
});

describe('respondeu (JU-R21)', () => {
  it('só conta slots dentro da grelha', () => {
    expect(respondeu(juri, undefined)).toBe(false);
    expect(respondeu(juri, { pid: 'a', slots: [] })).toBe(false);
    expect(respondeu(juri, { pid: 'a', slots: ['2026-10-20T09:00'] })).toBe(false);
    expect(respondeu(juri, { pid: 'a', slots: ['2026-10-12T09:00'] })).toBe(true);
  });
});

describe('contarPorSlot', () => {
  it('lista os pids disponíveis por bloco, ignorando estranhos e slots fora', () => {
    const m = contarPorSlot(juri, ['a', 'b'], [
      { pid: 'a', slots: ['2026-10-12T09:00', '2026-10-20T09:00'] },
      { pid: 'b', slots: ['2026-10-12T09:00'] },
      { pid: 'z', slots: ['2026-10-12T09:00'] },
    ]);
    expect(m.get('2026-10-12T09:00')).toEqual(['a', 'b']);
    expect(m.has('2026-10-20T09:00')).toBe(false);
  });
});

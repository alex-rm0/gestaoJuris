import { describe, expect, it } from 'vitest';
import type { JuriInput } from './tipos';
import {
  diaSemanaISO, eInicioValido, fimDe, gerarCandidatos, gerarDias, gerarGrelha, gerarHoras, validarJuri,
} from './slots';

const cfg = {
  dataInicio: '2026-10-12', // segunda
  dataFim: '2026-10-18',    // domingo
  horaInicio: '09:00',
  horaFim: '11:00',
  diasSemana: [1, 2, 3, 4, 5],
  duracaoMin: 60,
};

describe('grelha (JU-R11)', () => {
  it('dia da semana ISO', () => {
    expect(diaSemanaISO('2026-10-12')).toBe(1);
    expect(diaSemanaISO('2026-10-18')).toBe(7);
  });

  it('gera só os dias da semana escolhidos', () => {
    expect(gerarDias(cfg)).toEqual(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16']);
  });

  it('atravessa a mudança de hora sem saltar nem repetir dias', () => {
    const dias = gerarDias({ ...cfg, dataInicio: '2026-10-24', dataFim: '2026-10-27', diasSemana: [1, 2, 3, 4, 5, 6, 7] });
    expect(dias).toEqual(['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27']);
  });

  it('gera blocos de 30 min com fim exclusivo', () => {
    expect(gerarHoras(cfg)).toEqual(['09:00', '09:30', '10:00', '10:30']);
  });

  it('grelha completa', () => {
    const g = gerarGrelha(cfg);
    expect(g).toHaveLength(5 * 4);
    expect(g[0]).toBe('2026-10-12T09:00');
    expect(g.at(-1)).toBe('2026-10-16T10:30');
  });
});

describe('candidatos (JU-R12)', () => {
  it('só inícios em que a duração cabe no dia', () => {
    const c = gerarCandidatos({ ...cfg, dataFim: '2026-10-12' });
    expect(c.map((x) => x.inicio)).toEqual(['2026-10-12T09:00', '2026-10-12T09:30', '2026-10-12T10:00']);
    expect(c[0]).toEqual({ inicio: '2026-10-12T09:00', fim: '2026-10-12T10:00', blocos: ['2026-10-12T09:00', '2026-10-12T09:30'] });
  });

  it('fimDe soma a duração', () => {
    expect(fimDe('2026-10-12T18:30', 30)).toBe('2026-10-12T19:00');
  });

  it('eInicioValido recusa inícios onde o júri não cabe ou fora da grelha', () => {
    expect(eInicioValido(cfg, '2026-10-12T10:00')).toBe(true);
    expect(eInicioValido(cfg, '2026-10-12T10:30')).toBe(false); // acabaria às 11:30
    expect(eInicioValido(cfg, '2026-10-17T09:00')).toBe(false); // sábado
  });
});

describe('validarJuri (JU-R04..R07)', () => {
  const base: JuriInput = { ...cfg, titulo: 'Júri A', notas: '' };

  it('aceita um júri válido', () => {
    expect(validarJuri(base, 2)).toEqual({});
  });

  it('título obrigatório', () => {
    expect(validarJuri({ ...base, titulo: '  ' }, 2).titulo).toBeDefined();
  });

  it('datas invertidas', () => {
    expect(validarJuri({ ...base, dataInicio: '2026-10-20', dataFim: '2026-10-12' }, 2).datas).toBeDefined();
  });

  it('intervalo sem nenhum dos dias da semana escolhidos', () => {
    expect(validarJuri({ ...base, dataInicio: '2026-10-17', dataFim: '2026-10-18' }, 2).datas)
      .toBe('O período não inclui nenhum dos dias da semana escolhidos.');
  });

  it('intervalo maior que 62 dias', () => {
    expect(validarJuri({ ...base, dataInicio: '2026-10-01', dataFim: '2026-12-15' }, 2).datas)
      .toBe('O período não pode ter mais de 62 dias.');
  });

  it('horas fora de múltiplos de 30, invertidas ou mais curtas que a duração', () => {
    expect(validarJuri({ ...base, horaInicio: '09:15' }, 2).horas).toBeDefined();
    expect(validarJuri({ ...base, horaInicio: '11:00', horaFim: '09:00' }, 2).horas).toBeDefined();
    expect(validarJuri({ ...base, horaFim: '09:30' }, 2).horas).toBeDefined();
  });

  it('duração inválida', () => {
    expect(validarJuri({ ...base, duracaoMin: 45 }, 2).duracaoMin).toBeDefined();
    expect(validarJuri({ ...base, duracaoMin: 270, horaFim: '19:00' }, 2).duracaoMin).toBeDefined();
  });

  it('pelo menos um dia e um participante', () => {
    expect(validarJuri({ ...base, diasSemana: [] }, 2).diasSemana).toBeDefined();
    expect(validarJuri(base, 0).participantes).toBeDefined();
  });
});

describe('limite da grelha', () => {
  it('recusa júris com mais de 2000 blocos (limite das regras)', () => {
    const grande: JuriInput = {
      titulo: 'X', notas: '', dataInicio: '2026-10-01', dataFim: '2026-12-01',
      horaInicio: '07:00', horaFim: '23:30', diasSemana: [1, 2, 3, 4, 5, 6, 7], duracaoMin: 60,
    };
    expect(validarJuri(grande, 1).datas).toBe('O júri tem demasiados horários possíveis. Reduza o período ou o horário diário.');
  });
});

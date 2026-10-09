import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { vi } from 'vitest';
import { GrelhaDisponibilidade } from './GrelhaDisponibilidade';

const cfg = { dataInicio: '2026-10-12', dataFim: '2026-10-12', horaInicio: '10:00', horaFim: '11:30', diasSemana: [1], duracaoMin: 60 };
const celula = (slot: string) => document.querySelector(`[data-slot="${slot}"]`) as HTMLElement;

function Editavel({ inicial = [] as string[], aoMudar = vi.fn() }) {
  const [sel, setSel] = useState(new Set(inicial));
  return <GrelhaDisponibilidade cfg={cfg} selecionados={sel} onChange={(s) => { setSel(s); aoMudar([...s].sort()); }} />;
}

it('pinta ao premir e ao arrastar', () => {
  const aoMudar = vi.fn();
  render(<Editavel aoMudar={aoMudar} />);
  document.elementFromPoint = vi.fn(() => celula('2026-10-12T10:30'));
  fireEvent.pointerDown(celula('2026-10-12T10:00'));
  fireEvent.pointerMove(celula('2026-10-12T10:00'));
  fireEvent.pointerUp(window);
  expect(aoMudar).toHaveBeenLastCalledWith(['2026-10-12T10:00', '2026-10-12T10:30']);
  expect(celula('2026-10-12T10:30')).toHaveClass('sel');
});

it('premir num bloco pintado apaga, e o arrasto continua a apagar', () => {
  const aoMudar = vi.fn();
  render(<Editavel inicial={['2026-10-12T10:00', '2026-10-12T10:30', '2026-10-12T11:00']} aoMudar={aoMudar} />);
  document.elementFromPoint = vi.fn(() => celula('2026-10-12T10:30'));
  fireEvent.pointerDown(celula('2026-10-12T10:00'));
  fireEvent.pointerMove(celula('2026-10-12T10:00'));
  fireEvent.pointerUp(window);
  expect(aoMudar).toHaveBeenLastCalledWith(['2026-10-12T11:00']);
});

it('depois de largar, mover não pinta', () => {
  const aoMudar = vi.fn();
  render(<Editavel aoMudar={aoMudar} />);
  fireEvent.pointerDown(celula('2026-10-12T10:00'));
  fireEvent.pointerUp(window);
  document.elementFromPoint = vi.fn(() => celula('2026-10-12T11:00'));
  fireEvent.pointerMove(celula('2026-10-12T10:00'));
  expect(aoMudar).toHaveBeenCalledTimes(1);
});

it('modo leitura mostra contagem e nomes ao clicar', () => {
  const disponiveis = new Map([['2026-10-12T10:00', ['Ana', 'Bruno']]]);
  render(<GrelhaDisponibilidade cfg={cfg} disponiveis={disponiveis} total={3} infoExtra={() => <button>Marcar aqui</button>} />);
  expect(celula('2026-10-12T10:00')).toHaveTextContent('2/3');
  expect(celula('2026-10-12T10:00')).toHaveAttribute('title', '2/3: Ana, Bruno');
  fireEvent.click(celula('2026-10-12T10:00'));
  expect(screen.getByText(/seg 12\/10, 10:00 — 2\/3: Ana, Bruno/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Marcar aqui' })).toBeInTheDocument();
});

it('pagina quando há mais dias do que cabem', () => {
  render(<GrelhaDisponibilidade cfg={{ ...cfg, dataFim: '2026-10-21', diasSemana: [1, 2, 3, 4, 5, 6, 7] }} total={1} />);
  expect(screen.getAllByRole('columnheader')).toHaveLength(1 + 7);
  fireEvent.click(screen.getByRole('button', { name: 'Seguintes ›' }));
  expect(screen.getAllByRole('columnheader')).toHaveLength(1 + 3);
  expect(screen.getByRole('button', { name: 'Seguintes ›' })).toBeDisabled();
});

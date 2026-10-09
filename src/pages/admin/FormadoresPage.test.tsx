import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { criarFormador } from '../../data/formadores';
import { FormadoresPage } from './FormadoresPage';

vi.mock('../../lib/firebase', () => ({ auth: {}, db: {} }));
vi.mock('../../data/formadores', () => ({
  subscreverFormadores: (_db: unknown, cb: (v: unknown[]) => void) => { cb([]); return () => {}; },
  criarFormador: vi.fn(),
  editarFormador: vi.fn(),
  regenerarLink: vi.fn(),
}));

it('não cria duplicados ao clicar duas vezes em Adicionar', () => {
  vi.mocked(criarFormador).mockReturnValue(new Promise(() => {}));
  render(<FormadoresPage />);
  fireEvent.change(screen.getByPlaceholderText('Nome do formador'), { target: { value: 'Maria' } });
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
  fireEvent.click(screen.getByRole('button', { name: /Adicionar|A adicionar/ }));
  expect(criarFormador).toHaveBeenCalledTimes(1);
});

it('mostra erro se não conseguir adicionar', async () => {
  vi.mocked(criarFormador).mockRejectedValue(new Error('falhou'));
  render(<FormadoresPage />);
  fireEvent.change(screen.getByPlaceholderText('Nome do formador'), { target: { value: 'Maria' } });
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
  expect(await screen.findByText('Não foi possível guardar. Verifique a ligação e tente de novo.')).toBeInTheDocument();
});

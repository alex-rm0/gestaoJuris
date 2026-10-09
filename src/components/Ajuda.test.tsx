import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it } from 'vitest';
import { Ajuda } from './Ajuda';

beforeEach(() => { localStorage.clear(); });

it('mostra o guia aberto na primeira visita', () => {
  render(<Ajuda chave="painel" titulo="Como funciona"><p>Passo 1</p></Ajuda>);
  expect(screen.getByText('Passo 1')).toBeInTheDocument();
});

it('fecha, volta a abrir com "?" e lembra-se da escolha', () => {
  const { unmount } = render(<Ajuda chave="painel" titulo="Como funciona"><p>Passo 1</p></Ajuda>);
  fireEvent.click(screen.getByRole('button', { name: 'Fechar ajuda' }));
  expect(screen.queryByText('Passo 1')).not.toBeInTheDocument();
  unmount();

  render(<Ajuda chave="painel" titulo="Como funciona"><p>Passo 1</p></Ajuda>);
  expect(screen.queryByText('Passo 1')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '? Como funciona' }));
  expect(screen.getByText('Passo 1')).toBeInTheDocument();
});

it('funciona mesmo sem acesso ao armazenamento do browser', () => {
  const original = Storage.prototype.getItem;
  Storage.prototype.getItem = () => { throw new Error('bloqueado'); };
  try {
    render(<Ajuda chave="x" titulo="Ajuda"><p>Texto</p></Ajuda>);
    expect(screen.getByText('Texto')).toBeInTheDocument();
  } finally {
    Storage.prototype.getItem = original;
  }
});

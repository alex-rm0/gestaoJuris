import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Ajuda, Dica } from './Ajuda';

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

describe('interruptor VITE_MOSTRAR_AJUDA', () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it('com VITE_MOSTRAR_AJUDA=false não mostra guias nem dicas (nem o botão "?")', () => {
    vi.stubEnv('VITE_MOSTRAR_AJUDA', 'false');
    const { container } = render(<><Ajuda chave="p" titulo="Como funciona"><p>Passo</p></Ajuda><Dica>Dica</Dica></>);
    expect(container).toBeEmptyDOMElement();
  });

  it('a ajuda dos formadores (sempre) continua visível mesmo desligada', () => {
    vi.stubEnv('VITE_MOSTRAR_AJUDA', 'false');
    render(<Ajuda chave="f" titulo="Como indicar" sempre><p>Arrasta</p></Ajuda>);
    expect(screen.getByText('Arrasta')).toBeInTheDocument();
  });

  it('qualquer outro valor (ou nenhum) mantém a ajuda visível', () => {
    vi.stubEnv('VITE_MOSTRAR_AJUDA', 'true');
    render(<><Ajuda chave="p" titulo="Como funciona"><p>Passo</p></Ajuda><Dica>Dica</Dica></>);
    expect(screen.getByText('Passo')).toBeInTheDocument();
    expect(screen.getByText('Dica')).toBeInTheDocument();
  });
});

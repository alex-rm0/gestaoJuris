import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { RequireAdmin } from './RequireAdmin';
import { useSessaoAdmin, type EstadoAdmin } from '../lib/useSessaoAdmin';

vi.mock('../lib/useSessaoAdmin', () => ({ useSessaoAdmin: vi.fn() }));
vi.mock('../lib/firebase', () => ({ auth: {}, db: {} }));
vi.mock('firebase/auth', () => ({ signOut: vi.fn() }));

function montar(estado: EstadoAdmin) {
  vi.mocked(useSessaoAdmin).mockReturnValue(estado);
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/login" element={<p>Página de login</p>} />
        <Route path="/" element={<RequireAdmin><p>Área privada</p></RequireAdmin>} />
      </Routes>
    </MemoryRouter>,
  );
}

it('mostra a área privada à admin', () => {
  montar('admin');
  expect(screen.getByText('Área privada')).toBeInTheDocument();
});

it('redireciona para o login sem sessão', () => {
  montar('fora');
  expect(screen.getByText('Página de login')).toBeInTheDocument();
});

it('recusa contas sem permissão (JU-R01)', () => {
  montar('semPermissao');
  expect(screen.getByText('Esta conta não tem acesso de gestão.')).toBeInTheDocument();
  expect(screen.queryByText('Área privada')).not.toBeInTheDocument();
});

it('mostra carregamento enquanto verifica', () => {
  montar('carregando');
  expect(screen.getByText('A carregar…')).toBeInTheDocument();
});

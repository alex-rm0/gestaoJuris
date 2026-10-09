import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

vi.mock('./lib/firebase', () => ({ auth: {}, db: {} }));
vi.mock('./lib/useSessaoAdmin', () => ({ useSessaoAdmin: () => 'fora' }));

it('sem sessão, abre o login', () => {
  window.history.pushState({}, '', '/');
  render(<App />);
  expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
});

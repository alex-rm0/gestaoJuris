import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { BotoesPartilha } from './BotoesPartilha';

it('copia o link pessoal e prepara a mensagem de WhatsApp', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  const token = 'T'.repeat(32);
  render(<BotoesPartilha nome="Ana Silva" token={token} />);

  fireEvent.click(screen.getByRole('button', { name: 'Copiar link' }));
  expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/f/${token}`);
  expect(await screen.findByRole('button', { name: 'Copiado ✓' })).toBeInTheDocument();

  const wa = screen.getByRole('link', { name: 'WhatsApp' });
  expect(wa.getAttribute('href')).toContain('https://wa.me/?text=');
  expect(decodeURIComponent(wa.getAttribute('href')!)).toContain(`/f/${token}`);
});

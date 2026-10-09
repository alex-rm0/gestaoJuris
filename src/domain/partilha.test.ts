import { expect, it } from 'vitest';
import { linkFormador, linkWhatsApp, mensagemConvite } from './partilha';

it('constrói link pessoal, convite e link WhatsApp', () => {
  const link = linkFormador('https://juris.example', 'T'.repeat(32));
  expect(link).toBe(`https://juris.example/f/${'T'.repeat(32)}`);
  const msg = mensagemConvite('Ana Silva', link);
  expect(msg).toContain('Olá Ana!');
  expect(msg).toContain(link);
  expect(linkWhatsApp('a b&c')).toBe('https://wa.me/?text=a%20b%26c');
});

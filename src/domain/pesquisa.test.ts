import { expect, it } from 'vitest';
import { correspondePesquisa } from './pesquisa';

const juri = { titulo: 'Júri Técnico de Contabilidade', notas: 'Sala 2', participantes: { p1: 'Ana Silva', p2: 'Bruno Costa' } };

it('termo vazio corresponde a tudo', () => {
  expect(correspondePesquisa(juri, '')).toBe(true);
  expect(correspondePesquisa(juri, '   ')).toBe(true);
});

it('procura no título sem distinguir maiúsculas nem acentos', () => {
  expect(correspondePesquisa(juri, 'juri tecnico')).toBe(true);
  expect(correspondePesquisa(juri, 'CONTABILIDADE')).toBe(true);
});

it('procura nas notas e nos nomes dos formadores', () => {
  expect(correspondePesquisa(juri, 'sala 2')).toBe(true);
  expect(correspondePesquisa(juri, 'bruno')).toBe(true);
});

it('todas as palavras têm de aparecer', () => {
  expect(correspondePesquisa(juri, 'ana contabilidade')).toBe(true);
  expect(correspondePesquisa(juri, 'ana marketing')).toBe(false);
});

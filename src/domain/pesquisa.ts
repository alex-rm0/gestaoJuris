import type { Juri } from './tipos';

/** Minúsculas e sem acentos, para comparar "juri" com "Júri". */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Cada palavra do termo tem de aparecer no título, nas notas ou num nome de formador. */
export function correspondePesquisa(juri: Pick<Juri, 'titulo' | 'notas' | 'participantes'>, termo: string): boolean {
  const palavras = normalizar(termo).split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return true;
  const alvo = normalizar([juri.titulo, juri.notas, ...Object.values(juri.participantes)].join(' '));
  return palavras.every((p) => alvo.includes(p));
}

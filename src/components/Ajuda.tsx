import { useState, type ReactNode } from 'react';

function lerFechada(chave: string): boolean {
  try {
    return localStorage.getItem(`ajuda-fechada:${chave}`) === '1';
  } catch {
    return false;
  }
}

function guardarFechada(chave: string, fechada: boolean) {
  try {
    if (fechada) localStorage.setItem(`ajuda-fechada:${chave}`, '1');
    else localStorage.removeItem(`ajuda-fechada:${chave}`);
  } catch {
    // sem armazenamento: a escolha vale só para esta visita
  }
}

/** Caixa de ajuda que se pode fechar; fica fechada nas visitas seguintes e reabre com "?". */
export function Ajuda({ chave, titulo, children }: { chave: string; titulo: string; children: ReactNode }) {
  const [fechada, setFechada] = useState(() => lerFechada(chave));

  function alternar(valor: boolean) {
    setFechada(valor);
    guardarFechada(chave, valor);
  }

  if (fechada) {
    return (
      <button type="button" className="btn-ajuda" onClick={() => alternar(false)}>
        ? {titulo}
      </button>
    );
  }

  return (
    <aside className="ajuda" aria-label={titulo}>
      <div className="ajuda-topo">
        <strong>💡 {titulo}</strong>
        <button type="button" className="btn-texto" aria-label="Fechar ajuda" onClick={() => alternar(true)}>✕</button>
      </div>
      {children}
    </aside>
  );
}

/** Texto curto de explicação por baixo de um campo ou botão. */
export function Dica({ children }: { children: ReactNode }) {
  return <p className="dica">{children}</p>;
}

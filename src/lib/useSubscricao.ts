import { useEffect, useState } from 'react';

/** Subscreve uma fonte em tempo real; devolve `undefined` enquanto carrega. */
export function useSubscricao<T>(subscrever: (cb: (v: T) => void) => () => void, deps: unknown[]): T | undefined {
  const [valor, setValor] = useState<T | undefined>(undefined);
  useEffect(() => {
    setValor(undefined);
    return subscrever(setValor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return valor;
}

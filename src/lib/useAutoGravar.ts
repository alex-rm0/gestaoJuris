import { useCallback, useEffect, useRef, useState } from 'react';

export type EstadoGravacao = 'inativo' | 'aGuardar' | 'guardado' | 'erro';

export function useAutoGravar<T>(gravar: (v: T) => Promise<void>, atrasoMs = 500) {
  const [estado, setEstado] = useState<EstadoGravacao>('inativo');
  const gravarRef = useRef(gravar);
  gravarRef.current = gravar;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendente = useRef<{ valor: T } | null>(null);
  const montado = useRef(true);

  const executar = useCallback(async function executar(): Promise<void> {
    timer.current = undefined;
    const p = pendente.current;
    if (!p) return;
    pendente.current = null;
    try {
      await gravarRef.current(p.valor);
      if (montado.current && !pendente.current) setEstado('guardado');
    } catch {
      if (!montado.current) return;
      if (!pendente.current) pendente.current = p;
      setEstado('erro');
      timer.current = setTimeout(executar, 3000);
    }
  }, []);

  const agendar = useCallback(
    (valor: T) => {
      pendente.current = { valor };
      setEstado('aGuardar');
      clearTimeout(timer.current);
      timer.current = setTimeout(executar, atrasoMs);
    },
    [atrasoMs, executar],
  );

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      clearTimeout(timer.current);
      if (pendente.current) gravarRef.current(pendente.current.valor).catch(() => undefined);
    };
  }, []);

  return { estado, agendar };
}

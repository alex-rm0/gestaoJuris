import { useCallback, useEffect, useRef, useState } from 'react';

export type EstadoGravacao = 'inativo' | 'aGuardar' | 'guardado' | 'erro' | 'negado';

const ESPERA_INICIAL_MS = 3000;
const ESPERA_MAXIMA_MS = 60_000;

export function useAutoGravar<T>(gravar: (v: T) => Promise<void>, atrasoMs = 500) {
  const [estado, setEstado] = useState<EstadoGravacao>('inativo');
  const gravarRef = useRef(gravar);
  gravarRef.current = gravar;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendente = useRef<{ valor: T } | null>(null);
  const montado = useRef(true);
  const espera = useRef(ESPERA_INICIAL_MS);

  const executar = useCallback(async function executar(): Promise<void> {
    timer.current = undefined;
    const p = pendente.current;
    if (!p) return;
    pendente.current = null;
    try {
      await gravarRef.current(p.valor);
      espera.current = ESPERA_INICIAL_MS;
      if (montado.current && !pendente.current) setEstado('guardado');
    } catch (err) {
      if (!montado.current) return;
      // Sem permissão (link desativado, júri fechado…) não vale a pena insistir.
      if ((err as { code?: string })?.code === 'permission-denied') {
        setEstado('negado');
        return;
      }
      if (!pendente.current) pendente.current = p;
      setEstado('erro');
      timer.current = setTimeout(executar, espera.current);
      espera.current = Math.min(espera.current * 2, ESPERA_MAXIMA_MS);
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
    // Fechar o separador, recarregar ou mandar o browser para segundo plano não desmonta o React:
    // gravar já o que estiver pendente.
    const descarregar = () => {
      if (!pendente.current) return;
      clearTimeout(timer.current);
      void executar();
    };
    const aoMudarVisibilidade = () => { if (document.visibilityState === 'hidden') descarregar(); };
    window.addEventListener('pagehide', descarregar);
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    return () => {
      montado.current = false;
      window.removeEventListener('pagehide', descarregar);
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
      clearTimeout(timer.current);
      if (pendente.current) gravarRef.current(pendente.current.valor).catch(() => undefined);
    };
  }, [executar]);

  return { estado, agendar };
}

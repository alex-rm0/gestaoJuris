import { createContext, useContext, useEffect, useState } from 'react';
import { Link, Outlet, useParams } from 'react-router-dom';
import { abrirLink, type ResultadoLink } from '../../data/sessao';
import { auth, db } from '../../lib/firebase';

interface FormadorAtual { token: string; nome: string; pid: string }
const Contexto = createContext<FormadorAtual | null>(null);

export function useFormador(): FormadorAtual {
  const f = useContext(Contexto);
  if (!f) throw new Error('useFormador fora de FormadorShell');
  return f;
}

export function FormadorShell() {
  const { token = '' } = useParams();
  const [res, setRes] = useState<ResultadoLink | 'carregando' | 'erro'>('carregando');

  useEffect(() => {
    let vivo = true;
    setRes('carregando');
    abrirLink(db, auth, token).then(
      (r) => { if (vivo) setRes(r); },
      () => { if (vivo) setRes('erro'); },
    );
    return () => { vivo = false; };
  }, [token]);

  if (res === 'carregando') return <p className="centro">A carregar…</p>;
  if (res === 'erro') return <p className="centro">Não foi possível abrir o link. Verifica a ligação e tenta de novo.</p>;
  if (res.estado === 'invalido') return <p className="centro">Este link não é válido.</p>;
  if (res.estado === 'inativo') return <p className="centro">Este link já não está ativo.</p>;

  return (
    <Contexto.Provider value={{ token, nome: res.nome, pid: res.pid }}>
      <div className="app">
        <header className="topo">
          <Link className="marca" to={`/f/${token}`}>Júris</Link>
        </header>
        <main className="conteudo">
          <Outlet />
        </main>
      </div>
    </Contexto.Provider>
  );
}

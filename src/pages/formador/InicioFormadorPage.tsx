import { Link } from 'react-router-dom';
import { subscreverDisponibilidade } from '../../data/disponibilidades';
import { subscreverJurisDoFormador } from '../../data/juris';
import { formatarData, formatarIntervalo } from '../../domain/formatar';
import { fimDe } from '../../domain/slots';
import { respondeu } from '../../domain/sugestoes';
import type { Disponibilidade, Juri } from '../../domain/tipos';
import { db } from '../../lib/firebase';
import { useSubscricao } from '../../lib/useSubscricao';
import { useFormador } from './FormadorShell';

export function InicioFormadorPage() {
  const { nome, pid } = useFormador();
  const juris = useSubscricao<Juri[]>((cb) => subscreverJurisDoFormador(db, pid, cb), [pid]);
  if (!juris) return <p>A carregar…</p>;

  const abertos = juris.filter((j) => j.estado === 'aberto').sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));
  const marcados = juris.filter((j) => j.estado === 'marcado').sort((a, b) => (a.dataMarcada ?? '').localeCompare(b.dataMarcada ?? ''));

  return (
    <section>
      <h1>Olá, {nome.split(' ')[0]} 👋</h1>
      <h2>Júris abertos</h2>
      {abertos.length === 0 ? (
        <p className="vazio">Não tens júris pendentes.</p>
      ) : (
        <ul className="lista">{abertos.map((j) => <CartaoAberto key={j.id} juri={j} />)}</ul>
      )}
      {marcados.length > 0 && (
        <>
          <h2>Marcados</h2>
          <ul className="lista">
            {marcados.map((j) => (
              <li key={j.id} className="cartao">
                <strong>{j.titulo}</strong>
                <p>✅ {j.dataMarcada && formatarIntervalo(j.dataMarcada, fimDe(j.dataMarcada, j.duracaoMin))}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function CartaoAberto({ juri }: { juri: Juri }) {
  const { token, pid } = useFormador();
  const minha = useSubscricao<Disponibilidade | null>((cb) => subscreverDisponibilidade(db, juri.id, pid, cb), [juri.id, pid]);
  const feito = respondeu(juri, minha ?? undefined);
  return (
    <li>
      <Link to={`/f/${token}/juri/${juri.id}`} className="cartao cartao-juri">
        <div className="linha">
          <strong>{juri.titulo}</strong>
          {minha !== undefined && <span className={`etiqueta ${feito ? 'marcado' : 'aberto'}`}>{feito ? 'Preenchido' : 'Por preencher'}</span>}
        </div>
        <p className="subtil">{formatarData(juri.dataInicio)} a {formatarData(juri.dataFim)}</p>
        <span className="btn primario">{feito ? 'Rever disponibilidade' : 'Indicar disponibilidade'}</span>
      </Link>
    </li>
  );
}

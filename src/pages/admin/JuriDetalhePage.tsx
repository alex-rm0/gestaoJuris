import { Link, useNavigate, useParams } from 'react-router-dom';
import { BotoesPartilha } from '../../components/BotoesPartilha';
import { GrelhaDisponibilidade } from '../../components/GrelhaDisponibilidade';
import { subscreverDisponibilidades } from '../../data/disponibilidades';
import { subscreverFormadores } from '../../data/formadores';
import { cancelarJuri, eliminarJuri, marcarJuri, reabrirJuri, subscreverJuri } from '../../data/juris';
import { formatarData, formatarIntervalo } from '../../domain/formatar';
import { eInicioValido, fimDe } from '../../domain/slots';
import { contarPorSlot, respondeu, sugerirDatas } from '../../domain/sugestoes';
import type { Disponibilidade, Formador, Juri } from '../../domain/tipos';
import { db } from '../../lib/firebase';
import { useSubscricao } from '../../lib/useSubscricao';

const MEDALHAS = ['🥇', '🥈', '🥉', '4.º', '5.º'];

export function JuriDetalhePage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const juri = useSubscricao<Juri | null>((cb) => subscreverJuri(db, id, cb), [id]);
  const disps = useSubscricao<Disponibilidade[]>((cb) => subscreverDisponibilidades(db, id, cb), [id]);
  const formadores = useSubscricao<Formador[]>((cb) => subscreverFormadores(db, cb), []);

  if (juri === undefined || disps === undefined) return <p>A carregar…</p>;
  if (juri === null) return <p>Júri não encontrado.</p>;

  const total = juri.participantesIds.length;
  const nome = (pid: string) => juri.participantes[pid] ?? '—';
  const r = sugerirDatas(juri, disps);
  const porSlot = contarPorSlot(juri, juri.participantesIds, disps);
  const nomesPorSlot = new Map([...porSlot].map(([s, pids]) => [s, pids.map(nome)]));
  const emFaltaResponder = juri.participantesIds.filter((p) => !respondeu(juri, disps.find((d) => d.pid === p)));
  const tokenDe = (pid: string) => formadores?.find((f) => f.pid === pid)?.token;
  const aberto = juri.estado === 'aberto';

  async function marcar(inicio: string) {
    if (!confirm(`Marcar “${juri!.titulo}” para ${formatarIntervalo(inicio, fimDe(inicio, juri!.duracaoMin))}?`)) return;
    await marcarJuri(db, juri!.id, inicio);
  }

  async function eliminar() {
    if (!confirm(`Eliminar «${juri!.titulo}»? As disponibilidades dos formadores também são apagadas. Isto não pode ser desfeito.`)) return;
    try {
      await eliminarJuri(db, juri!.id);
      nav('/', { replace: true });
    } catch {
      alert('Não foi possível eliminar. Verifica a ligação e tenta de novo.');
    }
  }

  async function cancelar() {
    if (confirm(`Cancelar “${juri!.titulo}”?`)) await cancelarJuri(db, juri!.id);
  }

  return (
    <section className="detalhe">
      <div className="cabecalho">
        <div>
          <h1>{juri.titulo}</h1>
          <p className="subtil">
            {formatarData(juri.dataInicio)} a {formatarData(juri.dataFim)} · {juri.horaInicio}–{juri.horaFim} · {juri.duracaoMin} min
          </p>
          {juri.notas && <p className="subtil">{juri.notas}</p>}
        </div>
        <div className="acoes">
          <Link className="btn" to={`/juris/${juri.id}/editar`}>Editar</Link>
          {aberto && <button className="btn perigo" onClick={cancelar}>Cancelar júri</button>}
          {!aberto && <button className="btn" onClick={() => reabrirJuri(db, juri.id)}>Reabrir</button>}
          <button className="btn perigo" onClick={eliminar}>Eliminar</button>
        </div>
      </div>

      {juri.estado === 'marcado' && juri.dataMarcada && (
        <p className="sucesso">✅ Marcado para <strong>{formatarIntervalo(juri.dataMarcada, fimDe(juri.dataMarcada, juri.duracaoMin))}</strong></p>
      )}
      {juri.estado === 'cancelado' && <p className="aviso">Este júri está cancelado.</p>}

      {aberto && (
        <>
          <h2>Sugestões</h2>
          {r.semRespostas ? (
            <p className="subtil">Ainda sem respostas.</p>
          ) : (
            <>
              {!r.haDataComTodos && <p className="aviso">⚠️ Não há nenhuma data em que todos possam. Estas são as melhores opções:</p>}
              <ol className="lista sugestoes">
                {r.sugestoes.map((s, i) => (
                  <li key={s.inicio} className="cartao sugestao">
                    <div>
                      <span className="medalha">{MEDALHAS[i]}</span>{' '}
                      <strong>{formatarIntervalo(s.inicio, s.fim)}</strong>{' '}
                      <span className="subtil">· {s.disponiveis.length}/{total}{s.emFalta.length === 0 ? ' — todos' : ''}</span>
                      {s.emFalta.length > 0 && <p className="subtil">Falta: {s.emFalta.map(nome).join(', ')}</p>}
                    </div>
                    <button className="btn primario" onClick={() => marcar(s.inicio)}>Marcar</button>
                  </li>
                ))}
              </ol>
            </>
          )}
        </>
      )}

      <h2>Disponibilidades</h2>
      <p className="subtil">Toca num bloco para ver quem pode.</p>
      <GrelhaDisponibilidade
        cfg={juri}
        disponiveis={nomesPorSlot}
        total={total}
        destaque={juri.dataMarcada}
        infoExtra={(slot) =>
          aberto && eInicioValido(juri, slot) ? (
            <button className="btn primario" onClick={() => marcar(slot)}>Marcar a partir deste bloco</button>
          ) : null
        }
      />

      {aberto && (
        <>
          <h2>Quem falta responder ({emFaltaResponder.length})</h2>
          {emFaltaResponder.length === 0 ? (
            <p className="subtil">Já responderam todos. 🎉</p>
          ) : (
            <ul className="lista">
              {emFaltaResponder.map((pid) => {
                const token = tokenDe(pid);
                return (
                  <li key={pid} className="cartao linha">
                    <strong>{nome(pid)}</strong>
                    <div className="acoes">{token && <BotoesPartilha nome={nome(pid)} token={token} />}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

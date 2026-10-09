import { Link, useNavigate, useParams } from 'react-router-dom';
import { BotoesPartilha } from '../../components/BotoesPartilha';
import { Ajuda, Dica } from '../../components/Ajuda';
import { GrelhaDisponibilidade, LegendaGrelha } from '../../components/GrelhaDisponibilidade';
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
    if (!confirm(`Marcar “${juri!.titulo}” para ${formatarIntervalo(inicio, fimDe(inicio, juri!.duracaoMin))}?\n\nOs formadores passam a ver esta data como marcada. Pode sempre reabrir o júri depois.`)) return;
    await marcarJuri(db, juri!.id, inicio);
  }

  async function eliminar() {
    if (!confirm(`Eliminar «${juri!.titulo}»? As disponibilidades dos formadores também são apagadas. Isto não pode ser desfeito.`)) return;
    try {
      await eliminarJuri(db, juri!.id);
      nav('/', { replace: true });
    } catch {
      alert('Não foi possível eliminar. Verifique a ligação e tente de novo.');
    }
  }

  async function cancelar() {
    if (confirm(`Cancelar “${juri!.titulo}”?\n\nO júri fica guardado como cancelado e os formadores deixam de o poder preencher. Pode reabri-lo mais tarde.`)) await cancelarJuri(db, juri!.id);
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
          <Link className="btn" to={`/juris/${juri.id}/editar`} title="Alterar datas, horário, duração ou formadores">Editar</Link>
          {aberto && <button className="btn perigo" title="Guarda o júri como cancelado. Pode ser reaberto." onClick={cancelar}>Cancelar júri</button>}
          {!aberto && <button className="btn" title="Volta a abrir o júri para os formadores preencherem e apaga a data marcada" onClick={() => reabrirJuri(db, juri.id)}>Reabrir</button>}
          <button className="btn perigo" title="Apaga o júri e as respostas de vez" onClick={eliminar}>Eliminar</button>
        </div>
      </div>
      <Dica><strong>Cancelar</strong> guarda o júri e pode ser reaberto. <strong>Eliminar</strong> apaga tudo de vez.</Dica>

      <Ajuda chave="juri-detalhe" titulo="Como ler esta página">
        <ol>
          <li><strong>Sugestões:</strong> as melhores datas, das que juntam mais formadores para as que juntam menos. Carregue em <strong>Marcar</strong> na que preferir.</li>
          <li><strong>Disponibilidades:</strong> a grelha com todos os dias e horas. Quanto mais escuro o quadrado, mais formadores podem. Toque num quadrado para ver quem pode.</li>
          <li><strong>Quem falta responder:</strong> os formadores que ainda não indicaram nada. Pode reenviar-lhes o link daqui.</li>
        </ol>
      </Ajuda>

      {juri.estado === 'marcado' && juri.dataMarcada && (
        <p className="sucesso">✅ Marcado para <strong>{formatarIntervalo(juri.dataMarcada, fimDe(juri.dataMarcada, juri.duracaoMin))}</strong></p>
      )}
      {juri.estado === 'cancelado' && <p className="aviso">Este júri está cancelado.</p>}

      {aberto && (
        <>
          <h2>Sugestões</h2>
          {r.semRespostas ? (
            <p className="subtil">Ainda nenhum formador respondeu. Envie-lhes o link (lista “Quem falta responder”, mais abaixo) e as sugestões aparecem aqui automaticamente.</p>
          ) : (
            <>
              {r.haDataComTodos
                ? <Dica>A primeira sugestão junta todos os formadores. Carregue em <strong>Marcar</strong> para fixar a data.</Dica>
                : <p className="aviso">⚠️ Ainda não há nenhuma data em que todos possam. Estas são as melhores opções — em cada uma diz quem falta. Pode esperar por mais respostas ou marcar uma delas.</p>}
              <ol className="lista sugestoes">
                {r.sugestoes.map((s, i) => (
                  <li key={s.inicio} className="cartao sugestao">
                    <div>
                      <span className="medalha">{MEDALHAS[i]}</span>{' '}
                      <strong>{formatarIntervalo(s.inicio, s.fim)}</strong>{' '}
                      <span className="subtil">· {s.disponiveis.length}/{total}{s.emFalta.length === 0 ? ' — todos' : ''}</span>
                      {s.emFalta.length > 0 && <p className="subtil">Falta: {s.emFalta.map(nome).join(', ')}</p>}
                    </div>
                    <button className="btn primario" title="Fixa esta data. Os formadores passam a vê-la como marcada." onClick={() => marcar(s.inicio)}>Marcar</button>
                  </li>
                ))}
              </ol>
            </>
          )}
        </>
      )}

      <h2>Disponibilidades</h2>
      <p className="subtil">Cada quadrado é meia hora. Toque ou clique num quadrado para ver quem pode nessa hora{aberto ? ' e, se quiser, marcar o júri a começar aí' : ''}.</p>
      <LegendaGrelha modo="gestao" />
      <GrelhaDisponibilidade
        cfg={juri}
        disponiveis={nomesPorSlot}
        total={total}
        destaque={juri.dataMarcada}
        infoExtra={(slot) =>
          aberto && eInicioValido(juri, slot) ? (
            <button className="btn primario" onClick={() => marcar(slot)}>Marcar o júri a começar a esta hora</button>
          ) : null
        }
      />

      {aberto && (
        <>
          <h2>Quem falta responder ({emFaltaResponder.length})</h2>
          {emFaltaResponder.length === 0 ? (
            <p className="subtil">Já responderam todos. 🎉</p>
          ) : (
            <>
            <Dica>Estes formadores ainda não indicaram nenhuma disponibilidade. Pode reenviar-lhes o link pelo WhatsApp.</Dica>
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
            </>
          )}
        </>
      )}
    </section>
  );
}

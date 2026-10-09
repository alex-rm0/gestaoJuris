import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Ajuda } from '../../components/Ajuda';
import { GrelhaDisponibilidade, LegendaGrelha } from '../../components/GrelhaDisponibilidade';
import { guardarDisponibilidade, subscreverDisponibilidades } from '../../data/disponibilidades';
import { subscreverJuri } from '../../data/juris';
import { formatarData, formatarIntervalo } from '../../domain/formatar';
import { fimDe } from '../../domain/slots';
import { contarPorSlot } from '../../domain/sugestoes';
import type { Disponibilidade, Juri } from '../../domain/tipos';
import { db } from '../../lib/firebase';
import { useAutoGravar, type EstadoGravacao } from '../../lib/useAutoGravar';
import { useOnline } from '../../lib/useOnline';
import { useSubscricao } from '../../lib/useSubscricao';
import { useFormador } from './FormadorShell';

const TEXTO_ESTADO: Record<EstadoGravacao, string> = {
  inativo: '',
  aGuardar: 'A guardar…',
  guardado: 'Guardado ✓',
  erro: 'Não foi possível guardar — a tentar de novo…',
  negado: 'Não foi possível guardar: este link já não está ativo ou o júri foi fechado. Recarrega a página.',
};

export function PreencherJuriPage() {
  const { token, pid } = useFormador();
  const { id = '' } = useParams();
  const juri = useSubscricao<Juri | null>((cb) => subscreverJuri(db, id, cb), [id]);
  const disps = useSubscricao<Disponibilidade[]>((cb) => subscreverDisponibilidades(db, id, cb), [id]);
  const [sel, setSel] = useState<Set<string> | null>(null);
  const { estado, agendar } = useAutoGravar<string[]>((slots) => guardarDisponibilidade(db, id, pid, slots));
  const online = useOnline();

  useEffect(() => {
    if (sel === null && disps) setSel(new Set(disps.find((d) => d.pid === pid)?.slots ?? []));
  }, [disps, pid, sel]);

  if (juri === undefined || disps === undefined || sel === null) return <p>A carregar…</p>;
  if (juri === null || !juri.participantesIds.includes(pid)) {
    return <p>Este júri não existe ou já não fazes parte dele. <Link to={`/f/${token}`}>Voltar</Link></p>;
  }

  const outros = juri.participantesIds.filter((p) => p !== pid);
  const porSlot = contarPorSlot(juri, outros, disps);
  const nomesPorSlot = new Map([...porSlot].map(([s, pids]) => [s, pids.map((p) => juri.participantes[p] ?? '—')]));
  const editavel = juri.estado === 'aberto';

  function mudar(s: Set<string>) {
    setSel(s);
    agendar([...s]);
  }

  return (
    <section>
      <Link to={`/f/${token}`}>‹ Os meus júris</Link>
      <h1>{juri.titulo}</h1>
      <p className="subtil">{formatarData(juri.dataInicio)} a {formatarData(juri.dataFim)} · duração {juri.duracaoMin} min</p>
      {juri.notas && <p className="subtil">{juri.notas}</p>}

      {juri.estado === 'marcado' && juri.dataMarcada && (
        <p className="sucesso">✅ Marcado para <strong>{formatarIntervalo(juri.dataMarcada, fimDe(juri.dataMarcada, juri.duracaoMin))}</strong></p>
      )}
      {juri.estado === 'cancelado' && <p className="aviso">Este júri foi cancelado. Já não precisas de fazer nada.</p>}
      {juri.estado === 'marcado' && <p className="subtil">A data já está marcada, por isso a grelha só pode ser consultada.</p>}
      {!editavel && estado === 'negado' && <p className="erro">{TEXTO_ESTADO.negado}</p>}

      {editavel && (
        <div className="instrucoes">
          <Ajuda chave="formador-preencher" titulo="Como indicar quando podes">
            <ol>
              <li>Cada quadrado é meia hora. <strong>Carrega num quadrado e arrasta</strong> (com o dedo ou o rato) sobre as horas em que podes — ficam a <strong>verde</strong>.</li>
              <li>Ex.: se podes terça das 10h às 12h, carrega no quadrado das 10:00 de terça e arrasta até ao das 11:30.</li>
              <li>Enganaste-te? Arrasta de novo por cima para tirar.</li>
              <li>Não há botão de enviar: <strong>fica guardado sozinho</strong> (aparece “Guardado ✓”).</li>
            </ol>
            <p>Os quadrados a <strong>azul</strong> são horas em que colegas já podem — se conseguires, escolhe também essas.</p>
          </Ajuda>
          <LegendaGrelha modo="formador" />
          <p className={`estado-gravacao ${estado}`} aria-live="polite">
            {!online ? 'Sem ligação — as alterações serão guardadas quando voltar.' : TEXTO_ESTADO[estado]}
          </p>
        </div>
      )}

      <GrelhaDisponibilidade
        cfg={juri}
        selecionados={sel}
        onChange={editavel ? mudar : undefined}
        disponiveis={nomesPorSlot}
        total={Math.max(outros.length, 1)}
        destaque={juri.dataMarcada}
      />
    </section>
  );
}

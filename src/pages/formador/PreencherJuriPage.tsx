import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { GrelhaDisponibilidade } from '../../components/GrelhaDisponibilidade';
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
      {juri.estado === 'cancelado' && <p className="aviso">Este júri foi cancelado.</p>}

      {editavel && (
        <div className="instrucoes">
          <p>Arrasta sobre os horários em que <strong>podes</strong> (fica a verde). Para tirar, arrasta de novo por cima.</p>
          <p className="subtil">O azul por trás mostra onde os colegas já podem — tenta encaixar-te aí.</p>
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

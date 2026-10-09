import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ajuda } from '../../components/Ajuda';
import { subscreverDisponibilidades } from '../../data/disponibilidades';
import { subscreverJuris } from '../../data/juris';
import { formatarData, formatarIntervalo } from '../../domain/formatar';
import { correspondePesquisa } from '../../domain/pesquisa';
import { fimDe } from '../../domain/slots';
import { respondeu, sugerirDatas } from '../../domain/sugestoes';
import type { Disponibilidade, EstadoJuri, Juri } from '../../domain/tipos';
import { db } from '../../lib/firebase';
import { useSubscricao } from '../../lib/useSubscricao';

const ORDEM: Record<EstadoJuri, number> = { aberto: 0, marcado: 1, cancelado: 2 };
const ROTULO: Record<EstadoJuri, string> = { aberto: 'Aberto', marcado: 'Marcado', cancelado: 'Cancelado' };

export function PainelPage() {
  const juris = useSubscricao<Juri[]>((cb) => subscreverJuris(db, cb), []);
  const [filtro, setFiltro] = useState<EstadoJuri | 'todos'>('todos');
  const [pesquisa, setPesquisa] = useState('');

  if (!juris) return <p>A carregar…</p>;
  const lista = juris
    .filter((j) => filtro === 'todos' || j.estado === filtro)
    .filter((j) => correspondePesquisa(j, pesquisa))
    .sort((a, b) => ORDEM[a.estado] - ORDEM[b.estado] || a.dataInicio.localeCompare(b.dataInicio));

  return (
    <section>
      <div className="cabecalho">
        <h1>Júris</h1>
        <Link className="btn primario" to="/juris/novo" title="Criar um júri e escolher o período e os formadores">+ Novo júri</Link>
      </div>
      <Ajuda chave="painel" titulo="Como funciona">
        <ol>
          <li>Adicione os formadores em <Link to="/formadores">Formadores</Link> (só é preciso uma vez).</li>
          <li>Carregue em <strong>+ Novo júri</strong>, escolha o período em que pode acontecer e os formadores.</li>
          <li>Envie a cada formador o seu link pessoal (botão <strong>WhatsApp</strong>). Eles marcam quando podem.</li>
          <li>Volte aqui: em cada júri aparece a melhor data. Abra o júri e carregue em <strong>Marcar</strong>.</li>
        </ol>
      </Ajuda>
      <div className="barra-filtros">
      <input type="search" className="pesquisa-juris" placeholder="Pesquisar júris (título, notas ou formador)" value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} aria-label="Pesquisar júris" />
      <select className="filtro" value={filtro} onChange={(e) => setFiltro(e.target.value as EstadoJuri | 'todos')} aria-label="Filtrar por estado">
        <option value="todos">Todos</option>
        <option value="aberto">Abertos</option>
        <option value="marcado">Marcados</option>
        <option value="cancelado">Cancelados</option>
      </select>
      </div>
      {juris.length === 0 && <p className="vazio">Ainda não há júris. Crie o primeiro com o botão “+ Novo júri”, no canto superior direito.</p>}
      {juris.length > 0 && lista.length === 0 && <p className="vazio">{pesquisa.trim() ? 'Nenhum júri corresponde à pesquisa.' : 'Nenhum júri neste estado.'}</p>}
      <ul className="lista cartoes-juri">
        {lista.map((j) => <CartaoJuri key={j.id} juri={j} />)}
      </ul>
    </section>
  );
}

function CartaoJuri({ juri }: { juri: Juri }) {
  const disps = useSubscricao<Disponibilidade[]>((cb) => subscreverDisponibilidades(db, juri.id, cb), [juri.id]);
  const total = juri.participantesIds.length;
  const responderam = disps ? juri.participantesIds.filter((p) => respondeu(juri, disps.find((d) => d.pid === p))).length : 0;
  const r = disps ? sugerirDatas(juri, disps) : null;
  const melhor = r?.sugestoes[0];

  return (
    <li>
      <Link to={`/juris/${juri.id}`} className="cartao cartao-juri">
        <div className="linha">
          <strong>{juri.titulo}</strong>
          <span className={`etiqueta ${juri.estado}`}>{ROTULO[juri.estado]}</span>
        </div>
        <p className="subtil">{formatarData(juri.dataInicio)} a {formatarData(juri.dataFim)}</p>
        {juri.estado === 'aberto' && (
          <>
            <div className="progresso" aria-label={`Responderam ${responderam} de ${total}`}>
              <div style={{ width: `${total ? (responderam / total) * 100 : 0}%` }} />
            </div>
            <p className="subtil">Responderam {responderam}/{total}</p>
            {r && (r.semRespostas
              ? <p className="subtil">Ainda sem respostas — envie os links aos formadores</p>
              : melhor && <p>Melhor data até agora: <strong>{formatarIntervalo(melhor.inicio, melhor.fim)}</strong> · {melhor.disponiveis.length}/{total}</p>)}
          </>
        )}
        {juri.estado === 'marcado' && juri.dataMarcada && (
          <p>✅ {formatarIntervalo(juri.dataMarcada, fimDe(juri.dataMarcada, juri.duracaoMin))}</p>
        )}
      </Link>
    </li>
  );
}

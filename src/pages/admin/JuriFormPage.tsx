import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Ajuda, Dica } from '../../components/Ajuda';
import { obterDisponibilidades } from '../../data/disponibilidades';
import { subscreverFormadores } from '../../data/formadores';
import { criarJuri, editarJuri, obterJuri } from '../../data/juris';
import { validarJuri, type ErrosJuri } from '../../domain/slots';
import type { Formador, Juri, JuriInput } from '../../domain/tipos';
import { db } from '../../lib/firebase';
import { useSubscricao } from '../../lib/useSubscricao';

const DIAS_SEMANA: [number, string][] = [[1, 'seg'], [2, 'ter'], [3, 'qua'], [4, 'qui'], [5, 'sex'], [6, 'sáb'], [7, 'dom']];
const DURACOES = [30, 60, 90, 120, 150, 180, 210, 240];
const NOVO: JuriInput = {
  titulo: '', notas: '', dataInicio: '', dataFim: '',
  horaInicio: '09:00', horaFim: '19:00', diasSemana: [1, 2, 3, 4, 5], duracaoMin: 60,
};

const assinatura = (j: JuriInput) => [j.dataInicio, j.dataFim, j.horaInicio, j.horaFim, j.diasSemana.join(','), j.duracaoMin].join('|');

export function JuriFormPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const formadores = useSubscricao<Formador[]>((cb) => subscreverFormadores(db, cb), []);
  const [form, setForm] = useState<JuriInput>(NOVO);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [original, setOriginal] = useState<Juri | null>(null);
  const [carga, setCarga] = useState<'aCarregar' | 'pronto' | 'naoEncontrado'>(id ? 'aCarregar' : 'pronto');
  const [temRespostas, setTemRespostas] = useState(false);
  const [erros, setErros] = useState<ErrosJuri>({});
  const [filtro, setFiltro] = useState('');
  const [aGuardar, setAGuardar] = useState(false);

  useEffect(() => {
    if (!id) return;
    let vivo = true;
    Promise.all([obterJuri(db, id), obterDisponibilidades(db, id)]).then(([j, ds]) => {
      if (!vivo) return;
      if (!j) return setCarga('naoEncontrado');
      setOriginal(j);
      setForm({
        titulo: j.titulo, notas: j.notas, dataInicio: j.dataInicio, dataFim: j.dataFim,
        horaInicio: j.horaInicio, horaFim: j.horaFim, diasSemana: j.diasSemana, duracaoMin: j.duracaoMin,
      });
      setSel(new Set(j.participantesIds));
      setTemRespostas(ds.some((d) => d.slots.length > 0));
      setCarga('pronto');
    });
    return () => { vivo = false; };
  }, [id]);

  if (carga === 'naoEncontrado') return <p>Júri não encontrado.</p>;
  if (!formadores || carga === 'aCarregar') return <p>A carregar…</p>;

  const mudouGrelha = original !== null && assinatura(form) !== assinatura(original);
  const termo = filtro.trim().toLowerCase();
  const opcoes = formadores
    .filter((f) => f.ativo || sel.has(f.pid))
    .filter((f) => `${f.nome} ${f.area}`.toLowerCase().includes(termo));

  function alterar<K extends keyof JuriInput>(k: K, v: JuriInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function alternarDia(d: number) {
    alterar('diasSemana', form.diasSemana.includes(d) ? form.diasSemana.filter((x) => x !== d) : [...form.diasSemana, d].sort((a, b) => a - b));
  }

  function alternarFormador(pid: string) {
    setSel((s) => {
      const n = new Set(s);
      if (n.has(pid)) n.delete(pid);
      else n.add(pid);
      return n;
    });
  }

  async function submeter(e: FormEvent) {
    e.preventDefault();
    const es = validarJuri(form, sel.size);
    setErros(es);
    if (Object.keys(es).length > 0) return;
    const participantes = Object.fromEntries(formadores!.filter((f) => sel.has(f.pid)).map((f) => [f.pid, f.nome]));
    setAGuardar(true);
    try {
      let juriId = id;
      if (juriId) await editarJuri(db, juriId, form, participantes);
      else juriId = await criarJuri(db, form, participantes);
      nav(`/juris/${juriId}`);
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <form className="juri-form" onSubmit={submeter} noValidate>
      <h1>{id ? 'Editar júri' : 'Novo júri'}</h1>
      <Ajuda chave="juri-form" titulo="Como preencher">
        <p>Defina <strong>quando</strong> o júri pode acontecer e <strong>quem</strong> tem de estar presente. Os formadores escolhidos só vão ver esses dias e horas para indicar quando podem.</p>
        <p>Não precisa de saber já a data certa — é para isso que serve a app.</p>
      </Ajuda>

      <div className="cartao campos">
        <label>Título<input value={form.titulo} onChange={(e) => alterar('titulo', e.target.value)} placeholder="Ex.: Júri Técnico de Contabilidade" /></label>
        <Dica>O nome que os formadores vão ver.</Dica>
        {erros.titulo && <p className="erro">{erros.titulo}</p>}

        <div className="duas-colunas">
          <label>De<input type="date" value={form.dataInicio} onChange={(e) => alterar('dataInicio', e.target.value)} /></label>
          <label>Até<input type="date" value={form.dataFim} onChange={(e) => alterar('dataFim', e.target.value)} /></label>
        </div>
        <Dica>Período em que o júri pode acontecer. Os formadores só veem estes dias.</Dica>
        {erros.datas && <p className="erro">{erros.datas}</p>}

        <div className="duas-colunas">
          <label>Das<input type="time" step={1800} value={form.horaInicio} onChange={(e) => alterar('horaInicio', e.target.value)} /></label>
          <label>Às<input type="time" step={1800} value={form.horaFim} onChange={(e) => alterar('horaFim', e.target.value)} /></label>
        </div>
        <Dica>Horário de cada dia em que os formadores podem indicar disponibilidade (em horas certas ou meias horas, ex.: 09:00 ou 09:30).</Dica>
        {erros.horas && <p className="erro">{erros.horas}</p>}

        <fieldset className="dias">
          <legend>Dias da semana</legend>
          {DIAS_SEMANA.map(([n, rotulo]) => (
            <label key={n} className="chip">
              <input type="checkbox" checked={form.diasSemana.includes(n)} onChange={() => alternarDia(n)} />
              {rotulo}
            </label>
          ))}
        </fieldset>
        <Dica>Os dias desmarcados não aparecem aos formadores.</Dica>
        {erros.diasSemana && <p className="erro">{erros.diasSemana}</p>}

        <label>Duração
          <select value={form.duracaoMin} onChange={(e) => alterar('duracaoMin', Number(e.target.value))}>
            {DURACOES.map((d) => <option key={d} value={d}>{d < 60 ? `${d} min` : `${Math.floor(d / 60)} h${d % 60 ? ' 30' : ''}`}</option>)}
          </select>
        </label>
        <Dica>Quanto tempo dura o júri. A app procura horários seguidos com esta duração em que os formadores possam.</Dica>
        {erros.duracaoMin && <p className="erro">{erros.duracaoMin}</p>}

        <label>Notas (opcional)<textarea rows={2} value={form.notas} onChange={(e) => alterar('notas', e.target.value)} placeholder="Ex.: Sala 2, levar processos" /></label>
        <Dica>Os formadores também veem as notas.</Dica>
      </div>

      {mudouGrelha && temRespostas && (
        <p className="aviso">Já há respostas neste júri. As disponibilidades que ficarem fora do novo período ou horário deixam de contar (não são apagadas).</p>
      )}

      <h2>Formadores ({sel.size} escolhidos)</h2>
      <Dica>Marque os formadores que têm de estar no júri. Só eles recebem este júri no link pessoal.</Dica>
      <input className="pesquisa" type="search" aria-label="Pesquisar formadores" placeholder="Pesquisar por nome ou área" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
      {erros.participantes && <p className="erro">{erros.participantes}</p>}
      <ul className="lista escolha-formadores">
        {opcoes.map((f) => (
          <li key={f.pid}>
            <label className="cartao linha-escolha">
              <input type="checkbox" checked={sel.has(f.pid)} onChange={() => alternarFormador(f.pid)} />
              <span><strong>{f.nome}</strong><span className="subtil"> {f.area}</span></span>
            </label>
          </li>
        ))}
        {opcoes.length === 0 && <p className="vazio">Ainda não há formadores. Primeiro <Link to="/formadores">adicione os formadores</Link> e depois volte aqui.</p>}
      </ul>

      <div className="acoes">
        <button className="btn primario" disabled={aGuardar}>{aGuardar ? 'A guardar…' : id ? 'Guardar alterações' : 'Criar júri'}</button>
        <Link className="btn" to={id ? `/juris/${id}` : '/'}>Voltar sem guardar</Link>
      </div>
    </form>
  );
}

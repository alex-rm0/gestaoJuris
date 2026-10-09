import { useState, type FormEvent } from 'react';
import { Ajuda, Dica } from '../../components/Ajuda';
import { BotoesPartilha } from '../../components/BotoesPartilha';
import { criarFormador, editarFormador, regenerarLink, subscreverFormadores } from '../../data/formadores';
import type { Formador } from '../../domain/tipos';
import { db } from '../../lib/firebase';
import { useSubscricao } from '../../lib/useSubscricao';

const ERRO_GUARDAR = 'Não foi possível guardar. Verifique a ligação e tente de novo.';

/** Corre uma ação de gravação e devolve a mensagem de erro (ou null). */
async function tentar(acao: () => Promise<unknown>): Promise<string | null> {
  try {
    await acao();
    return null;
  } catch {
    return ERRO_GUARDAR;
  }
}

export function FormadoresPage() {
  const formadores = useSubscricao<Formador[]>((cb) => subscreverFormadores(db, cb), []);
  const [nome, setNome] = useState('');
  const [area, setArea] = useState('');
  const [filtro, setFiltro] = useState('');
  const [aAdicionar, setAAdicionar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim() || aAdicionar) return;
    setAAdicionar(true);
    setErro(null);
    try {
      await criarFormador(db, { nome, area });
      setNome('');
      setArea('');
    } catch {
      setErro(ERRO_GUARDAR);
    } finally {
      setAAdicionar(false);
    }
  }

  if (!formadores) return <p>A carregar…</p>;
  const termo = filtro.trim().toLowerCase();
  const visiveis = formadores.filter((f) => `${f.nome} ${f.area}`.toLowerCase().includes(termo));

  return (
    <section>
      <h1>Formadores</h1>
      <Ajuda chave="formadores" titulo="Como funcionam os formadores">
        <ol>
          <li>Adicione cada formador uma vez, com o nome e a área (a área é só para si, para os encontrar mais depressa).</li>
          <li>Cada formador tem um <strong>link pessoal</strong>. Envie-o com o botão <strong>WhatsApp</strong> ou <strong>Copiar link</strong>.</li>
          <li>O link é sempre o mesmo: o formador só precisa de o receber uma vez e serve para todos os júris.</li>
        </ol>
      </Ajuda>
      <form className="cartao form-linha" onSubmit={adicionar}>
        <input placeholder="Nome do formador" value={nome} onChange={(e) => setNome(e.target.value)} required aria-label="Nome do formador" />
        <input placeholder="Área(s), ex.: Contabilidade, Gestão" value={area} onChange={(e) => setArea(e.target.value)} aria-label="Área(s)" />
        <button className="btn primario" disabled={aAdicionar}>{aAdicionar ? 'A adicionar…' : 'Adicionar'}</button>
      </form>
      {erro && <p className="erro">{erro}</p>}
      <input className="pesquisa" type="search" aria-label="Pesquisar formadores" placeholder="Pesquisar por nome ou área" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
      {visiveis.length === 0 && (
        <p className="vazio">{formadores.length ? 'Nenhum formador corresponde à pesquisa.' : 'Ainda não há formadores. Escreva o nome do primeiro acima e carregue em Adicionar.'}</p>
      )}
      <ul className="lista">
        {visiveis.map((f) => <LinhaFormador key={f.token} f={f} />)}
      </ul>
    </section>
  );
}

function LinhaFormador({ f }: { f: Formador }) {
  const [aEditar, setAEditar] = useState(false);
  const [nome, setNome] = useState(f.nome);
  const [area, setArea] = useState(f.area);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function executar(acao: () => Promise<unknown>): Promise<boolean> {
    if (ocupado) return false;
    setOcupado(true);
    const e = await tentar(acao);
    setErro(e);
    setOcupado(false);
    return e === null;
  }

  async function guardar() {
    if (!nome.trim()) return;
    if (await executar(() => editarFormador(db, f.token, { nome, area }))) setAEditar(false);
  }

  function cancelar() {
    setNome(f.nome);
    setArea(f.area);
    setAEditar(false);
  }

  async function novoLink() {
    if (!confirm(`Gerar um novo link para ${f.nome}? O link antigo deixa de funcionar e terá de enviar o novo ao formador. As disponibilidades que ele já indicou mantêm-se.`)) return;
    await executar(() => regenerarLink(db, f.token));
  }

  return (
    <li className={`cartao formador ${f.ativo ? '' : 'inativo'}`}>
      {aEditar ? (
        <div className="form-linha">
          <input value={nome} onChange={(e) => setNome(e.target.value)} aria-label="Nome" />
          <textarea value={area} onChange={(e) => setArea(e.target.value)} rows={2} aria-label="Área(s)" />
          <button className="btn primario" onClick={guardar} disabled={ocupado}>Guardar</button>
          <button className="btn" onClick={cancelar}>Cancelar</button>
        </div>
      ) : (
        <div>
          <strong>{f.nome}</strong>
          {!f.ativo && <span className="etiqueta">inativo</span>}
          <p className="subtil">{f.area || 'Sem área definida'}</p>
        </div>
      )}
      {erro && <p className="erro">{erro}</p>}
      <div className="acoes">
        {f.ativo && <BotoesPartilha nome={f.nome} token={f.token} />}
        {!aEditar && <button className="btn" title="Alterar o nome ou a área" onClick={() => setAEditar(true)}>Editar</button>}
        <button
          className="btn"
          disabled={ocupado}
          title={f.ativo ? 'O formador deixa de conseguir abrir o link. Pode voltar a ativá-lo quando quiser.' : 'O link volta a funcionar.'}
          onClick={() => executar(() => editarFormador(db, f.token, { ativo: !f.ativo }))}
        >
          {f.ativo ? 'Desativar' : 'Ativar'}
        </button>
        <button className="btn" disabled={ocupado} title="Use só se o link foi enviado à pessoa errada. O link antigo deixa de funcionar." onClick={novoLink}>Gerar novo link</button>
      </div>
      {f.ativo
        ? <Dica>Envie o link uma única vez — o formador usa-o para todos os júris.</Dica>
        : <Dica>Desativado: o link deste formador não abre. Carregue em Ativar para voltar a permitir.</Dica>}
    </li>
  );
}

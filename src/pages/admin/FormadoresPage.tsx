import { useState, type FormEvent } from 'react';
import { BotoesPartilha } from '../../components/BotoesPartilha';
import { criarFormador, editarFormador, regenerarLink, subscreverFormadores } from '../../data/formadores';
import type { Formador } from '../../domain/tipos';
import { db } from '../../lib/firebase';
import { useSubscricao } from '../../lib/useSubscricao';

export function FormadoresPage() {
  const formadores = useSubscricao<Formador[]>((cb) => subscreverFormadores(db, cb), []);
  const [nome, setNome] = useState('');
  const [area, setArea] = useState('');
  const [filtro, setFiltro] = useState('');

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    await criarFormador(db, { nome, area });
    setNome('');
    setArea('');
  }

  if (!formadores) return <p>A carregar…</p>;
  const termo = filtro.trim().toLowerCase();
  const visiveis = formadores.filter((f) => `${f.nome} ${f.area}`.toLowerCase().includes(termo));

  return (
    <section>
      <h1>Formadores</h1>
      <form className="cartao form-linha" onSubmit={adicionar}>
        <input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <input placeholder="Área(s)" value={area} onChange={(e) => setArea(e.target.value)} />
        <button className="btn primario">Adicionar</button>
      </form>
      <input className="pesquisa" placeholder="Pesquisar por nome ou área" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
      {visiveis.length === 0 && (
        <p className="vazio">{formadores.length ? 'Nenhum formador corresponde à pesquisa.' : 'Ainda não há formadores. Adiciona o primeiro acima.'}</p>
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

  async function guardar() {
    if (!nome.trim()) return;
    await editarFormador(db, f.token, { nome, area });
    setAEditar(false);
  }

  function cancelar() {
    setNome(f.nome);
    setArea(f.area);
    setAEditar(false);
  }

  async function novoLink() {
    if (!confirm(`Gerar um novo link para ${f.nome}? O link antigo deixa de funcionar.`)) return;
    await regenerarLink(db, f.token);
  }

  return (
    <li className={`cartao formador ${f.ativo ? '' : 'inativo'}`}>
      {aEditar ? (
        <div className="form-linha">
          <input value={nome} onChange={(e) => setNome(e.target.value)} aria-label="Nome" />
          <textarea value={area} onChange={(e) => setArea(e.target.value)} rows={2} aria-label="Área(s)" />
          <button className="btn primario" onClick={guardar}>Guardar</button>
          <button className="btn" onClick={cancelar}>Cancelar</button>
        </div>
      ) : (
        <div>
          <strong>{f.nome}</strong>
          {!f.ativo && <span className="etiqueta">inativo</span>}
          <p className="subtil">{f.area || 'Sem área definida'}</p>
        </div>
      )}
      <div className="acoes">
        {f.ativo && <BotoesPartilha nome={f.nome} token={f.token} />}
        {!aEditar && <button className="btn" onClick={() => setAEditar(true)}>Editar</button>}
        <button className="btn" onClick={() => editarFormador(db, f.token, { ativo: !f.ativo })}>{f.ativo ? 'Desativar' : 'Ativar'}</button>
        <button className="btn" onClick={novoLink}>Gerar novo link</button>
      </div>
    </li>
  );
}

import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { guardarDisponibilidade, obterDisponibilidades } from '../../src/data/disponibilidades';
import { criarFormador, editarFormador, regenerarLink } from '../../src/data/formadores';
import { cancelarJuri, criarJuri, eliminarJuri, marcarJuri, obterJuri, reabrirJuri, subscreverJurisDoFormador } from '../../src/data/juris';
import { ligarSessao } from '../../src/data/sessao';
import type { Juri, JuriInput } from '../../src/domain/tipos';
import { fs, iniciarAmbiente, semear, TOKEN_A, TOKEN_C } from './ajuda';

let env: RulesTestEnvironment;
beforeAll(async () => { env = await iniciarAmbiente(); });
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); await semear(env); });

const admin = () => fs(env.authenticatedContext('admin'));
const input: JuriInput = {
  titulo: 'Júri Novo', notas: '', dataInicio: '2026-10-12', dataFim: '2026-10-16',
  horaInicio: '09:00', horaFim: '19:00', diasSemana: [1, 2, 3, 4, 5], duracaoMin: 60,
};

function primeiro<T>(sub: (cb: (v: T) => void) => () => void): Promise<T> {
  return new Promise((resolve) => {
    const parar = sub((v) => { parar(); resolve(v); });
  });
}

describe('formadores', () => {
  it('cria com token secreto como id e sem token nos campos', async () => {
    const f = await criarFormador(admin(), { nome: '  Diana ', area: 'Gestão' });
    expect(f.token).toMatch(/^[A-Za-z0-9]{32}$/);
    const snap = await getDoc(doc(admin(), 'formadores', f.token));
    expect(snap.data()).toMatchObject({ pid: f.pid, nome: 'Diana', area: 'Gestão', ativo: true });
    expect(Object.values(snap.data()!)).not.toContain(f.token);
  });

  it('recusa nome vazio', async () => {
    await expect(criarFormador(admin(), { nome: '  ', area: '' })).rejects.toThrow();
  });

  it('regenerar link mantém o pid e apaga o token antigo (JU-R20)', async () => {
    const novo = await regenerarLink(admin(), TOKEN_A);
    expect(novo).not.toBe(TOKEN_A);
    expect((await getDoc(doc(admin(), 'formadores', TOKEN_A))).exists()).toBe(false);
    expect((await getDoc(doc(admin(), 'formadores', novo))).data()).toMatchObject({ pid: 'pidA', nome: 'Ana' });
  });

  it('mudar o nome atualiza a cópia nos júris', async () => {
    await editarFormador(admin(), TOKEN_A, { nome: 'Ana Maria' });
    expect((await obterJuri(admin(), 'j1'))!.participantes.pidA).toBe('Ana Maria');
  });
});

describe('júris', () => {
  it('cria aberto, com participantesIds espelhando participantes', async () => {
    const id = await criarJuri(admin(), input, { pidA: 'Ana', pidB: 'Bruno' });
    const j = (await obterJuri(admin(), id))!;
    expect(j).toMatchObject({ titulo: 'Júri Novo', estado: 'aberto', dataMarcada: null, participantesIds: ['pidA', 'pidB'] });
  });

  it('marcar, cancelar e reabrir (JU-R19)', async () => {
    await marcarJuri(admin(), 'j1', '2026-10-13T10:00');
    expect(await obterJuri(admin(), 'j1')).toMatchObject({ estado: 'marcado', dataMarcada: '2026-10-13T10:00' });
    await cancelarJuri(admin(), 'j1');
    expect(await obterJuri(admin(), 'j1')).toMatchObject({ estado: 'cancelado', dataMarcada: null });
    await reabrirJuri(admin(), 'j1');
    expect(await obterJuri(admin(), 'j1')).toMatchObject({ estado: 'aberto', dataMarcada: null });
  });

  it('eliminar apaga o júri e as disponibilidades', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await guardarDisponibilidade(fs(ctx), 'j1', 'pidA', ['2026-10-12T09:00']);
      await guardarDisponibilidade(fs(ctx), 'j1', 'pidB', ['2026-10-12T09:00']);
    });
    await eliminarJuri(admin(), 'j1');
    expect(await obterJuri(admin(), 'j1')).toBeNull();
    expect(await obterDisponibilidades(admin(), 'j1')).toEqual([]);
  });

  it('formador só recebe os seus júris', async () => {
    const ana = fs(env.authenticatedContext('uA'));
    const js = await primeiro<Juri[]>((cb) => subscreverJurisDoFormador(ana, 'pidA', cb));
    expect(js.map((j) => j.id)).toEqual(['j1']);
  });
});

describe('sessão do formador', () => {
  it('token válido liga a sessão e permite gravar disponibilidade', async () => {
    const db = fs(env.authenticatedContext('novoUid'));
    expect(await ligarSessao(db, 'novoUid', TOKEN_A)).toEqual({ estado: 'ok', nome: 'Ana', pid: 'pidA' });
    await guardarDisponibilidade(db, 'j1', 'pidA', ['2026-10-12T09:00']);
    expect(await obterDisponibilidades(admin(), 'j1')).toEqual([{ pid: 'pidA', slots: ['2026-10-12T09:00'] }]);
  });

  it('token inexistente ou malformado → inválido; inativo → inativo', async () => {
    const db = fs(env.authenticatedContext('novoUid'));
    expect(await ligarSessao(db, 'novoUid', 'Z'.repeat(32))).toEqual({ estado: 'invalido' });
    for (const t of ['', 'curto', 'a/b/c', '../juris/j1', 'x'.repeat(40)]) {
      expect(await ligarSessao(db, 'novoUid', t)).toEqual({ estado: 'invalido' });
    }
    expect(await ligarSessao(db, 'novoUid', TOKEN_C)).toEqual({ estado: 'inativo' });
  });
});

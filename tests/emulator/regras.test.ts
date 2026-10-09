import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { fs, iniciarAmbiente, semear, TOKEN_A, TOKEN_C } from './ajuda';

let env: RulesTestEnvironment;
beforeAll(async () => { env = await iniciarAmbiente(); });
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); await semear(env); });

const admin = () => fs(env.authenticatedContext('admin'));
const ana = () => fs(env.authenticatedContext('uA'));
const bruno = () => fs(env.authenticatedContext('uB'));
const anonimo = () => fs(env.unauthenticatedContext());
const novo = (uid: string) => fs(env.authenticatedContext(uid));

describe('admins (JU-R01)', () => {
  it('ninguém escreve em admins, nem a própria admin', async () => {
    await assertFails(setDoc(doc(admin(), 'admins/outro'), {}));
    await assertFails(setDoc(doc(novo('x'), 'admins/x'), {}));
  });
});

describe('formadores (JU-R02, JU-R03)', () => {
  it('qualquer pessoa lê um formador conhecendo o token', async () => {
    await assertSucceeds(getDoc(doc(anonimo(), `formadores/${TOKEN_A}`)));
  });
  it('só a admin lista ou escreve formadores', async () => {
    await assertFails(getDocs(collection(ana(), 'formadores')));
    await assertFails(getDocs(collection(anonimo(), 'formadores')));
    await assertFails(updateDoc(doc(ana(), `formadores/${TOKEN_A}`), { nome: 'X' }));
    await assertSucceeds(getDocs(collection(admin(), 'formadores')));
    await assertSucceeds(updateDoc(doc(admin(), `formadores/${TOKEN_A}`), { nome: 'Ana Maria' }));
  });
});

describe('sessões (JU-R10)', () => {
  it('cria sessão com token e pid corretos', async () => {
    await assertSucceeds(setDoc(doc(novo('n1'), 'sessoes/n1'), { token: TOKEN_A, pid: 'pidA' }));
  });
  it('recusa pid errado, token inexistente, formador inativo, campos extra ou uid alheio', async () => {
    await assertFails(setDoc(doc(novo('n1'), 'sessoes/n1'), { token: TOKEN_A, pid: 'pidB' }));
    await assertFails(setDoc(doc(novo('n1'), 'sessoes/n1'), { token: 'Z'.repeat(32), pid: 'pidA' }));
    await assertFails(setDoc(doc(novo('n1'), 'sessoes/n1'), { token: TOKEN_C, pid: 'pidC' }));
    await assertFails(setDoc(doc(novo('n1'), 'sessoes/n1'), { token: TOKEN_A, pid: 'pidA', admin: true }));
    await assertFails(setDoc(doc(novo('n1'), 'sessoes/outro'), { token: TOKEN_A, pid: 'pidA' }));
  });
  it('não se lê a sessão de outro', async () => {
    await assertFails(getDoc(doc(bruno(), 'sessoes/uA')));
    await assertSucceeds(getDoc(doc(ana(), 'sessoes/uA')));
  });
});

describe('júris (JU-R09)', () => {
  it('participante lê o júri; não participante e anónimo não', async () => {
    await assertSucceeds(getDoc(doc(ana(), 'juris/j1')));
    await assertFails(getDoc(doc(ana(), 'juris/j2')));
    await assertFails(getDoc(doc(anonimo(), 'juris/j1')));
    await assertFails(getDoc(doc(novo('semSessao'), 'juris/j1')));
  });
  it('formador lista apenas com filtro pelo seu pid', async () => {
    await assertSucceeds(getDocs(query(collection(ana(), 'juris'), where('participantesIds', 'array-contains', 'pidA'))));
    await assertFails(getDocs(query(collection(ana(), 'juris'), where('participantesIds', 'array-contains', 'pidB'))));
    await assertFails(getDocs(collection(ana(), 'juris')));
  });
  it('só a admin elimina júris e disponibilidades', async () => {
    await assertFails(deleteDoc(doc(ana(), 'juris/j1')));
    await assertFails(deleteDoc(doc(ana(), 'juris/j1/disponibilidades/pidA')));
    await assertSucceeds(deleteDoc(doc(admin(), 'juris/j1')));
  });

  it('só a admin escreve júris', async () => {
    await assertFails(updateDoc(doc(ana(), 'juris/j1'), { estado: 'cancelado' }));
    await assertSucceeds(updateDoc(doc(admin(), 'juris/j1'), { estado: 'cancelado' }));
    await assertSucceeds(getDocs(collection(admin(), 'juris')));
  });
  it('sessão de token entretanto regenerado deixa de ler (JU-R20)', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await deleteDoc(doc(fs(ctx), `formadores/${TOKEN_A}`)); });
    await assertFails(getDoc(doc(ana(), 'juris/j1')));
  });
});

describe('disponibilidades (JU-R08)', () => {
  const disp = (slots: string[]) => ({ slots, atualizadoEm: new Date() });

  it('formador escreve a sua própria disponibilidade num júri aberto', async () => {
    await assertSucceeds(setDoc(doc(ana(), 'juris/j1/disponibilidades/pidA'), disp(['2026-10-12T09:00'])));
  });
  it('não escreve a de outro, nem em júri não aberto, nem onde não participa', async () => {
    await assertFails(setDoc(doc(ana(), 'juris/j1/disponibilidades/pidB'), disp([])));
    await assertFails(setDoc(doc(bruno(), 'juris/j2/disponibilidades/pidB'), disp([])));
    await assertFails(setDoc(doc(ana(), 'juris/j2/disponibilidades/pidA'), disp([])));
  });
  it('recusa campos extra, slots que não são lista e listas enormes', async () => {
    await assertFails(setDoc(doc(ana(), 'juris/j1/disponibilidades/pidA'), { ...disp([]), extra: 1 }));
    await assertFails(setDoc(doc(ana(), 'juris/j1/disponibilidades/pidA'), { slots: 'x', atualizadoEm: new Date() }));
    await assertFails(setDoc(doc(ana(), 'juris/j1/disponibilidades/pidA'), disp(Array.from({ length: 2001 }, (_, i) => String(i)))));
  });
  it('formador inativo deixa de escrever (JU-R10)', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await updateDoc(doc(fs(ctx), `formadores/${TOKEN_A}`), { ativo: false }); });
    await assertFails(setDoc(doc(ana(), 'juris/j1/disponibilidades/pidA'), disp([])));
  });
  it('participantes leem as disponibilidades do júri; outros não', async () => {
    await assertSucceeds(getDocs(collection(bruno(), 'juris/j1/disponibilidades')));
    await assertFails(getDocs(collection(ana(), 'juris/j2/disponibilidades')));
    await assertSucceeds(getDocs(collection(admin(), 'juris/j2/disponibilidades')));
  });
  it('a admin escreve qualquer disponibilidade', async () => {
    await assertSucceeds(setDoc(doc(admin(), 'juris/j2/disponibilidades/pidB'), disp([])));
  });
});

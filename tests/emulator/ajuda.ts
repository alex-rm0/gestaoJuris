import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, type RulesTestContext, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, type Firestore } from 'firebase/firestore';

export const TOKEN_A = 'A'.repeat(32);
export const TOKEN_B = 'B'.repeat(32);
export const TOKEN_C = 'C'.repeat(32);

export function iniciarAmbiente(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: 'demo-app-juris',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
}

/** O contexto de testes devolve uma instância compatível; as funções modulares aceitam-na. */
export const fs = (ctx: RulesTestContext): Firestore => ctx.firestore() as unknown as Firestore;

const juriBase = {
  titulo: 'Júri',
  notas: '',
  dataInicio: '2026-10-12',
  dataFim: '2026-10-16',
  horaInicio: '09:00',
  horaFim: '19:00',
  diasSemana: [1, 2, 3, 4, 5],
  duracaoMin: 60,
  dataMarcada: null,
};

export async function semear(env: RulesTestEnvironment): Promise<void> {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = fs(ctx);
    await setDoc(doc(db, 'admins/admin'), {});
    await setDoc(doc(db, `formadores/${TOKEN_A}`), { pid: 'pidA', nome: 'Ana', area: 'Contabilidade', ativo: true });
    await setDoc(doc(db, `formadores/${TOKEN_B}`), { pid: 'pidB', nome: 'Bruno', area: '', ativo: true });
    await setDoc(doc(db, `formadores/${TOKEN_C}`), { pid: 'pidC', nome: 'Carla', area: '', ativo: false });
    await setDoc(doc(db, 'juris/j1'), { ...juriBase, participantes: { pidA: 'Ana', pidB: 'Bruno' }, participantesIds: ['pidA', 'pidB'], estado: 'aberto' });
    await setDoc(doc(db, 'juris/j2'), { ...juriBase, participantes: { pidB: 'Bruno' }, participantesIds: ['pidB'], estado: 'marcado', dataMarcada: '2026-10-12T10:00' });
    await setDoc(doc(db, 'sessoes/uA'), { token: TOKEN_A, pid: 'pidA' });
    await setDoc(doc(db, 'sessoes/uB'), { token: TOKEN_B, pid: 'pidB' });
  });
}

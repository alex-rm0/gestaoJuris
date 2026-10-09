import {
  collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
  type Firestore, type Unsubscribe,
} from 'firebase/firestore';
import { gerarPid, gerarToken } from '../domain/tokens';
import type { Formador } from '../domain/tipos';

export async function criarFormador(db: Firestore, dados: { nome: string; area: string }): Promise<Formador> {
  const nome = dados.nome.trim();
  if (!nome) throw new Error('O nome é obrigatório.');
  const f: Formador = { token: gerarToken(), pid: gerarPid(), nome, area: dados.area.trim(), ativo: true };
  await setDoc(doc(db, 'formadores', f.token), { pid: f.pid, nome: f.nome, area: f.area, ativo: true, criadoEm: serverTimestamp() });
  return f;
}

export async function editarFormador(
  db: Firestore,
  token: string,
  patch: Partial<Pick<Formador, 'nome' | 'area' | 'ativo'>>,
): Promise<void> {
  const limpo: Partial<Pick<Formador, 'nome' | 'area' | 'ativo'>> = { ...patch };
  if (limpo.nome !== undefined) {
    limpo.nome = limpo.nome.trim();
    if (!limpo.nome) throw new Error('O nome é obrigatório.');
  }
  if (limpo.area !== undefined) limpo.area = limpo.area.trim();
  await updateDoc(doc(db, 'formadores', token), limpo);

  if (limpo.nome !== undefined) {
    const pid = (await getDoc(doc(db, 'formadores', token))).data()!.pid as string;
    const juris = await getDocs(query(collection(db, 'juris'), where('participantesIds', 'array-contains', pid)));
    if (juris.empty) return;
    const b = writeBatch(db);
    juris.docs.forEach((d) => b.update(d.ref, { [`participantes.${pid}`]: limpo.nome }));
    await b.commit();
  }
}

export async function regenerarLink(db: Firestore, token: string): Promise<string> {
  const antigo = await getDoc(doc(db, 'formadores', token));
  if (!antigo.exists()) throw new Error('Formador inexistente.');
  const novo = gerarToken();
  const b = writeBatch(db);
  b.set(doc(db, 'formadores', novo), antigo.data());
  b.delete(antigo.ref);
  await b.commit();
  return novo;
}

export function subscreverFormadores(db: Firestore, cb: (fs: Formador[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'formadores'), (snap) => {
    const lista = snap.docs.map((d) => {
      const x = d.data();
      return { token: d.id, pid: x.pid, nome: x.nome, area: x.area ?? '', ativo: x.ativo !== false } as Formador;
    });
    cb(lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt')));
  });
}

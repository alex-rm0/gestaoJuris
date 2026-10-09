import {
  collection, doc, getDocs, onSnapshot, serverTimestamp, setDoc, type Firestore, type Unsubscribe,
} from 'firebase/firestore';
import type { Disponibilidade } from '../domain/tipos';

export async function guardarDisponibilidade(db: Firestore, juriId: string, pid: string, slots: string[]): Promise<void> {
  await setDoc(doc(db, 'juris', juriId, 'disponibilidades', pid), { slots: [...slots].sort(), atualizadoEm: serverTimestamp() });
}

export async function obterDisponibilidades(db: Firestore, juriId: string): Promise<Disponibilidade[]> {
  const snap = await getDocs(collection(db, 'juris', juriId, 'disponibilidades'));
  return snap.docs.map((d) => ({ pid: d.id, slots: d.data().slots ?? [] }));
}

export function subscreverDisponibilidades(db: Firestore, juriId: string, cb: (ds: Disponibilidade[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'juris', juriId, 'disponibilidades'),
    (snap) => cb(snap.docs.map((d) => ({ pid: d.id, slots: d.data().slots ?? [] }))),
    () => cb([]),
  );
}

export function subscreverDisponibilidade(
  db: Firestore,
  juriId: string,
  pid: string,
  cb: (d: Disponibilidade | null) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'juris', juriId, 'disponibilidades', pid),
    (s) => cb(s.exists() ? { pid, slots: s.data().slots ?? [] } : null),
    () => cb(null),
  );
}

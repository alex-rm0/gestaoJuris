import {
  collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
  type DocumentData, type Firestore, type Unsubscribe,
} from 'firebase/firestore';
import type { Juri, JuriInput } from '../domain/tipos';

function paraJuri(id: string, d: DocumentData): Juri {
  return {
    id,
    titulo: d.titulo,
    notas: d.notas ?? '',
    dataInicio: d.dataInicio,
    dataFim: d.dataFim,
    horaInicio: d.horaInicio,
    horaFim: d.horaFim,
    diasSemana: d.diasSemana,
    duracaoMin: d.duracaoMin,
    participantes: d.participantes ?? {},
    participantesIds: d.participantesIds ?? [],
    estado: d.estado,
    dataMarcada: d.dataMarcada ?? null,
  };
}

function camposEditaveis(input: JuriInput, participantes: Record<string, string>) {
  return {
    titulo: input.titulo.trim(),
    notas: input.notas.trim(),
    dataInicio: input.dataInicio,
    dataFim: input.dataFim,
    horaInicio: input.horaInicio,
    horaFim: input.horaFim,
    diasSemana: [...input.diasSemana].sort((a, b) => a - b),
    duracaoMin: input.duracaoMin,
    participantes,
    participantesIds: Object.keys(participantes),
    atualizadoEm: serverTimestamp(),
  };
}

export async function criarJuri(db: Firestore, input: JuriInput, participantes: Record<string, string>): Promise<string> {
  const ref = doc(collection(db, 'juris'));
  await setDoc(ref, { ...camposEditaveis(input, participantes), estado: 'aberto', dataMarcada: null, criadoEm: serverTimestamp() });
  return ref.id;
}

export async function editarJuri(db: Firestore, id: string, input: JuriInput, participantes: Record<string, string>): Promise<void> {
  await updateDoc(doc(db, 'juris', id), camposEditaveis(input, participantes));
}

export async function marcarJuri(db: Firestore, id: string, inicio: string): Promise<void> {
  await updateDoc(doc(db, 'juris', id), { estado: 'marcado', dataMarcada: inicio, atualizadoEm: serverTimestamp() });
}

export async function cancelarJuri(db: Firestore, id: string): Promise<void> {
  await updateDoc(doc(db, 'juris', id), { estado: 'cancelado', dataMarcada: null, atualizadoEm: serverTimestamp() });
}

export async function reabrirJuri(db: Firestore, id: string): Promise<void> {
  await updateDoc(doc(db, 'juris', id), { estado: 'aberto', dataMarcada: null, atualizadoEm: serverTimestamp() });
}

/** Apaga o júri e as disponibilidades (o Firestore não apaga subcoleções sozinho). */
export async function eliminarJuri(db: Firestore, id: string): Promise<void> {
  const disps = await getDocs(collection(db, 'juris', id, 'disponibilidades'));
  const b = writeBatch(db);
  disps.docs.forEach((d) => b.delete(d.ref));
  b.delete(doc(db, 'juris', id));
  await b.commit();
}

export async function obterJuri(db: Firestore, id: string): Promise<Juri | null> {
  const s = await getDoc(doc(db, 'juris', id));
  return s.exists() ? paraJuri(s.id, s.data()) : null;
}

export function subscreverJuri(db: Firestore, id: string, cb: (j: Juri | null) => void): Unsubscribe {
  return onSnapshot(
    doc(db, 'juris', id),
    (s) => cb(s.exists() ? paraJuri(s.id, s.data()) : null),
    () => cb(null),
  );
}

export function subscreverJuris(db: Firestore, cb: (js: Juri[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'juris'), (snap) => cb(snap.docs.map((d) => paraJuri(d.id, d.data()))));
}

export function subscreverJurisDoFormador(db: Firestore, pid: string, cb: (js: Juri[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'juris'), where('participantesIds', 'array-contains', pid)),
    (snap) => cb(snap.docs.map((d) => paraJuri(d.id, d.data()))),
    () => cb([]),
  );
}

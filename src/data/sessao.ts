import { signInAnonymously, type Auth } from 'firebase/auth';
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import { TOKEN_VALIDO } from '../domain/tokens';

export type ResultadoLink =
  | { estado: 'ok'; nome: string; pid: string }
  | { estado: 'invalido' }
  | { estado: 'inativo' };

export async function ligarSessao(db: Firestore, uid: string, token: string): Promise<ResultadoLink> {
  if (!TOKEN_VALIDO.test(token)) return { estado: 'invalido' };
  const f = await getDoc(doc(db, 'formadores', token));
  if (!f.exists()) return { estado: 'invalido' };
  const d = f.data();
  if (d.ativo !== true) return { estado: 'inativo' };
  await setDoc(doc(db, 'sessoes', uid), { token, pid: d.pid });
  return { estado: 'ok', nome: d.nome, pid: d.pid };
}

/** Garante uma sessão (anónima, se ninguém tiver sessão) e liga-a ao formador do token. */
export async function abrirLink(db: Firestore, auth: Auth, token: string): Promise<ResultadoLink> {
  if (!TOKEN_VALIDO.test(token)) return { estado: 'invalido' };
  await auth.authStateReady();
  const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
  return ligarSessao(db, user.uid, token);
}

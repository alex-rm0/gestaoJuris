import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';

export function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aEntrar, setAEntrar] = useState(false);

  async function submeter(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setAEntrar(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      nav('/', { replace: true });
    } catch {
      setErro('Email ou password incorretos.');
    } finally {
      setAEntrar(false);
    }
  }

  return (
    <main className="login">
      <form className="cartao" onSubmit={submeter}>
        <h1>Júris</h1>
        <label>
          Email
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {erro && <p className="erro">{erro}</p>}
        <button className="btn primario" disabled={aEntrar}>{aEntrar ? 'A entrar…' : 'Entrar'}</button>
      </form>
    </main>
  );
}

import { signOut } from 'firebase/auth';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { useSessaoAdmin } from '../lib/useSessaoAdmin';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const estado = useSessaoAdmin();
  if (estado === 'carregando') return <p className="centro">A carregar…</p>;
  if (estado === 'fora') return <Navigate to="/login" replace />;
  if (estado === 'semPermissao') {
    return (
      <div className="centro">
        <p>Esta conta não tem acesso de gestão.</p>
        <button className="btn" onClick={() => signOut(auth)}>Sair</button>
      </div>
    );
  }
  return <>{children}</>;
}

import { signOut } from 'firebase/auth';
import { NavLink, Outlet } from 'react-router-dom';
import { auth } from '../lib/firebase';

export function AdminLayout() {
  return (
    <div className="app">
      <header className="topo">
        <span className="marca">Júris</span>
        <nav>
          <NavLink to="/" end>Júris</NavLink>
          <NavLink to="/formadores">Formadores</NavLink>
        </nav>
        <button className="btn-texto" onClick={() => signOut(auth)}>Sair</button>
      </header>
      <main className="conteudo">
        <Outlet />
      </main>
    </div>
  );
}

import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './components/AdminLayout';
import { RequireAdmin } from './components/RequireAdmin';
import { FormadoresPage } from './pages/admin/FormadoresPage';
import { LoginPage } from './pages/LoginPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* ROTAS-FORMADOR */}
        <Route element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<p>Painel</p>} />
          {/* ROTAS-ADMIN */}
          <Route path="formadores" element={<FormadoresPage />} />
        </Route>
        <Route path="*" element={<p className="centro">Página não encontrada.</p>} />
      </Routes>
    </BrowserRouter>
  );
}

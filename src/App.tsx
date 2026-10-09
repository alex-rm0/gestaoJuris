import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './components/AdminLayout';
import { RequireAdmin } from './components/RequireAdmin';
import { FormadoresPage } from './pages/admin/FormadoresPage';
import { JuriDetalhePage } from './pages/admin/JuriDetalhePage';
import { JuriFormPage } from './pages/admin/JuriFormPage';
import { PainelPage } from './pages/admin/PainelPage';
import { LoginPage } from './pages/LoginPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* ROTAS-FORMADOR */}
        <Route element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<PainelPage />} />
          {/* ROTAS-ADMIN */}
          <Route path="juris/:id" element={<JuriDetalhePage />} />
          <Route path="juris/novo" element={<JuriFormPage />} />
          <Route path="juris/:id/editar" element={<JuriFormPage />} />
          <Route path="formadores" element={<FormadoresPage />} />
        </Route>
        <Route path="*" element={<p className="centro">Página não encontrada.</p>} />
      </Routes>
    </BrowserRouter>
  );
}

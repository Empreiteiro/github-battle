import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Create from './pages/Create';
import BattleRoom from './pages/BattleRoom';
import Embed from './pages/Embed';
import TournamentView from './pages/TournamentView';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Embed route — no layout */}
          <Route path="/embed/:id" element={<Embed />} />

          {/* Main routes with layout */}
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<Create />} />
            <Route path="/create-tournament" element={<Navigate to="/create" replace />} />
            <Route path="/battle/:id" element={<BattleRoom />} />
            <Route path="/tournament/:id" element={<TournamentView />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

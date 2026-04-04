import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import CreateBattle from './pages/CreateBattle';
import BattleRoom from './pages/BattleRoom';
import Embed from './pages/Embed';
import CreateTournament from './pages/CreateTournament';
import TournamentView from './pages/TournamentView';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Embed route — no layout (minimal, for iframes) */}
          <Route path="/embed/:id" element={<Embed />} />

          {/* Main routes with layout */}
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateBattle />} />
            <Route path="/battle/:id" element={<BattleRoom />} />
            <Route path="/create-tournament" element={<CreateTournament />} />
            <Route path="/tournament/:id" element={<TournamentView />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

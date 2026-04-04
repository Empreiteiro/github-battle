import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import CreateBattle from './pages/CreateBattle';
import BattleRoom from './pages/BattleRoom';
import Embed from './pages/Embed';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Embed route — no layout (minimal, for iframes) */}
        <Route path="/embed/:id" element={<Embed />} />

        {/* Main routes with layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateBattle />} />
          <Route path="/battle/:id" element={<BattleRoom />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

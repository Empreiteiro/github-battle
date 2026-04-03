import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import CreateBattle from './pages/CreateBattle';
import BattleRoom from './pages/BattleRoom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
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

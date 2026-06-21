import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import LobbyWaiting from './pages/LobbyWaiting';
import Game from './pages/Game';

function App() {
  return (
    <Router>
      <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white selection:bg-brand-500 selection:text-white">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lobby/:lobbyId" element={<LobbyWaiting />} />
          <Route path="/game/:lobbyId" element={<Game />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

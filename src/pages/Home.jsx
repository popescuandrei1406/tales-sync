import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { BookOpen, Users, Sparkles } from 'lucide-react';

export default function Home() {
  const location = useLocation();
  const [nickname, setNickname] = useState('');
  const [lobbyCode, setLobbyCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState(location.state?.error || '');
  const { loginAnonymously, currentUser } = useAuth();
  const navigate = useNavigate();

  const generateLobbyId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateLobby = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) return setError('Introdu un nickname!');
    
    try {
      setError('');
      let user = currentUser;
      if (!user) {
        user = await loginAnonymously();
      }

      const newLobbyId = generateLobbyId();
      
      // Create Lobby Document
      await setDoc(doc(db, 'lobbies', newLobbyId), {
        lobbyId: newLobbyId,
        hostId: user.uid,
        status: 'waiting',
        settings: {
          timeLimitSeconds: 60, // Default 1 min
          charLimit: 150, // Default Flash
          selectedGenres: []
        },
        createdAt: serverTimestamp()
      });

      // Add Host as Player
      await setDoc(doc(db, `lobbies/${newLobbyId}/players`, user.uid), {
        playerId: user.uid,
        nickname: nickname.trim(),
        lobbyId: newLobbyId,
        orderIndex: 0,
        isOnline: true
      });

      navigate(`/lobby/${newLobbyId}`);
    } catch (err) {
      console.error(err);
      setError('Eroare la crearea lobby-ului.');
    }
  };

  const handleJoinLobby = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) return setError('Introdu un nickname!');
    if (!lobbyCode.trim() || lobbyCode.length !== 6) return setError('Cod invalid!');
    
    const upperCode = lobbyCode.toUpperCase();

    try {
      setError('');
      
      // Check if lobby exists
      const lobbySnap = await getDoc(doc(db, 'lobbies', upperCode));
      if (!lobbySnap.exists()) {
        return setError('Lobby-ul nu există!');
      }

      let user = currentUser;
      if (!user) {
        user = await loginAnonymously();
      }

      // Add Player
      await setDoc(doc(db, `lobbies/${upperCode}/players`, user.uid), {
        playerId: user.uid,
        nickname: nickname.trim(),
        lobbyId: upperCode,
        orderIndex: 99, // Will be ordered later
        isOnline: true
      });

      navigate(`/lobby/${upperCode}`);
    } catch (err) {
      console.error(err);
      setError('Eroare la conectare.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 py-8 md:p-6 landscape:py-4 transition-all duration-300">
      
      {/* Title Header */}
      <div className="text-center mb-6 md:mb-12 landscape:mb-4 landscape:scale-90 landscape:origin-bottom transition-all duration-300 animate-fade-in">
        <div className="inline-flex items-center justify-center p-3 bg-brand-500/20 rounded-2xl mb-3 landscape:mb-1 text-brand-400 shadow-lg shadow-brand-500/5 animate-pulse">
          <BookOpen size={40} className="landscape:w-8 landscape:h-8" />
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-2 landscape:mb-1 bg-gradient-to-r from-brand-300 via-brand-500 to-yellow-500 bg-clip-text text-transparent">
          Tales Sync
        </h1>
        <p className="text-gray-400 text-sm md:text-lg max-w-md mx-auto px-4 landscape:text-xs">
          Scrieți o poveste împreună. Fiecare vede doar ultima parte. AI-ul leagă totul într-un mod spectaculos.
        </p>
      </div>

      {/* Main Action Panel */}
      <div className="glass-panel p-6 md:p-8 w-full max-w-md animate-fade-in landscape:p-5 landscape:max-w-lg transition-all duration-300" style={{ animationDelay: '0.1s' }}>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm text-center font-medium animate-shake">
            {error}
          </div>
        )}

        {/* Nickname input */}
        <div className="mb-5 landscape:mb-4">
          <label className="block text-xs md:text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
            Nickname-ul tău
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Ex: Povestitorul123"
            className="w-full bg-gray-950/60 border border-gray-800/80 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:scale-[1.01] transition-all duration-200 text-base shadow-inner"
            maxLength={15}
          />
        </div>

        {/* Tab Selection */}
        <div className="flex bg-gray-950/60 rounded-xl p-1 mb-5 landscape:mb-4 border border-gray-800/80">
          <button
            onClick={() => setIsJoining(false)}
            className={`flex-1 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all duration-200 active:scale-95 ${!isJoining ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/15' : 'text-gray-400 hover:text-white'}`}
          >
            Crează Joc
          </button>
          <button
            onClick={() => setIsJoining(true)}
            className={`flex-1 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all duration-200 active:scale-95 ${isJoining ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/15' : 'text-gray-400 hover:text-white'}`}
          >
            Intră cu Cod
          </button>
        </div>

        {/* Dynamic Form Area */}
        {isJoining ? (
          <form onSubmit={handleJoinLobby} className="space-y-4">
            <div>
              <label className="block text-xs md:text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                Cod Lobby
              </label>
              <input
                type="text"
                value={lobbyCode}
                onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                placeholder="Ex: AB12CD"
                className="w-full bg-gray-950/60 border border-gray-800/80 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:scale-[1.01] transition-all duration-200 font-mono text-center tracking-[0.25em] text-lg md:text-xl shadow-inner"
                maxLength={6}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-brand-600 hover:bg-brand-500 active:scale-95 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-brand-500/25"
            >
              <Users size={18} />
              Alătură-te Jocului
            </button>
          </form>
        ) : (
          <button
            onClick={handleCreateLobby}
            className="w-full bg-brand-600 hover:bg-brand-500 active:scale-95 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-brand-500/25"
          >
            <Sparkles size={18} />
            Generează Lobby Nou
          </button>
        )}
      </div>

    </div>
  );
}

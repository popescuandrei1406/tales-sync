import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { doc, onSnapshot, collection, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Users, Clock, AlignLeft, Play, Tag, Crown, Sparkles, LogOut, MoreVertical, UserX } from 'lucide-react';
import { generateIntro } from '../services/ai';

const GENRES = ["Dramă", "Comedie", "Horror", "SF", "Fantasy", "Romance", "Aventură", "Mister"];
const TIME_PRESETS = [
  { label: 'Flash', time: 60, chars: 150 },
  { label: 'Mediu', time: 120, chars: 200 },
  { label: 'Lung', time: 300, chars: 500 },
  { label: 'Epic', time: 600, chars: 9999 }
];

export default function LobbyWaiting() {
  const { lobbyId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [lobby, setLobby] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [activeMenuPlayerId, setActiveMenuPlayerId] = useState(null);

  const statusRef = useRef('waiting');

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
      return;
    }

    const unsubscribeLobby = onSnapshot(doc(db, 'lobbies', lobbyId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLobby(data);
        statusRef.current = data.status;
        if (data.status === 'playing') {
          navigate(`/game/${lobbyId}`);
        }
      } else {
        navigate('/', { state: { error: 'Lobby-ul a fost închis sau nu există.' } });
      }
      setLoading(false);
    });

    const unsubscribePlayers = onSnapshot(collection(db, `lobbies/${lobbyId}/players`), (snapshot) => {
      const pList = snapshot.docs.map(doc => doc.data());
      
      // If we are loaded, and the player list contains players, but we are not in the list, we were kicked!
      const isMeInLobby = pList.some(p => p.playerId === currentUser?.uid);
      if (!loading && pList.length > 0 && !isMeInLobby) {
        navigate('/', { state: { error: 'Ai fost eliminat din lobby sau gazda a închis camera.' } });
        return;
      }

      pList.sort((a, b) => a.orderIndex - b.orderIndex);
      setPlayers(pList);
    });

    return () => {
      unsubscribeLobby();
      unsubscribePlayers();
    };
  }, [lobbyId, currentUser, navigate, loading]);

  // Dedicated unmount cleanup: deletes our presence document if the game hasn't started yet
  useEffect(() => {
    return () => {
      if (statusRef.current !== 'playing' && currentUser?.uid) {
        const playerDocRef = doc(db, `lobbies/${lobbyId}/players`, currentUser.uid);
        deleteDoc(playerDocRef).catch(err => console.error("Error cleaning up player on unmount:", err));
      }
    };
  }, [lobbyId, currentUser?.uid]);

  // Handle tab close / refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (statusRef.current !== 'playing' && currentUser?.uid) {
        const playerDocRef = doc(db, `lobbies/${lobbyId}/players`, currentUser.uid);
        deleteDoc(playerDocRef);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [lobbyId, currentUser]);

  if (loading || !lobby) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  const isHost = currentUser?.uid === lobby.hostId;

  const updateSettings = async (newSettings) => {
    if (!isHost) return;
    await updateDoc(doc(db, 'lobbies', lobbyId), {
      settings: { ...lobby.settings, ...newSettings }
    });
  };

  const handleLeaveLobby = async () => {
    try {
      // 1. If we are the host, find the next player to promote before leaving
      if (isHost && players.length > 1) {
        const nextPlayer = players.find(p => p.playerId !== currentUser?.uid);
        if (nextPlayer) {
          await updateDoc(doc(db, 'lobbies', lobbyId), {
            hostId: nextPlayer.playerId
          });
        }
      }

      // 2. Delete our presence doc
      await deleteDoc(doc(db, `lobbies/${lobbyId}/players`, currentUser?.uid));

      // 3. If we were the last player, optionally delete the lobby
      if (players.length <= 1) {
        await deleteDoc(doc(db, 'lobbies', lobbyId));
      }

      navigate('/');
    } catch (err) {
      console.error("Error leaving lobby:", err);
      navigate('/');
    }
  };

  const handlePromotePlayer = async (playerId) => {
    try {
      await updateDoc(doc(db, 'lobbies', lobbyId), {
        hostId: playerId
      });
      setActiveMenuPlayerId(null);
    } catch (err) {
      console.error("Error promoting player:", err);
    }
  };

  const handleKickPlayer = async (playerId) => {
    try {
      await deleteDoc(doc(db, `lobbies/${lobbyId}/players`, playerId));
      setActiveMenuPlayerId(null);
    } catch (err) {
      console.error("Error kicking player:", err);
    }
  };

  const toggleGenre = (genre) => {
    if (!isHost) return;
    const current = lobby.settings.selectedGenres || [];
    const updated = current.includes(genre)
      ? current.filter(g => g !== genre)
      : [...current, genre];
    updateSettings({ selectedGenres: updated });
  };

  const handleStartGame = async () => {
    if (!isHost || players.length === 0 || isStarting) return;
    setIsStarting(true);
    
    const availableGenres = (lobby.settings.selectedGenres && lobby.settings.selectedGenres.length > 0) 
      ? lobby.settings.selectedGenres 
      : GENRES;

    const introText = await generateIntro(availableGenres);

    await updateDoc(doc(db, 'lobbies', lobbyId), {
      status: 'playing',
      storyParts: [
        {
          index: 0,
          partType: 'INTRODUCERE',
          authorId: 'AI',
          authorName: 'Tales AI',
          originalText: introText,
          aiBridgeText: '',
          genre: 'Introducere AI'
        }
      ],
      currentTurn: {
        activePlayerIndex: 0,
        activePlayerId: players[0].playerId,
        currentPartType: 'EXPOZITIUNE',
        currentGenre: availableGenres[0],
        timeStartedEpoch: Date.now()
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto p-4 py-6 md:py-8 landscape:py-4 transition-all duration-300">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 landscape:mb-4 bg-gray-900/40 p-4 md:p-6 rounded-2xl border border-gray-800/60 shadow-xl">
        <div className="text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-brand-300 via-brand-500 to-yellow-500 bg-clip-text text-transparent">
            Lobby: {lobbyId}
          </h1>
          <p className="text-xs md:text-sm text-gray-400 mt-1">Distribuie acest cod prietenilor pentru a se conecta.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {isHost ? (
            <button 
              onClick={handleStartGame}
              disabled={isStarting}
              className="w-full md:w-auto bg-green-600 hover:bg-green-500 active:scale-95 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-wait text-white font-bold py-3 px-6 md:px-8 rounded-xl flex items-center justify-center gap-2 transition-all duration-150 shadow-lg shadow-green-600/15"
            >
              {isStarting ? <Sparkles className="animate-spin text-green-400" size={18} /> : <Play size={18} />}
              {isStarting ? 'Se generează introducerea...' : 'Start Joc'}
            </button>
          ) : (
            <div className="w-full md:w-auto text-center text-xs md:text-sm text-brand-400 bg-brand-500/10 border border-brand-500/20 px-5 py-3 rounded-xl font-medium animate-pulse">
              Așteptăm ca gazda să înceapă jocul...
            </div>
          )}

          <button
            onClick={handleLeaveLobby}
            className="p-3 bg-gray-950 hover:bg-red-500/10 border border-gray-800 hover:border-red-500/30 rounded-xl text-gray-400 hover:text-red-400 transition-all duration-150 active:scale-95"
            title="Ieși din Lobby"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Main Grid: Responsive to Portrait & Landscape */}
      <div className="grid grid-cols-1 lg:grid-cols-3 landscape:grid-cols-3 gap-4 md:gap-6">
        
        {/* Left Side: Players List */}
        <div className="glass-panel p-5 lg:col-span-1 landscape:col-span-1 h-fit transition-all duration-300">
          <div className="flex items-center gap-2 mb-4 border-b border-gray-800/80 pb-3">
            <Users className="text-brand-400 w-5 h-5" />
            <h2 className="text-lg font-bold text-white">Jucători ({players.length})</h2>
          </div>
          
          <div className="space-y-2.5 max-h-[25vh] md:max-h-full overflow-y-auto custom-scrollbar pr-1 relative">
            {/* Click-away overlay when any menu is open */}
            {activeMenuPlayerId && (
              <div 
                className="fixed inset-0 cursor-default" 
                style={{ zIndex: 20 }}
                onClick={() => setActiveMenuPlayerId(null)} 
              />
            )}

            {players.map(p => {
              const isMe = p.playerId === currentUser?.uid;
              const isPlayerHost = p.playerId === lobby.hostId;
              const isMenuOpen = activeMenuPlayerId === p.playerId;

              return (
                <div 
                  key={p.playerId} 
                  className="relative flex items-center gap-3 p-2.5 bg-gray-950/60 rounded-xl border border-gray-800/40 hover:border-gray-700/60 transition-colors shadow-inner"
                  style={isMenuOpen ? { zIndex: 30 } : { zIndex: 10 }}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center font-black text-white text-xs shadow-md shrink-0">
                    {p.nickname.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-gray-200 text-sm truncate block">{p.nickname}</span>
                    {isMe && <span className="text-[10px] text-brand-400 font-bold tracking-wider uppercase block -mt-0.5">(Tu)</span>}
                  </div>
                  
                  {isPlayerHost && (
                    <Crown size={14} className="text-yellow-500 fill-yellow-500/25 shrink-0" />
                  )}

                  {/* 3-dots action menu for host to manage OTHER players */}
                  {isHost && !isMe && (
                    <div className="relative shrink-0">
                      <button
                        onClick={() => setActiveMenuPlayerId(isMenuOpen ? null : p.playerId)}
                        className={`p-1.5 rounded-lg hover:bg-gray-900 text-gray-500 hover:text-white transition-colors active:scale-95 z-30 relative ${isMenuOpen ? 'bg-gray-900 text-white' : ''}`}
                        title="Opțiuni jucător"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  )}

                  {/* Dropdown Menu (directly inside the player card row!) */}
                  {isMenuOpen && (
                    <div 
                      className="absolute right-12 mr-1 bg-gray-900/95 backdrop-blur-md border border-gray-800 rounded-xl p-1 shadow-2xl flex items-center gap-1 animate-fade-in origin-right"
                      style={{ top: '50%', transform: 'translateY(-50%)', zIndex: 40 }}
                    >
                      <button
                        onClick={() => handlePromotePlayer(p.playerId)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-gray-300 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <Crown size={12} className="text-yellow-500" />
                        <span>Fă Lider</span>
                      </button>
                      <div className="w-[1px] h-4 bg-gray-800/80 shrink-0" />
                      <button
                        onClick={() => handleKickPlayer(p.playerId)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <UserX size={12} />
                        <span>Dă afară</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            
            {players.length === 0 && (
              <p className="text-center text-xs text-gray-500 py-4 font-medium">Așteptăm povestitori...</p>
            )}
          </div>
        </div>

        {/* Right Side: Game Settings */}
        <div className="glass-panel p-5 lg:col-span-2 landscape:col-span-2 transition-all duration-300">
          <div className="flex items-center justify-between mb-4 border-b border-gray-800/80 pb-3">
            <h2 className="text-lg font-bold text-white">Setări Poveste</h2>
            {!isHost && (
              <span className="text-[10px] font-bold tracking-wider uppercase text-brand-400 bg-brand-500/10 px-2.5 py-1 rounded-full border border-brand-500/20">
                Numai Host
              </span>
            )}
          </div>

          <div className="space-y-6">
            
            {/* Time & Char Limits */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 mb-2.5 flex items-center gap-2 uppercase tracking-wider">
                <Clock size={14} className="text-brand-400" /> Durată tura & Limită caractere
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {TIME_PRESETS.map((preset) => {
                  const isSelected = lobby.settings.timeLimitSeconds === preset.time;
                  return (
                    <button
                      key={preset.label}
                      disabled={!isHost}
                      onClick={() => updateSettings({ timeLimitSeconds: preset.time, charLimit: preset.chars })}
                      className={`p-2.5 rounded-xl border text-left transition-all duration-150 active:scale-95 ${
                        isSelected 
                          ? 'bg-brand-600/15 border-brand-500/80 ring-1 ring-brand-500/50 shadow-md shadow-brand-500/5' 
                          : 'bg-gray-950/40 border-gray-800/80 hover:border-gray-700 disabled:opacity-60'
                      }`}
                    >
                      <div className={`text-sm font-black ${isSelected ? 'text-brand-300' : 'text-gray-200'}`}>{preset.label}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5 font-medium flex flex-col">
                        <span>{preset.time / 60} min</span>
                        <span>{preset.chars === 9999 ? 'Infinit' : `${preset.chars} caractere`}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Genres Selector */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 mb-1 flex items-center gap-2 uppercase tracking-wider">
                <Tag size={14} className="text-brand-400" /> Genuri literare permise
              </h3>
              <p className="text-[10px] text-gray-500 mb-2.5 leading-normal">
                Bifează genurile dorite. Dacă nu selectezi niciunul, AI-ul va include aleatoriu toate genurile de mai jos.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {GENRES.map(genre => {
                  const isSelected = (lobby.settings.selectedGenres || []).includes(genre);
                  return (
                    <button
                      key={genre}
                      disabled={!isHost}
                      onClick={() => toggleGenre(genre)}
                      className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all duration-150 active:scale-95 ${
                        isSelected
                          ? 'bg-brand-600 text-white border-brand-500/80 shadow-md shadow-brand-600/10'
                          : 'bg-gray-950/40 text-gray-400 border-gray-800/80 hover:border-gray-700/80 disabled:opacity-60'
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { doc, onSnapshot, updateDoc, collection } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Send, Clock, BookOpen, PenTool, Sparkles, AlignLeft, Bot, Volume2, VolumeX, RotateCcw, Home, Lock } from 'lucide-react';
import Timer from '../components/Timer';
import { generateBridge, generatePlayerPart } from '../services/ai';

const PART_ORDER = ['EXPOZITIUNE', 'INTRIGA', 'DESFASURARE', 'PUNCT_CULMINANT', 'CONCLUZIE'];
const GENRES = ["Dramă", "Comedie", "Horror", "SF", "Fantasy", "Romance", "Aventură", "Mister"];

export default function Game() {
  const { lobbyId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [lobby, setLobby] = useState(null);
  const [players, setPlayers] = useState([]);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isProcessingAI = useRef(false);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef(window.speechSynthesis);
  const utteranceRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return navigate('/');

    const unsubLobby = onSnapshot(doc(db, 'lobbies', lobbyId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLobby(data);
        // If Host resets the lobby, redirect all connected players back to the waiting lobby!
        if (data.status === 'lobby') {
          navigate(`/lobby/${lobbyId}`);
        }
      } else {
        navigate('/');
      }
    });

    const unsubPlayers = onSnapshot(collection(db, `lobbies/${lobbyId}/players`), (snapshot) => {
      const pList = snapshot.docs.map(doc => doc.data());
      pList.sort((a, b) => a.orderIndex - b.orderIndex);
      setPlayers(pList);
    });

    return () => {
      unsubLobby();
      unsubPlayers();
    };
  }, [lobbyId, currentUser, navigate]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // AI Processor (Host only)
  useEffect(() => {
    if (!lobby || lobby.hostId !== currentUser?.uid || players.length === 0) return;

    if (lobby.status === 'AI_PROCESSING' && !isProcessingAI.current) {
      isProcessingAI.current = true;
      const processAI = async () => {
        try {
          const lastPart = lobby.storyParts[lobby.storyParts.length - 1];
          
          const nextPartIndex = lobby.storyParts.length; 
          if (nextPartIndex > 5) {
            // Game Over! All 5 parts + intro done
            await updateDoc(doc(db, 'lobbies', lobbyId), {
              status: 'finished'
            });
            return;
          }

          const nextPartType = PART_ORDER[nextPartIndex - 1];
          const availableGenres = (lobby.settings.selectedGenres && lobby.settings.selectedGenres.length > 0) 
            ? lobby.settings.selectedGenres 
            : GENRES;
          const randomGenre = availableGenres[Math.floor(Math.random() * availableGenres.length)];

          // AI Ghostwriter / Copilot: if the player did not write anything
          let playerText = lastPart.originalText || '';
          if (!playerText.trim()) {
            // Compile full story written so far as context for the AI
            const previousStoryContext = lobby.storyParts
              .map(p => (p.originalText || '') + ' ' + (p.aiBridgeText || ''))
              .join(' ');

            playerText = await generatePlayerPart(previousStoryContext, lastPart.genre);
            lastPart.originalText = playerText;
          }

          // Compile full story context (all previous parts + current player's text) for bridge generation
          const previousStoryContextWithPlayer = lobby.storyParts
            .map((p, idx) => {
              if (idx === lobby.storyParts.length - 1) {
                return playerText;
              }
              return (p.originalText || '') + ' ' + (p.aiBridgeText || '');
            })
            .join(' ');

          // Generate actual AI Bridge
          const aiBridgeText = await generateBridge(previousStoryContextWithPlayer, randomGenre);

          // Update the last part with AI playerText & AI bridge
          const updatedParts = [...lobby.storyParts];
          updatedParts[updatedParts.length - 1].originalText = playerText;
          updatedParts[updatedParts.length - 1].aiBridgeText = aiBridgeText;

          // Calculate next player ID
          const nextPlayerIndex = lobby.currentTurn.activePlayerIndex + 1;
          const nextPlayer = players[nextPlayerIndex % players.length];
          const nextPlayerId = nextPlayer ? nextPlayer.playerId : currentUser.uid;

          await updateDoc(doc(db, 'lobbies', lobbyId), {
            status: 'playing',
            storyParts: updatedParts,
            currentTurn: {
              activePlayerIndex: nextPlayerIndex, 
              activePlayerId: nextPlayerId,
              currentPartType: nextPartType,
              currentGenre: randomGenre,
              timeStartedEpoch: Date.now()
            }
          });
        } catch (error) {
          console.error("AI bridge/player generation error:", error);
        } finally {
          isProcessingAI.current = false;
        }
      };
      processAI();
    }
  }, [lobby?.status, currentUser?.uid, lobbyId, players]);


  if (!lobby) return <div className="p-8 text-center bg-gray-950 text-gray-400">Se încarcă povestea...</div>;

  const isHost = lobby.hostId === currentUser?.uid;

  const handlePlayAgain = async () => {
    if (!isHost) return;
    try {
      await updateDoc(doc(db, 'lobbies', lobbyId), {
        status: 'lobby',
        storyParts: [],
        currentTurn: null
      });
    } catch (err) {
      console.error("Error resetting lobby:", err);
    }
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    } else {
      const fullText = lobby.storyParts
        .map(part => (part.originalText || '') + ' ' + (part.aiBridgeText || ''))
        .join(' ');

      const utterance = new SpeechSynthesisUtterance(fullText);
      utterance.lang = 'ro-RO';

      const voices = synthRef.current.getVoices();
      const roVoice = voices.find(v => v.lang.includes('ro'));
      if (roVoice) {
        utterance.voice = roVoice;
      }

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      utteranceRef.current = utterance;
      setIsSpeaking(true);
      synthRef.current.speak(utterance);
    }
  };

  if (lobby.status === 'finished') {
    const fullStory = lobby.storyParts.map((part, i) => (
      <span key={i} className="inline">
        <span className="text-white hover:text-brand-300 transition-colors">
          {part.originalText}{" "}
        </span>
        {part.aiBridgeText && (
          <span className="text-brand-400 italic hover:text-brand-300 transition-colors font-sans">
            {part.aiBridgeText}{" "}
          </span>
        )}
      </span>
    ));

    return (
      <div className="max-w-4xl mx-auto p-4 py-6 md:py-12 text-center animate-fade-in landscape:py-4 transition-all duration-300">
        <Sparkles size={48} className="mx-auto text-yellow-500 mb-3 md:mb-6 animate-pulse landscape:w-8 landscape:h-8" />
        <h1 className="text-2xl md:text-4xl font-black mb-1 md:mb-2 bg-gradient-to-r from-brand-300 via-brand-500 to-yellow-500 bg-clip-text text-transparent">
          Povestea Completă
        </h1>
        <p className="text-xs md:text-base text-gray-400 mb-4 md:mb-8 font-medium">Felicitări! Ați creat o capodoperă împreună.</p>

        {/* Text Story panel */}
        <div className="glass-panel p-5 md:p-8 text-left text-sm md:text-xl leading-relaxed font-serif shadow-2xl border-brand-500/10 mb-6 md:mb-8 max-h-[40vh] md:max-h-[50vh] overflow-y-auto custom-scrollbar relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-yellow-500"></div>
          {fullStory}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={toggleSpeech}
            className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all duration-150 active:scale-95 shadow-lg text-sm ${
              isSpeaking
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/10'
                : 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-500/20'
            }`}
          >
            {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
            {isSpeaking ? 'Oprește Redarea' : 'Ascultă Povestea'}
          </button>

          {isHost ? (
            <button
              onClick={handlePlayAgain}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-500 active:scale-95 text-white font-bold rounded-xl flex items-center gap-2 transition-all duration-150 shadow-lg shadow-green-500/10 text-sm"
            >
              <RotateCcw size={18} />
              Joacă Din Nou
            </button>
          ) : (
            <div className="text-xs text-gray-500 bg-gray-900/50 px-4 py-2.5 rounded-xl border border-gray-800 font-medium">
              Așteptăm ca gazda să repornească lobby-ul...
            </div>
          )}

          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 active:scale-95 text-gray-300 font-bold rounded-xl flex items-center gap-2 transition-all duration-150 border border-gray-800 text-sm"
          >
            <Home size={18} />
            Meniu Principal
          </button>
        </div>
      </div>
    );
  }

  const { currentTurn, settings, storyParts } = lobby;
  const isMyTurn = currentTurn && currentTurn.activePlayerId === currentUser?.uid;
  const isAIProcessing = lobby.status === 'AI_PROCESSING';

  console.log("Tales Sync Turn Debug:", {
    activePlayerId: currentTurn?.activePlayerId,
    currentUserId: currentUser?.uid,
    isMyTurn,
    lobbyStatus: lobby.status,
    isHost: lobby.hostId === currentUser?.uid
  });

  const lastPart = storyParts[storyParts.length - 1];

  const handleSubmit = async (isForced = false) => {
    if (isSubmitting) return;
    if (!isForced && !text.trim()) return;

    setIsSubmitting(true);

    const me = players.find(p => p.playerId === currentUser.uid);
    const authorName = me ? me.nickname : 'Jucător';
    const textToSubmit = text.trim();

    const newPart = {
      index: storyParts.length,
      partType: currentTurn.currentPartType,
      authorId: currentUser.uid,
      authorName: textToSubmit ? authorName : `${authorName} (asistat de AI)`,
      originalText: textToSubmit || '', // Can be empty!
      aiBridgeText: '', // Will be filled by AI
      genre: currentTurn.currentGenre
    };

    await updateDoc(doc(db, 'lobbies', lobbyId), {
      status: 'AI_PROCESSING',
      storyParts: [...storyParts, newPart]
    });

    setText('');
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-3 py-4 md:p-4 md:py-8 landscape:py-3 transition-all duration-300">
      
      {/* Header Info */}
      <div className="flex flex-row justify-between items-center bg-gray-900/40 rounded-2xl p-3 md:p-4 mb-4 md:mb-6 border border-gray-800/60 shadow-lg gap-2 transition-all duration-300">
        <div className="flex items-center gap-2.5 min-w-0">
          <BookOpen className="text-brand-400 shrink-0 w-5 h-5 md:w-6 md:h-6" />
          <div className="min-w-0">
            <div className="text-[10px] md:text-sm text-gray-400 uppercase tracking-wider font-bold truncate">
              Capitolul: {currentTurn.currentPartType}
            </div>
            <div className="text-xs md:text-sm font-bold text-brand-400 md:text-brand-300 truncate">
              Gen: {currentTurn.currentGenre}
            </div>
          </div>
        </div>

        {isMyTurn && !isAIProcessing && (
          <div className="shrink-0">
            <Timer 
              timeStartedEpoch={currentTurn.timeStartedEpoch} 
              timeLimitSeconds={settings.timeLimitSeconds} 
              onTimeUp={() => handleSubmit(true)} 
            />
          </div>
        )}
      </div>

      {/* Main Grid Layout: Transforms to 2 Columns in Landscape Mode on Mobile */}
      <div className="grid grid-cols-1 landscape:grid-cols-2 gap-4 md:gap-6 items-stretch transition-all duration-300">
        
        {/* Column 1: Story Context (Last part) */}
        <div className="animate-fade-in flex flex-col h-full">
          <h3 className="text-xs md:text-sm text-gray-500 uppercase tracking-widest mb-2.5 flex items-center gap-2">
            <AlignLeft size={14} className="text-brand-400" /> Partea Anterioară
          </h3>
          {isMyTurn && lobby.status === 'playing' ? (
            <div className="glass-panel p-5 md:p-6 text-sm md:text-lg leading-relaxed text-gray-300 relative overflow-y-auto max-h-[22vh] md:max-h-[300px] landscape:max-h-[50vh] flex-1 custom-scrollbar min-h-[120px]">
              <div className="absolute top-0 left-0 w-1 h-full bg-brand-500"></div>
              <span className="text-white font-serif">{lastPart?.originalText}</span>
              <span className="text-brand-400 italic font-sans ml-1.5">{lastPart?.aiBridgeText}</span>
            </div>
          ) : (
            <div className="glass-panel p-5 md:p-6 text-sm leading-relaxed text-gray-500 relative flex flex-col items-center justify-center text-center gap-3 flex-1 min-h-[120px] max-h-[22vh] md:max-h-[300px] landscape:max-h-[50vh] border-dashed border-gray-800">
              <div className="w-10 h-10 rounded-full bg-gray-950 flex items-center justify-center text-gray-600 border border-gray-800">
                <Lock size={16} />
              </div>
              <div className="space-y-1">
                <div className="font-bold text-gray-400 text-xs uppercase tracking-wider">Scris în Secret</div>
                <p className="text-[10px] text-gray-500 max-w-xs mx-auto leading-normal">
                  Vei vedea partea anterioară doar când îți vine rândul să scrii, pentru a păstra surpriza!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Column 2: Writing Area or Waiting Area */}
        <div className="flex flex-col h-full justify-center">
          {isAIProcessing ? (
            <div className="text-center p-6 md:p-12 glass-panel border-brand-500/30 flex flex-col justify-center items-center h-full min-h-[200px] landscape:min-h-0">
              <Sparkles className="mx-auto text-brand-400 animate-pulse mb-3" size={36} />
              <h2 className="text-lg md:text-2xl font-bold mb-1.5">AI-ul conectează ideile...</h2>
              <p className="text-xs md:text-sm text-gray-400">Te rugăm să aștepți, magia se întâmplă în fundal.</p>
            </div>
          ) : isMyTurn ? (
            <div className="animate-fade-in flex flex-col h-full" style={{ animationDelay: '0.1s' }}>
              <div className="flex justify-between items-end mb-2">
                <h3 className="text-xs md:text-sm font-bold text-brand-400 uppercase tracking-widest flex items-center gap-2">
                  <PenTool size={14} /> Rândul tău!
                </h3>
                <span className={`text-xs font-mono ${text.length > settings.charLimit ? 'text-red-500' : 'text-gray-400'}`}>
                  {text.length} / {settings.charLimit === 9999 ? '∞' : settings.charLimit}
                </span>
              </div>
              
              <div className="relative flex-1 flex flex-col">
                <textarea
                  value={text}
                  onChange={(e) => {
                    if (e.target.value.length <= settings.charLimit) {
                      setText(e.target.value);
                    }
                  }}
                  placeholder={`Scrie continuarea poveștii aici... (Gen: ${currentTurn.currentGenre})`}
                  className="w-full h-36 md:h-48 landscape:h-32 bg-gray-900/80 border border-gray-700/80 rounded-2xl p-4 md:p-6 text-sm md:text-lg text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none transition-all duration-200 shadow-inner flex-1 min-h-[140px]"
                />
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <button
                    onClick={() => handleSubmit(true)}
                    disabled={isSubmitting}
                    title="Lasă AI Copilot să scrie acest rând pentru tine"
                    className="bg-gray-950/80 hover:bg-gray-900 active:scale-95 disabled:opacity-50 text-brand-400 hover:text-brand-300 p-2.5 rounded-xl transition-all shadow-lg flex items-center gap-1.5 border border-gray-800"
                  >
                    <Bot size={18} />
                    <span className="text-xs font-bold hidden sm:inline">Copilot AI</span>
                  </button>
                  <button
                    onClick={() => handleSubmit(false)}
                    disabled={!text.trim() || isSubmitting}
                    className="bg-brand-600 hover:bg-brand-500 active:scale-95 disabled:bg-gray-950 disabled:text-gray-700 text-white p-2.5 rounded-xl transition-all shadow-lg shadow-brand-500/20"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center p-6 md:p-12 glass-panel flex flex-col justify-center items-center h-full min-h-[200px] landscape:min-h-0">
              <Clock className="mx-auto text-gray-500 mb-3 animate-bounce" size={36} />
              <h2 className="text-lg md:text-2xl font-bold mb-1.5">Așteaptă...</h2>
              <p className="text-xs md:text-sm text-gray-400">Acum scrie alt jucător. Fii pe fază!</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

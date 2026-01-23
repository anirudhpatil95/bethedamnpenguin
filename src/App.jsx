import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Play, X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://erqplzfrkjhmeepidhmf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVycXBsemZya2pobWVlcGlkaG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNTQyMDQsImV4cCI6MjA4NDYzMDIwNH0.LDN4bjjg-YnGe8PSL2gNdfa9AM30jeUwUy2SSJ-55v8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const GOAL_EMOJIS = {
  money: '💰', wealth: '💰', financial: '💰', income: '💰', rich: '💰',
  house: '🏠', home: '🏠', property: '🏠', real_estate: '🏠',
  love: '❤️', relationship: '❤️', marriage: '❤️', partner: '❤️', family: '👨‍👩‍👧‍👦',
  health: '💪', fitness: '💪', exercise: '💪', gym: '💪',
  career: '💼', job: '💼', work: '💼', promotion: '💼',
  education: '📚', study: '📚', learning: '📚', degree: '📚',
  business: '🚀', startup: '🚀', entrepreneur: '🚀',
  travel: '✈️', vacation: '✈️', adventure: '✈️',
  happiness: '😊', joy: '😊', peace: '😊',
  success: '🏆', achievement: '🏆', goals: '🎯'
};

const OBSTACLES_BY_CATEGORY = {
  money: ['Overspending', 'No Savings', 'Debt', 'Impulse Buying', 'Laziness', 'Fear'],
  house: ['Debt', 'Poor Planning', 'Overspending', 'Procrastination', 'Doubt'],
  love: ['Dishonesty', 'Selfishness', 'Poor Communication', 'Jealousy', 'Ego'],
  health: ['Junk Food', 'Laziness', 'Excuses', 'Procrastination', 'Stress'],
  career: ['Procrastination', 'Fear', 'Self-Doubt', 'Distractions', 'Giving Up'],
  education: ['Laziness', 'Distractions', 'Fear of Failure', 'No Discipline', 'Excuses'],
  business: ['Fear', 'Lack of Focus', 'Poor Planning', 'Giving Up', 'Self-Doubt'],
  default: ['Procrastination', 'Fear', 'Doubt', 'Laziness', 'Excuses', 'Giving Up']
};

const Game = () => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu'); // menu, playing, gameover
  const [goals, setGoals] = useState(['', '', '']);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const gameLoopRef = useRef(null);
  const keysRef = useRef({});

  const gameStateRef = useRef({
    penguin: { x: 250, y: 450, width: 40, height: 50, lane: 1 },
    obstacles: [],
    coins: [],
    speed: 2,
    spawnTimer: 0,
    goalEmojis: [],
    invincible: false,
    invincibleTimer: 0
  });

  useEffect(() => {
    loadLeaderboard();
    const savedHighScore = localStorage.getItem('penguinHighScore');
    if (savedHighScore) setHighScore(parseInt(savedHighScore));
  }, []);

  const loadLeaderboard = async () => {
    const { data } = await supabase
      .from('leaderboard')
      .select('*')
      .order('score', { ascending: false })
      .limit(10);
    if (data) setLeaderboard(data);
  };

  const saveScore = async () => {
    if (!playerName.trim()) return;
    
    await supabase.from('leaderboard').insert([{
      player_name: playerName.trim(),
      score: score,
      goals: goals.filter(g => g.trim())
    }]);
    
    setShowNameInput(false);
    setPlayerName('');
    loadLeaderboard();
  };

  const getEmojiForGoal = (goal) => {
    const normalized = goal.toLowerCase().trim();
    for (const [key, emoji] of Object.entries(GOAL_EMOJIS)) {
      if (normalized.includes(key)) return emoji;
    }
    return '🎯';
  };

  const getObstaclesForGoal = (goal) => {
    const normalized = goal.toLowerCase().trim();
    for (const [key, obstacles] of Object.entries(OBSTACLES_BY_CATEGORY)) {
      if (normalized.includes(key)) return obstacles;
    }
    return OBSTACLES_BY_CATEGORY.default;
  };

  const startGame = () => {
    if (goals.filter(g => g.trim()).length === 0) {
      alert('Please enter at least one goal!');
      return;
    }

    const goalEmojis = goals.filter(g => g.trim()).map(g => ({
      emoji: getEmojiForGoal(g),
      text: g.trim()
    }));

    gameStateRef.current = {
      penguin: { x: 250, y: 450, width: 40, height: 50, lane: 1 },
      obstacles: [],
      coins: [],
      speed: 2,
      spawnTimer: 0,
      goalEmojis,
      allObstacles: goals.filter(g => g.trim()).flatMap(g => getObstaclesForGoal(g)),
      invincible: false,
      invincibleTimer: 0
    };

    setScore(0);
    setHealth(100);
    setGameState('playing');
  };

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;
    let scoreInterval;

    const handleKeyDown = (e) => {
      keysRef.current[e.key] = true;
    };

    const handleKeyUp = (e) => {
      keysRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const lanes = [150, 250, 350];

    const gameLoop = () => {
      const state = gameStateRef.current;

      // Clear canvas
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw snow ground
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 400, canvas.width, canvas.height - 400);

      // Draw mountains in background
      ctx.fillStyle = '#7dd3fc';
      ctx.beginPath();
      ctx.moveTo(0, 300);
      ctx.lineTo(200, 150);
      ctx.lineTo(400, 300);
      ctx.lineTo(0, 300);
      ctx.fill();

      ctx.fillStyle = '#60a5fa';
      ctx.beginPath();
      ctx.moveTo(150, 300);
      ctx.lineTo(300, 100);
      ctx.lineTo(450, 300);
      ctx.lineTo(150, 300);
      ctx.fill();

      // Draw goal mountains with emojis
      state.goalEmojis.forEach((goal, idx) => {
        const xPos = 100 + idx * 150;
        ctx.font = '48px Arial';
        ctx.fillText(goal.emoji, xPos, 80);
        ctx.font = '12px Arial';
        ctx.fillStyle = '#1e40af';
        ctx.fillText(goal.text.substring(0, 15), xPos - 10, 120);
      });

      // Move penguin based on keys
      if (keysRef.current['ArrowLeft'] && state.penguin.lane > 0) {
        state.penguin.lane--;
        keysRef.current['ArrowLeft'] = false;
      }
      if (keysRef.current['ArrowRight'] && state.penguin.lane < 2) {
        state.penguin.lane++;
        keysRef.current['ArrowRight'] = false;
      }

      state.penguin.x = lanes[state.penguin.lane] - state.penguin.width / 2;

      // Draw penguin
      ctx.fillStyle = state.invincible ? '#fbbf24' : '#000000';
      ctx.beginPath();
      ctx.ellipse(state.penguin.x + 20, state.penguin.y + 15, 20, 25, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(state.penguin.x + 10, state.penguin.y + 20, 20, 15);

      // Spawn obstacles and coins
      state.spawnTimer++;
      if (state.spawnTimer > 60 / state.speed) {
        state.spawnTimer = 0;
        
        if (Math.random() > 0.4) {
          const lane = Math.floor(Math.random() * 3);
          const obstacleText = state.allObstacles[Math.floor(Math.random() * state.allObstacles.length)];
          state.obstacles.push({
            x: lanes[lane] - 40,
            y: -50,
            width: 80,
            height: 30,
            text: obstacleText,
            lane
          });
        }
        
        if (Math.random() > 0.5) {
          const lane = Math.floor(Math.random() * 3);
          state.coins.push({
            x: lanes[lane] - 10,
            y: -50,
            width: 20,
            height: 20,
            lane
          });
        }
      }

      // Update and draw obstacles
      state.obstacles = state.obstacles.filter(obs => {
        obs.y += state.speed;

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeStyle = '#991b1b';
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.fillText(obs.text.substring(0, 12), obs.x + 5, obs.y + 20);

        // Collision detection
        if (!state.invincible &&
            obs.x < state.penguin.x + state.penguin.width &&
            obs.x + obs.width > state.penguin.x &&
            obs.y < state.penguin.y + state.penguin.height &&
            obs.y + obs.height > state.penguin.y) {
          
          setHealth(prev => {
            const newHealth = Math.max(0, prev - 33.33);
            if (newHealth <= 0) {
              setGameState('gameover');
              if (score > highScore) {
                setHighScore(score);
                localStorage.setItem('penguinHighScore', score.toString());
              }
            }
            return newHealth;
          });
          
          state.invincible = true;
          state.invincibleTimer = 60;
          return false;
        }

        return obs.y < canvas.height;
      });

      // Update and draw coins
      state.coins = state.coins.filter(coin => {
        coin.y += state.speed;

        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(coin.x + 10, coin.y + 10, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('$', coin.x + 6, coin.y + 15);

        // Coin collection
        if (coin.x < state.penguin.x + state.penguin.width &&
            coin.x + coin.width > state.penguin.x &&
            coin.y < state.penguin.y + state.penguin.height &&
            coin.y + coin.height > state.penguin.y) {
          setScore(prev => prev + 10);
          return false;
        }

        return coin.y < canvas.height;
      });

      // Invincibility timer
      if (state.invincible) {
        state.invincibleTimer--;
        if (state.invincibleTimer <= 0) {
          state.invincible = false;
        }
      }

      // Increase speed gradually
      if (state.speed < 8) {
        state.speed += 0.001;
      }

      animationId = requestAnimationFrame(gameLoop);
    };

    scoreInterval = setInterval(() => {
      setScore(prev => prev + 1);
    }, 100);

    gameLoop();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationId);
      clearInterval(scoreInterval);
    };
  }, [gameState, score, highScore]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-slate-200 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {gameState === 'menu' && (
          <div className="bg-white rounded-xl shadow-2xl p-8">
            <h1 className="text-4xl font-bold text-center mb-2 text-slate-800">
              🐧 Be The Damn Penguin
            </h1>
            <p className="text-center text-slate-600 mb-8">
              Set your goals and race toward them!
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Goal 1
                </label>
                <input
                  type="text"
                  value={goals[0]}
                  onChange={(e) => setGoals([e.target.value, goals[1], goals[2]])}
                  placeholder="e.g., Make money, Buy a house..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Goal 2
                </label>
                <input
                  type="text"
                  value={goals[1]}
                  onChange={(e) => setGoals([goals[0], e.target.value, goals[2]])}
                  placeholder="e.g., Get healthy, Find love..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Goal 3
                </label>
                <input
                  type="text"
                  value={goals[2]}
                  onChange={(e) => setGoals([goals[0], goals[1], e.target.value])}
                  placeholder="e.g., Start a business, Travel..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              onClick={startGame}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-bold text-lg flex items-center justify-center gap-2 shadow-lg"
            >
              <Play className="w-6 h-6" />
              Start Running!
            </button>

            <button
              onClick={() => setShowLeaderboard(true)}
              className="w-full mt-4 px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all font-medium flex items-center justify-center gap-2"
            >
              <Trophy className="w-5 h-5" />
              Global Leaderboard
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="bg-white rounded-xl shadow-2xl p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="text-xl font-bold">Score: {score}</div>
              <div className="text-lg">High: {highScore}</div>
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">Health:</span>
                <div className="flex-1 bg-slate-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-600 h-full transition-all duration-300"
                    style={{ width: `${health}%` }}
                  />
                </div>
                <span className="text-sm font-bold">{Math.round(health)}%</span>
              </div>
            </div>

            <canvas
              ref={canvasRef}
              width={500}
              height={600}
              className="border-4 border-slate-300 rounded-lg w-full"
            />

            <div className="mt-4 text-center text-sm text-slate-600">
              Use ← → Arrow Keys to dodge obstacles
            </div>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="bg-white rounded-xl shadow-2xl p-8">
            <h2 className="text-3xl font-bold text-center mb-4 text-red-600">
              Game Over!
            </h2>
            <div className="text-center mb-6">
              <p className="text-2xl font-bold mb-2">Final Score: {score}</p>
              <p className="text-lg text-slate-600">High Score: {highScore}</p>
            </div>

            {!showNameInput && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowNameInput(true)}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-bold flex items-center justify-center gap-2"
                >
                  <Trophy className="w-5 h-5" />
                  Save to Leaderboard
                </button>
                <button
                  onClick={() => setGameState('menu')}
                  className="w-full px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all font-bold"
                >
                  Back to Menu
                </button>
              </div>
            )}

            {showNameInput && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && saveScore()}
                />
                <button
                  onClick={saveScore}
                  disabled={!playerName.trim()}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-bold disabled:opacity-50"
                >
                  Save Score
                </button>
                <button
                  onClick={() => setGameState('menu')}
                  className="w-full px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all font-bold"
                >
                  Back to Menu
                </button>
              </div>
            )}
          </div>
        )}

        {showLeaderboard && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    Global Leaderboard
                  </h2>
                  <button
                    onClick={() => setShowLeaderboard(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-3">
                  {leaderboard.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className={`p-4 rounded-lg ${
                        idx === 0 ? 'bg-yellow-100 border-2 border-yellow-400' :
                        idx === 1 ? 'bg-slate-100 border-2 border-slate-400' :
                        idx === 2 ? 'bg-orange-100 border-2 border-orange-400' :
                        'bg-slate-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold text-slate-600">
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-slate-800">
                              {entry.player_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {entry.goals?.join(', ').substring(0, 30)}...
                            </p>
                          </div>
                        </div>
                        <span className="text-xl font-bold text-blue-600">
                          {entry.score}
                        </span>
                      </div>
                    </div>
                  ))}
                  {leaderboard.length === 0 && (
                    <p className="text-center text-slate-500 py-8">
                      No scores yet. Be the first!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Game;

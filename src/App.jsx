import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Play, X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://erqplzfrkjhmeepidhmf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVycXBsemZya2pobWVlcGlkaG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNTQyMDQsImV4cCI6MjA4NDYzMDIwNH0.LDN4bjjg-YnGe8PSL2gNdfa9AM30jeUwUy2SSJ-55v8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const GOAL_EMOJIS = {
  money: '💰', wealth: '💰', financial: '💰', income: '💰', rich: '💰', dollar: '💰',
  house: '🏠', home: '🏠', property: '🏠', real_estate: '🏠', apartment: '🏠',
  love: '❤️', relationship: '❤️', marriage: '❤️', partner: '❤️', dating: '❤️',
  family: '👨‍👩‍👧‍👦', kids: '👨‍👩‍👧‍👦', children: '👨‍👩‍👧‍👦',
  health: '💪', fitness: '💪', exercise: '💪', gym: '💪', workout: '💪',
  career: '💼', job: '💼', work: '💼', promotion: '💼', professional: '💼',
  education: '📚', study: '📚', learning: '📚', degree: '📚', school: '📚',
  business: '🚀', startup: '🚀', entrepreneur: '🚀', company: '🚀',
  travel: '✈️', vacation: '✈️', adventure: '✈️', trip: '✈️', explore: '✈️',
  happiness: '😊', joy: '😊', peace: '😊', smile: '😊',
  success: '🏆', achievement: '🏆', goals: '🎯', target: '🎯'
};

const OBSTACLES_BY_CATEGORY = {
  money: ['Overspending', 'No Savings', 'Debt', 'Impulse Buying', 'Laziness', 'Fear', 'Poor Planning','Peer Pressure','Self Doubt','Society'],
  house: ['Debt', 'Poor Planning', 'Overspending', 'Procrastination', 'Doubt', 'Fear','Loan','Responsibilities','No drive'],
  love: ['Dishonesty', 'Selfishness', 'Poor Communication', 'Jealousy', 'Ego', 'Trust Issues','Fear','Self Doubt', 'Insecurity'],
  health: ['Junk Food', 'Laziness', 'Excuses', 'Procrastination', 'Stress', 'No Sleep','Insomnia','Self Doubt','Giving Up'],
  career: ['Procrastination', 'Fear', 'Self-Doubt', 'Distractions', 'Giving Up', 'Negativity','Anxiety','Peer Pressure'],
  education: ['Laziness', 'Distractions', 'Fear of Failure', 'No Discipline', 'Excuses'],
  business: ['Fear', 'Lack of Focus', 'Poor Planning', 'Giving Up', 'Self-Doubt', 'No Action'],
  travel: ['No Savings', 'Fear', 'Procrastination', 'Excuses', 'Doubt'],
  default: ['Procrastination', 'Fear', 'Doubt', 'Laziness', 'Excuses', 'Giving Up', 'Negativity']
};

const Game = () => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu');
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
    penguin: { x: 250, y: 480, width: 50, height: 60, lane: 1, targetX: 250, waddleOffset: 0 },
    obstacles: [],
    coins: [],
    speed: 0.8,
    spawnTimer: 0,
    goalEmojis: [],
    invincible: false,
    invincibleTimer: 0,
    frameCount: 0
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

  const drawPenguin = (ctx, x, y, waddleOffset, invincible) => {
    ctx.save();
    
    // Body (black)
    ctx.fillStyle = invincible ? '#fbbf24' : '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(x + 25, y + 25, 22, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Belly (white)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x + 25, y + 28, 14, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes (white background)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + 18, y + 18, 5, 0, Math.PI * 2);
    ctx.arc(x + 32, y + 18, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupils
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(x + 18, y + 18, 2.5, 0, Math.PI * 2);
    ctx.arc(x + 32, y + 18, 2.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Beak (orange)
    ctx.fillStyle = '#ff8c00';
    ctx.beginPath();
    ctx.moveTo(x + 25, y + 24);
    ctx.lineTo(x + 30, y + 28);
    ctx.lineTo(x + 25, y + 30);
    ctx.lineTo(x + 20, y + 28);
    ctx.closePath();
    ctx.fill();
    
    // Feet (orange)
    ctx.fillStyle = '#ff8c00';
    // Left foot
    ctx.beginPath();
    ctx.ellipse(x + 15 + waddleOffset, y + 52, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Right foot
    ctx.beginPath();
    ctx.ellipse(x + 35 - waddleOffset, y + 52, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Wings (black)
    ctx.fillStyle = invincible ? '#fbbf24' : '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(x + 8, y + 30, 6, 12, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 42, y + 30, 6, 12, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  };

  const drawCoin = (ctx, x, y) => {
    // Outer circle (gold)
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(x + 12, y + 12, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner circle (darker gold)
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(x + 12, y + 12, 9, 0, Math.PI * 2);
    ctx.fill();
    
    // Shine effect
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(x + 9, y + 9, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Dollar sign
    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('❤️', x + 8, y + 17);
  };

  const drawObstacle = (ctx, x, y, w, h, text) => {
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(x + 2, y + 2, w, h);
    
    // Main box (gradient)
    const gradient = ctx.createLinearGradient(x, y, x, y + h);
    gradient.addColorStop(0, '#f87171');
    gradient.addColorStop(1, '#dc2626');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);
    
    // Border
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    
    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text.substring(0, 13), x + w/2, y + h/2 + 4);
    ctx.textAlign = 'left';
  };

  const drawMountain = (ctx, x1, y1, x2, y2, x3, y3, color1, color2) => {
    const gradient = ctx.createLinearGradient(x2, y2, x2, y3);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.closePath();
    ctx.fill();
    
    // Snow cap
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.moveTo(x2 - 20, y2 + 30);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x2 + 20, y2 + 30);
    ctx.closePath();
    ctx.fill();
  };

  const startGame = () => {
    const validGoals = goals.filter(g => g.trim());
    if (validGoals.length === 0) {
      alert('Please enter at least one goal!');
      return;
    }

    const goalEmojis = validGoals.map(g => ({
      emoji: getEmojiForGoal(g),
      text: g.trim()
    }));

    gameStateRef.current = {
      penguin: { x: 250, y: 480, width: 50, height: 60, lane: 1, targetX: 250, waddleOffset: 0 },
      obstacles: [],
      coins: [],
      speed: 0.8,
      spawnTimer: 0,
      goalEmojis,
      allObstacles: validGoals.flatMap(g => getObstaclesForGoal(g)),
      invincible: false,
      invincibleTimer: 0,
      frameCount: 0
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
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
      }
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
      state.frameCount++;

      // Sky gradient
      const skyGradient = ctx.createLinearGradient(0, 0, 0, 400);
      skyGradient.addColorStop(0, '#bae6fd');
      skyGradient.addColorStop(1, '#e0f2fe');
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, canvas.width, 400);

      // Snow ground with texture
      const groundGradient = ctx.createLinearGradient(0, 400, 0, 600);
      groundGradient.addColorStop(0, '#f0f9ff');
      groundGradient.addColorStop(1, '#e0f2fe');
      ctx.fillStyle = groundGradient;
      ctx.fillRect(0, 400, canvas.width, 200);

      // Snow texture
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      for (let i = 0; i < 20; i++) {
        const x = (i * 30 + state.frameCount) % canvas.width;
        ctx.fillRect(x, 400, 2, 2);
        ctx.fillRect(x + 15, 420, 2, 2);
      }

      // Background mountains
      drawMountain(ctx, 0, 350, 120, 200, 240, 350, '#93c5fd', '#60a5fa');
      //drawMountain(ctx, 200, 350, 350, 150, 500, 350, '#7dd3fc', '#38bdf8');

      // Goal mountains with emojis
      state.goalEmojis.forEach((goal, idx) => {
        const xPos = 80 + idx * 140;
        
        ctx.font = '52px Arial';
        ctx.fillText(goal.emoji, xPos, 90);
        
        ctx.font = 'bold 13px Arial';
        ctx.fillStyle = '#1e3a8a';
        ctx.textAlign = 'center';
        ctx.fillText(goal.text.substring(0, 12), xPos + 26, 135);
        ctx.textAlign = 'left';
      });

      // Handle penguin movement
      if (keysRef.current['ArrowLeft'] && state.penguin.lane > 0) {
        state.penguin.lane--;
        keysRef.current['ArrowLeft'] = false;
      }
      if (keysRef.current['ArrowRight'] && state.penguin.lane < 2) {
        state.penguin.lane++;
        keysRef.current['ArrowRight'] = false;
      }

      // Smooth penguin movement
      state.penguin.targetX = lanes[state.penguin.lane] - state.penguin.width / 2;
      state.penguin.x += (state.penguin.targetX - state.penguin.x) * 0.2;

      // Waddle animation
      state.penguin.waddleOffset = Math.sin(state.frameCount * 0.15) * 2;

      // Draw penguin
      drawPenguin(ctx, state.penguin.x, state.penguin.y, state.penguin.waddleOffset, state.invincible);

      // Spawn obstacles and coins
      state.spawnTimer++;
      const spawnRate = Math.max(40, 80 - Math.floor(state.speed * 10));
      
      if (state.spawnTimer > spawnRate) {
        state.spawnTimer = 0;
        
        if (Math.random() > 0.35) {
          const lane = Math.floor(Math.random() * 3);
          const obstacleText = state.allObstacles[Math.floor(Math.random() * state.allObstacles.length)];
          state.obstacles.push({
            x: lanes[lane] - 45,
            y: -50,
            width: 90,
            height: 35,
            text: obstacleText,
            lane
          });
        }
        
        if (Math.random() > 0.4) {
          const lane = Math.floor(Math.random() * 3);
          state.coins.push({
            x: lanes[lane] - 12,
            y: -50,
            width: 24,
            height: 24,
            lane
          });
        }
      }

      // Update and draw obstacles
      state.obstacles = state.obstacles.filter(obs => {
        obs.y += state.speed;

        drawObstacle(ctx, obs.x, obs.y, obs.width, obs.height, obs.text);

        // Collision detection
        if (!state.invincible &&
            obs.x < state.penguin.x + state.penguin.width - 10 &&
            obs.x + obs.width > state.penguin.x + 10 &&
            obs.y < state.penguin.y + state.penguin.height - 10 &&
            obs.y + obs.height > state.penguin.y + 10) {
          
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
          state.invincibleTimer = 90;
          return false;
        }

        return obs.y < canvas.height;
      });

      // Update and draw coins
      state.coins = state.coins.filter(coin => {
        coin.y += state.speed;

        drawCoin(ctx, coin.x, coin.y);

        // Coin collection
        if (coin.x < state.penguin.x + state.penguin.width - 10 &&
            coin.x + coin.width > state.penguin.x + 10 &&
            coin.y < state.penguin.y + state.penguin.height - 10 &&
            coin.y + coin.height > state.penguin.y + 10) {
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

      // Gradual speed increase (slower progression)
      if (state.speed < 4.5) {
        state.speed += 0.0005;
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
    <div className="min-h-screen" style={{
      backgroundImage: 'url(https://images.unsplash.com/photo-1551582045-6ec9c11d8697?w=1200)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      <div className="min-h-screen bg-gradient-to-b from-slate-900/60 via-blue-900/40 to-slate-900/60 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          {gameState === 'menu' && (
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
              <div className="text-center mb-8">
                <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Be The Damn Penguin!
                </h1>
                <p className="text-xl text-slate-600">
                  Set your goals and race toward them!
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Goal 1
                  </label>
                  <input
                    type="text"
                    value={goals[0]}
                    onChange={(e) => setGoals([e.target.value, goals[1], goals[2]])}
                    placeholder="e.g., Make Money"
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Goal 2
                  </label>
                  <input
                    type="text"
                    value={goals[1]}
                    onChange={(e) => setGoals([goals[0], e.target.value, goals[2]])}
                    placeholder="e.g., Get Healthy"
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Goal 3
                  </label>
                  <input
                    type="text"
                    value={goals[2]}
                    onChange={(e) => setGoals([goals[0], goals[1], e.target.value])}
                    placeholder="e.g., Travel"
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <button
                onClick={startGame}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all font-bold text-xl flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Play className="w-7 h-7" />
                Start Running!
              </button>

              <button
                onClick={() => setShowLeaderboard(true)}
                className="w-full mt-4 px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-all font-semibold flex items-center justify-center gap-2"
              >
                <Trophy className="w-5 h-5" />
                Global Leaderboard
              </button>
            </div>
          )}

          {gameState === 'playing' && (
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="text-2xl font-bold text-slate-800">Score: {score}</div>
                <div className="text-lg text-slate-600">High: {highScore}</div>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-semibold text-slate-700">Health:</span>
                  <div className="flex-1 bg-slate-200 rounded-full h-5 overflow-hidden border-2 border-slate-300">
                    <div
                      className={`h-full transition-all duration-300 ${
                        health > 66 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                        health > 33 ? 'bg-gradient-to-r from-yellow-400 to-orange-400' :
                        'bg-gradient-to-r from-red-400 to-red-500'
                      }`}
                      style={{ width: `${health}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-800 w-12">{Math.round(health)}%</span>
                </div>
              </div>

              <canvas
                ref={canvasRef}
                width={1080}
                height={720}
                className="border-4 border-slate-400 rounded-xl w-full shadow-inner"
              />

              <div className="mt-4 text-center text-sm text-slate-600 font-medium">
                Use ← → Arrow Keys to dodge obstacles
              </div>
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
              <h2 className="text-4xl font-bold text-center mb-4 text-red-600">
                Game Over!
              </h2>
              <div className="text-center mb-6">
                <p className="text-3xl font-bold mb-2 text-slate-800">Final Score: {score}</p>
                <p className="text-xl text-slate-600">High Score: {highScore}</p>
              </div>

              {!showNameInput && (
                <div className="space-y-3">
                  <button
                    onClick={() => setShowNameInput(true)}
                    className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all font-bold text-lg flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Trophy className="w-6 h-6" />
                    Save to Leaderboard
                  </button>
                  <button
                    onClick={() => setGameState('menu')}
                    className="w-full px-6 py-4 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition-all font-bold text-lg"
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
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                    onKeyPress={(e) => e.key === 'Enter' && saveScore()}
                  />
                  <button
                    onClick={saveScore}
                    disabled={!playerName.trim()}
                    className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Score
                  </button>
                  <button
                    onClick={() => setGameState('menu')}
                    className="w-full px-6 py-4 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition-all font-bold text-lg"
                  >
                    Back to Menu
                  </button>
                </div>
              )}
            </div>
          )}

          {showLeaderboard && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                      <Trophy className="w-8 h-8 text-yellow-500" />
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
                        className={`p-4 rounded-xl ${
                          idx === 0 ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 border-2 border-yellow-400' :
                          idx === 1 ? 'bg-gradient-to-r from-slate-100 to-slate-200 border-2 border-slate-400' :
                          idx === 2 ? 'bg-gradient-to-r from-orange-100 to-orange-200 border-2 border-orange-400' :
                          'bg-slate-50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-slate-700">
                              #{idx + 1}
                            </span>
                            <div>
                              <p className="font-bold text-slate-800 text-lg">
                                {entry.player_name}
                              </p>
                              <p className="text-xs text-slate-600">
                                {entry.goals?.join(', ').substring(0, 35)}...
                              </p>
                            </div>
                          </div>
                          <span className="text-2xl font-bold text-blue-600">
                            {entry.score}
                          </span>
                        </div>
                      </div>
                    ))}
                    {leaderboard.length === 0 && (
                      <p className="text-center text-slate-500 py-12 text-lg">
                        No scores yet. Be the first penguin!
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Game;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  X,
  CheckCircle2,
  Star,
  Zap,
  GraduationCap,
  Layers,
  ChevronLeft,
  ChevronRight,
  Lock,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Brain,
  Hash,
  Share2,
  Award
} from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface EducationalGamesProps {
  studentName?: string;
  studentCode?: string;
  studentId?: string;
  onNavigateHome?: () => void;
  onNavigateResults?: () => void;
  onNavigateProfile?: () => void;
}

// Color Palette for Color Sort
const COLOR_PALETTE = [
  { hex: '#ef4444', name: 'أحمر' },
  { hex: '#3b82f6', name: 'أزرق' },
  { hex: '#10b981', name: 'أخضر' },
  { hex: '#f59e0b', name: 'أصفر' },
  { hex: '#8b5cf6', name: 'بنفسجي' },
  { hex: '#ec4899', name: 'وردي' },
  { hex: '#06b6d4', name: 'سماوي' },
  { hex: '#f97316', name: 'برتقالي' },
];

export default function EducationalGames({
  studentName = 'الطالب المميز',
  studentCode = '1001',
  studentId = '',
  onNavigateHome,
  onNavigateResults,
  onNavigateProfile
}: EducationalGamesProps) {
  // Settings & Navigation
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Active Game Modal State: 'color_sort' | 'number_2048' | 'color_flow' | null
  const [activeGame, setActiveGame] = useState<'color_sort' | 'number_2048' | 'color_flow' | null>(null);

  // Level Selector Drawer State
  const [levelSelectorGame, setLevelSelectorGame] = useState<'color_sort' | 'number_2048' | 'color_flow' | null>(null);

  // User Scores & Progress
  const [userStars, setUserStars] = useState<number>(15);
  const [userPoints, setUserPoints] = useState<number>(950);
  
  // Unlocked levels per game (1-indexed)
  const [unlockedLevels, setUnlockedLevels] = useState<{ [game: string]: number }>({
    color_sort: 1,
    number_2048: 1,
    color_flow: 1,
  });

  // Completed level stars: e.g. { "color_sort_level_1": 3 }
  const [completedStars, setCompletedStars] = useState<{ [key: string]: number }>({});

  // Active Level playing for each game
  const [currentLevel, setCurrentLevel] = useState<{ [game: string]: number }>({
    color_sort: 1,
    number_2048: 1,
    color_flow: 1,
  });

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const userStorageKey = `mind_games_progress_${studentCode || studentId || 'default'}`;

  // -------------------------------------------------------------------
  // Load & Sync Persistence (LocalStorage + Firestore)
  // -------------------------------------------------------------------
  useEffect(() => {
    try {
      const cached = localStorage.getItem(userStorageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.points !== undefined) setUserPoints(parsed.points);
        if (parsed.stars !== undefined) setUserStars(parsed.stars);
        if (parsed.unlockedLevels) setUnlockedLevels(prev => ({ ...prev, ...parsed.unlockedLevels }));
        if (parsed.completedStars) setCompletedStars(prev => ({ ...prev, ...parsed.completedStars }));
      }
    } catch (e) {
      console.error('Error reading game cache:', e);
    }

    const loadFirestoreData = async () => {
      const docId = studentCode || studentId || 'default_student';
      if (!docId) return;
      try {
        const scoreRef = doc(db, 'student_game_scores', docId);
        const snap = await getDoc(scoreRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.points) setUserPoints(prev => Math.max(prev, data.points));
          if (data.stars) setUserStars(prev => Math.max(prev, data.stars));
          if (data.unlockedLevels) setUnlockedLevels(prev => ({ ...prev, ...data.unlockedLevels }));
          if (data.completedStars) setCompletedStars(prev => ({ ...prev, ...data.completedStars }));
        }
      } catch (err) {
        console.warn('Firestore load game scores error:', err);
      }
    };

    loadFirestoreData();
  }, [studentCode, studentId]);

  const saveRewardsAndAdvance = async (gameId: string, levelNum: number, earnedPts: number, earnedStars: number) => {
    const starKey = `${gameId}_level_${levelNum}`;
    const prevStarsForLevel = completedStars[starKey] || 0;
    const newStarsForLevel = Math.max(prevStarsForLevel, earnedStars);
    
    // Total stars addition is delta
    const starsDelta = Math.max(0, earnedStars - prevStarsForLevel);
    const newPoints = userPoints + earnedPts;
    const newStarsTotal = userStars + starsDelta;

    const nextUnlockedLevel = Math.max(unlockedLevels[gameId] || 1, levelNum + 1);

    const newUnlocked = { ...unlockedLevels, [gameId]: nextUnlockedLevel };
    const newCompleted = { ...completedStars, [starKey]: newStarsForLevel };

    setUserPoints(newPoints);
    setUserStars(newStarsTotal);
    setUnlockedLevels(newUnlocked);
    setCompletedStars(newCompleted);

    setToastMsg(`🎉 إنجاز رائع! تجاوزت المرحلة ${levelNum} (+${earnedPts} نقطة و ${earnedStars} نجوم)`);
    setTimeout(() => setToastMsg(null), 4000);

    const payload = {
      points: newPoints,
      stars: newStarsTotal,
      unlockedLevels: newUnlocked,
      completedStars: newCompleted,
      updatedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(userStorageKey, JSON.stringify(payload));
    } catch (e) {
      console.error('LocalStorage save error:', e);
    }

    const docId = studentCode || studentId || 'default_student';
    try {
      const scoreRef = doc(db, 'student_game_scores', docId);
      await setDoc(scoreRef, {
        studentName,
        studentCode,
        points: newPoints,
        stars: newStarsTotal,
        unlockedLevels: newUnlocked,
        completedStars: newCompleted,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      if (studentId) {
        const studentRef = doc(db, 'students', studentId);
        await updateDoc(studentRef, {
          gamePoints: newPoints,
          gameStars: newStarsTotal
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('Firestore save game score error:', err);
    }
  };

  // ===================================================================
  // GAME 1: COLOR SORT PUZZLE ENGINE (100+ Levels)
  // ===================================================================
  const [sortTubes, setSortTubes] = useState<string[][]>([]);
  const [selectedTube, setSelectedTube] = useState<number | null>(null);
  const [sortMoves, setSortMoves] = useState(0);
  const [sortHistory, setSortHistory] = useState<string[][][]>([]);
  const [sortWon, setSortWon] = useState(false);

  // Generate deterministic solvable Color Sort level
  const initColorSortLevel = (levelNum: number) => {
    const numColors = Math.min(8, 2 + Math.floor((levelNum - 1) / 3));
    const numEmpty = levelNum > 10 ? 2 : 2;
    const capacity = levelNum <= 3 ? 3 : 4;

    let seed = levelNum * 9876543;
    function random() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    const colorsNeeded = COLOR_PALETTE.slice(0, numColors);
    let items: string[] = [];
    colorsNeeded.forEach(c => {
      for (let k = 0; k < capacity; k++) {
        items.push(c.hex);
      }
    });

    // Shuffle items
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }

    const tubes: string[][] = [];
    for (let i = 0; i < numColors; i++) {
      tubes.push(items.slice(i * capacity, (i + 1) * capacity));
    }
    for (let i = 0; i < numEmpty; i++) {
      tubes.push([]);
    }

    setSortTubes(tubes);
    setSelectedTube(null);
    setSortMoves(0);
    setSortHistory([]);
    setSortWon(false);
  };

  useEffect(() => {
    if (activeGame === 'color_sort') {
      initColorSortLevel(currentLevel.color_sort);
    }
  }, [activeGame, currentLevel.color_sort]);

  const handleTubeClick = (index: number) => {
    if (sortWon) return;

    if (selectedTube === null) {
      if (sortTubes[index].length > 0) setSelectedTube(index);
    } else {
      if (selectedTube === index) {
        setSelectedTube(null);
        return;
      }

      const source = [...sortTubes[selectedTube]];
      const target = [...sortTubes[index]];

      if (source.length === 0) {
        setSelectedTube(null);
        return;
      }

      const capacity = currentLevel.color_sort <= 3 ? 3 : 4;
      const colorToPour = source[source.length - 1];

      if (target.length < capacity && (target.length === 0 || target[target.length - 1] === colorToPour)) {
        // Pour logic
        setSortHistory(prev => [...prev, sortTubes.map(t => [...t])]);

        source.pop();
        target.push(colorToPour);

        const newTubes = [...sortTubes];
        newTubes[selectedTube] = source;
        newTubes[index] = target;

        setSortTubes(newTubes);
        setSortMoves(prev => prev + 1);
        setSelectedTube(null);

        // Check victory
        checkSortVictory(newTubes, capacity);
      } else {
        if (sortTubes[index].length > 0) setSelectedTube(index);
        else setSelectedTube(null);
      }
    }
  };

  const undoSortMove = () => {
    if (sortHistory.length === 0 || sortWon) return;
    const lastState = sortHistory[sortHistory.length - 1];
    setSortTubes(lastState);
    setSortHistory(prev => prev.slice(0, -1));
    setSelectedTube(null);
    setSortMoves(prev => Math.max(0, prev - 1));
  };

  const checkSortVictory = (tubes: string[][], capacity: number) => {
    let completedColorTubes = 0;
    const numColors = Math.min(8, 2 + Math.floor((currentLevel.color_sort - 1) / 3));

    for (const tube of tubes) {
      if (tube.length === 0) continue;
      if (tube.length === capacity && tube.every(c => c === tube[0])) {
        completedColorTubes++;
      } else {
        return;
      }
    }

    if (completedColorTubes === numColors && !sortWon) {
      setSortWon(true);
      const earnedStars = sortMoves <= numColors * 4 ? 3 : sortMoves <= numColors * 6 ? 2 : 1;
      const earnedPts = 100 + currentLevel.color_sort * 25;
      saveRewardsAndAdvance('color_sort', currentLevel.color_sort, earnedPts, earnedStars);
    }
  };

  // ===================================================================
  // GAME 2: 2048 NUMBER PUZZLE ENGINE (50+ Levels)
  // ===================================================================
  const [grid2048, setGrid2048] = useState<number[][]>([
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ]);
  const [score2048, setScore2048] = useState(0);
  const [won2048, setWon2048] = useState(false);
  const [moves2048, setMoves2048] = useState(0);

  const getTarget2048 = (levelNum: number) => {
    const targets = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192];
    return targets[Math.min(targets.length - 1, levelNum - 1)] || 2048;
  };

  const spawnRandomTile = (board: number[][]) => {
    const emptyCells: { r: number; c: number }[] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (board[r][c] === 0) emptyCells.push({ r, c });
      }
    }
    if (emptyCells.length === 0) return board;

    const randCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const newBoard = board.map(row => [...row]);
    newBoard[randCell.r][randCell.c] = Math.random() < 0.9 ? 2 : 4;
    return newBoard;
  };

  const init2048Game = (levelNum: number) => {
    let emptyBoard = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ];
    emptyBoard = spawnRandomTile(emptyBoard);
    emptyBoard = spawnRandomTile(emptyBoard);

    setGrid2048(emptyBoard);
    setScore2048(0);
    setMoves2048(0);
    setWon2048(false);
  };

  useEffect(() => {
    if (activeGame === 'number_2048') {
      init2048Game(currentLevel.number_2048);
    }
  }, [activeGame, currentLevel.number_2048]);

  const slideRowLeft = (row: number[]): { newRow: number[]; gainedScore: number } => {
    const nonZero = row.filter(val => val !== 0);
    const newRow: number[] = [];
    let gainedScore = 0;

    for (let i = 0; i < nonZero.length; i++) {
      if (i < nonZero.length - 1 && nonZero[i] === nonZero[i + 1]) {
        const mergedVal = nonZero[i] * 2;
        newRow.push(mergedVal);
        gainedScore += mergedVal;
        i++;
      } else {
        newRow.push(nonZero[i]);
      }
    }

    while (newRow.length < 4) newRow.push(0);
    return { newRow, gainedScore };
  };

  const move2048 = (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (won2048) return;

    let currentBoard = grid2048.map(row => [...row]);
    let rotated = currentBoard;
    let totalScoreAdd = 0;
    let moved = false;

    if (direction === 'LEFT') {
      for (let r = 0; r < 4; r++) {
        const { newRow, gainedScore } = slideRowLeft(rotated[r]);
        if (newRow.join(',') !== rotated[r].join(',')) moved = true;
        rotated[r] = newRow;
        totalScoreAdd += gainedScore;
      }
    } else if (direction === 'RIGHT') {
      for (let r = 0; r < 4; r++) {
        const reversedRow = [...rotated[r]].reverse();
        const { newRow, gainedScore } = slideRowLeft(reversedRow);
        const finalRow = newRow.reverse();
        if (finalRow.join(',') !== rotated[r].join(',')) moved = true;
        rotated[r] = finalRow;
        totalScoreAdd += gainedScore;
      }
    } else if (direction === 'UP') {
      for (let c = 0; c < 4; c++) {
        const col = [rotated[0][c], rotated[1][c], rotated[2][c], rotated[3][c]];
        const { newRow, gainedScore } = slideRowLeft(col);
        if (newRow.join(',') !== col.join(',')) moved = true;
        for (let r = 0; r < 4; r++) rotated[r][c] = newRow[r];
        totalScoreAdd += gainedScore;
      }
    } else if (direction === 'DOWN') {
      for (let c = 0; c < 4; c++) {
        const col = [rotated[3][c], rotated[2][c], rotated[1][c], rotated[0][c]];
        const { newRow, gainedScore } = slideRowLeft(col);
        const finalCol = newRow.reverse();
        const origCol = [rotated[0][c], rotated[1][c], rotated[2][c], rotated[3][c]];
        if (finalCol.join(',') !== origCol.join(',')) moved = true;
        for (let r = 0; r < 4; r++) rotated[r][c] = finalCol[r];
        totalScoreAdd += gainedScore;
      }
    }

    if (moved) {
      const boardWithTile = spawnRandomTile(rotated);
      setGrid2048(boardWithTile);
      setScore2048(prev => prev + totalScoreAdd);
      setMoves2048(prev => prev + 1);

      // Check Target Win
      const targetVal = getTarget2048(currentLevel.number_2048);
      let hasReachedTarget = false;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (boardWithTile[r][c] >= targetVal) hasReachedTarget = true;
        }
      }

      if (hasReachedTarget && !won2048) {
        setWon2048(true);
        const earnedStars = moves2048 <= 30 ? 3 : moves2048 <= 60 ? 2 : 1;
        const earnedPts = 120 + currentLevel.number_2048 * 30;
        saveRewardsAndAdvance('number_2048', currentLevel.number_2048, earnedPts, earnedStars);
      }
    }
  };

  // Keyboard Navigation for 2048
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeGame !== 'number_2048') return;
      if (e.key === 'ArrowUp') move2048('UP');
      if (e.key === 'ArrowDown') move2048('DOWN');
      if (e.key === 'ArrowLeft') move2048('LEFT');
      if (e.key === 'ArrowRight') move2048('RIGHT');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeGame, grid2048, won2048, moves2048]);

  // ===================================================================
  // GAME 3: COLOR FLOW / PATH CONNECT PUZZLE ENGINE (100+ Levels)
  // ===================================================================
  const FLOW_DOT_COLORS = [
    { id: 'red', name: 'أحمر', color: '#ef4444', emoji: '🔴' },
    { id: 'blue', name: 'أزرق', color: '#3b82f6', emoji: '🔵' },
    { id: 'green', name: 'أخضر', color: '#10b981', emoji: '🟢' },
    { id: 'yellow', name: 'أصفر', color: '#f59e0b', emoji: '🟡' },
    { id: 'purple', name: 'بنفسجي', color: '#8b5cf6', emoji: '🟣' },
    { id: 'cyan', name: 'سماوي', color: '#06b6d4', emoji: '🩵' },
  ];

  interface FlowCell {
    r: number;
    c: number;
    endpointColorId: string | null;
    pathColorId: string | null;
  }

  const [flowSize, setFlowSize] = useState<number>(4);
  const [flowGrid, setFlowGrid] = useState<FlowCell[][]>([]);
  const [activeDrawColor, setActiveDrawColor] = useState<string | null>(null);
  const [flowWon, setFlowWon] = useState(false);
  const [flowPairs, setFlowPairs] = useState<{ colorId: string; pos1: [number, number]; pos2: [number, number] }[]>([]);

  const initFlowLevel = (levelNum: number) => {
    const size = levelNum <= 3 ? 4 : levelNum <= 10 ? 5 : levelNum <= 20 ? 6 : 7;
    const numPairs = Math.min(FLOW_DOT_COLORS.length, 2 + Math.floor((levelNum - 1) / 3));

    setFlowSize(size);

    let baseSeed = levelNum * 87654321;
    let pairs: { colorId: string; pos1: [number, number]; pos2: [number, number] }[] = [];
    let grid: FlowCell[][] = [];

    let attempts = 0;
    let success = false;

    while (attempts < 100 && !success) {
      attempts++;
      let seed = baseSeed + attempts * 99991;
      function random() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      }

      const visited: number[][] = Array.from({ length: size }, () => Array(size).fill(-1));
      
      const unvisitedCoords: [number, number][] = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          unvisitedCoords.push([r, c]);
        }
      }

      for (let i = unvisitedCoords.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [unvisitedCoords[i], unvisitedCoords[j]] = [unvisitedCoords[j], unvisitedCoords[i]];
      }

      const paths: [number, number][][] = [];
      for (let p = 0; p < numPairs; p++) {
        const start = unvisitedCoords.pop()!;
        paths.push([start]);
        visited[start[0]][start[1]] = p;
      }

      let grew = true;
      while (grew) {
        grew = false;
        for (let p = 0; p < numPairs; p++) {
          const currentHead = paths[p][paths[p].length - 1];
          const [hr, hc] = currentHead;

          const neighbors: [number, number][] = [];
          const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          for (const [dr, dc] of dirs) {
            const nr = hr + dr;
            const nc = hc + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size && visited[nr][nc] === -1) {
              neighbors.push([nr, nc]);
            }
          }

          if (neighbors.length > 0) {
            const chosen = neighbors[Math.floor(random() * neighbors.length)];
            paths[p].push(chosen);
            visited[chosen[0]][chosen[1]] = p;
            grew = true;
          }
        }
      }

      const allPathsValid = paths.every(path => path.length >= 2);
      
      if (allPathsValid) {
        success = true;
        
        grid = [];
        for (let r = 0; r < size; r++) {
          grid[r] = [];
          for (let c = 0; c < size; c++) {
            grid[r][c] = { r, c, endpointColorId: null, pathColorId: null };
          }
        }

        pairs = [];
        for (let p = 0; p < numPairs; p++) {
          const colorId = FLOW_DOT_COLORS[p].id;
          const pos1 = paths[p][0];
          const pos2 = paths[p][paths[p].length - 1];

          grid[pos1[0]][pos1[1]].endpointColorId = colorId;
          grid[pos2[0]][pos2[1]].endpointColorId = colorId;

          pairs.push({ colorId, pos1, pos2 });
        }
      }
    }

    setFlowGrid(grid);
    setFlowPairs(pairs);
    setActiveDrawColor(null);
    setFlowWon(false);
  };

  useEffect(() => {
    if (activeGame === 'color_flow') {
      initFlowLevel(currentLevel.color_flow);
    }
  }, [activeGame, currentLevel.color_flow]);

  const handleFlowCellClick = (r: number, c: number) => {
    if (flowWon) return;

    const cell = flowGrid[r][c];

    if (cell.endpointColorId) {
      setActiveDrawColor(cell.endpointColorId);
      updateFlowCellPath(r, c, cell.endpointColorId);
      return;
    }

    if (activeDrawColor) {
      updateFlowCellPath(r, c, cell.pathColorId === activeDrawColor ? null : activeDrawColor);
    }
  };

  const updateFlowCellPath = (r: number, c: number, colorId: string | null) => {
    const updated = flowGrid.map(row => row.map(cell => ({ ...cell })));
    updated[r][c].pathColorId = colorId;
    setFlowGrid(updated);

    checkFlowVictory(updated);
  };

  const clearFlowPaths = () => {
    const updated = flowGrid.map(row => row.map(cell => ({ ...cell, pathColorId: null })));
    setFlowGrid(updated);
    setActiveDrawColor(null);
    setFlowWon(false);
  };

  const checkFlowVictory = (grid: FlowCell[][]) => {
    for (const pair of flowPairs) {
      const [r1, c1] = pair.pos1;
      const [r2, c2] = pair.pos2;

      const queue: [number, number][] = [[r1, c1]];
      const visited = new Set<string>();
      visited.add(`${r1},${c1}`);
      let connected = false;

      while (queue.length > 0) {
        const [currR, currC] = queue.shift()!;
        if (currR === r2 && currC === c2) {
          connected = true;
          break;
        }

        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of dirs) {
          const nr = currR + dr;
          const nc = currC + dc;
          const key = `${nr},${nc}`;
          if (
            nr >= 0 && nr < flowSize && nc >= 0 && nc < flowSize &&
            !visited.has(key) &&
            grid[nr][nc].pathColorId === pair.colorId
          ) {
            visited.add(key);
            queue.push([nr, nc]);
          }
        }
      }

      if (!connected) return;
    }

    if (!flowWon) {
      setFlowWon(true);
      const earnedStars = 3;
      const earnedPts = 110 + currentLevel.color_flow * 20;
      saveRewardsAndAdvance('color_flow', currentLevel.color_flow, earnedPts, earnedStars);
    }
  };

  // Helper for level difficulty badge title
  const getLevelDifficultyBadge = (lvl: number) => {
    if (lvl <= 3) return { text: 'مبتدئ', color: 'bg-emerald-950 text-emerald-300 border-emerald-700' };
    if (lvl <= 8) return { text: 'سهل', color: 'bg-teal-950 text-teal-300 border-teal-700' };
    if (lvl <= 15) return { text: 'متوسط', color: 'bg-blue-950 text-blue-300 border-blue-700' };
    if (lvl <= 30) return { text: 'صعب', color: 'bg-purple-950 text-purple-300 border-purple-700' };
    if (lvl <= 50) return { text: 'شديد الصعوبة', color: 'bg-amber-950 text-amber-300 border-amber-700' };
    if (lvl <= 80) return { text: 'خبير الذكاء', color: 'bg-rose-950 text-rose-300 border-rose-700' };
    return { text: 'أسطوري 👑', color: 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-black' };
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f766e] text-slate-100 font-sans pb-28 relative overflow-x-hidden selection:bg-teal-500 selection:text-white">
      
      {/* Background Lighting Effects */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 text-slate-950 font-black px-6 py-3.5 rounded-2xl shadow-2xl border-2 border-white flex items-center gap-2 text-sm text-center"
          >
            <Sparkles className="w-5 h-5 fill-slate-950 shrink-0" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-teal-500/30 px-4 py-3 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-teal-400 to-cyan-400 shadow-lg flex items-center justify-center text-slate-950 font-black text-xl border-2 border-teal-200">
              <Brain className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white drop-shadow tracking-tight">
                مركز ألعاب الذكاء والعقل 🧠✨
              </h1>
              <span className="text-xs font-bold text-teal-300 flex items-center gap-1 opacity-90">
                <Sparkles className="w-3 h-3 text-amber-300" /> تحديات ذهن مخصصة ومراحل لا تنتهي!
              </span>
            </div>
          </div>

          {/* User Score Badges */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 bg-amber-400 text-amber-950 font-black px-3.5 py-1.5 rounded-full text-xs shadow border border-amber-200">
              <Star className="w-4 h-4 fill-amber-950 text-amber-950" />
              <span>{userStars} نجوم</span>
            </div>

            <div className="flex items-center gap-1.5 bg-teal-500 text-slate-950 font-black px-3.5 py-1.5 rounded-full text-xs shadow border border-teal-200">
              <Zap className="w-4 h-4 fill-slate-950 text-slate-950" />
              <span>{userPoints} نقطة</span>
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700"
              title="الصوت"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-teal-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-8 relative z-10">
        
        {/* HERO BANNER */}
        <div className="bg-slate-900/90 border-2 border-teal-500/40 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="space-y-2 text-center md:text-right z-10">
            <div className="inline-flex items-center gap-2 bg-teal-950 border border-teal-500/50 text-teal-300 text-xs font-extrabold px-3 py-1 rounded-full">
              <Brain className="w-3.5 h-3.5 text-amber-400" /> 3 ألعاب ذكاء بمنهجية المراحل والتدرج
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              مرحباً بك يا بطل الذكاء، {studentName}! 👋
            </h2>
            <p className="text-sm font-bold text-slate-300 max-w-xl leading-relaxed">
              اختر إحدى ألعاب العقل الثلاث أدناه، وتقدم في مئات المراحل المشوقة حيث تزداد الصعوبة خطوة بخطوة مع كل مرحلة تتخطاها!
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-800/80 p-4 rounded-2xl border border-slate-700 shadow-inner z-10 shrink-0">
            <div className="p-3 bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 rounded-xl shadow">
              <Trophy className="w-7 h-7 fill-slate-950" />
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-400 block">إجمالي إنجاز العقل</span>
              <span className="text-lg font-black text-amber-300">{userPoints} نقطة • {userStars} نجمة</span>
            </div>
          </div>
        </div>

        {/* SECTION TITLE */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400" /> قائمة ألعاب الذكاء والمنافسات
          </h3>
          <span className="text-xs font-black text-teal-300 bg-teal-950/80 border border-teal-500/40 px-3 py-1 rounded-full">
            مراحل متدرجة الصعوبة (1 - 100)
          </span>
        </div>

        {/* THE 3 PURE MIND GAMES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* GAME 1: COLOR SORT PUZZLE */}
          <motion.div 
            whileHover={{ y: -6 }}
            className="bg-slate-900/90 rounded-3xl border-2 border-purple-500/40 hover:border-purple-400 shadow-xl p-6 flex flex-col justify-between relative overflow-hidden group"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="bg-purple-950 text-purple-300 text-xs font-black px-3 py-1 rounded-full border border-purple-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" /> لعبة ترتيب الألوان 🧪
              </span>
              <span className="text-xs font-black text-amber-400 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                المرحلة {unlockedLevels.color_sort}
              </span>
            </div>

            <div className="mb-4">
              <h4 className="text-xl font-black text-white mb-2">
                فرز وتنسيق الألوان
              </h4>
              <p className="text-xs font-bold text-slate-400 leading-relaxed">
                انقل السوائل الملونة بين الأنابيب حتى يكتمل كل أنبوب بفرز لون موحد بالكامل!
              </p>
            </div>

            {/* Visual Sample Mini Tubes */}
            <div className="bg-slate-950 rounded-2xl p-4 border border-purple-900/50 flex items-center justify-around my-2 min-h-[140px]">
              <div className="w-7 h-24 rounded-b-xl border border-white/30 bg-white/5 p-1 flex flex-col-reverse gap-1">
                <div className="w-full h-4 rounded bg-purple-500" />
                <div className="w-full h-4 rounded bg-blue-500" />
                <div className="w-full h-4 rounded bg-amber-400" />
              </div>
              <div className="w-7 h-24 rounded-b-xl border border-white/30 bg-white/5 p-1 flex flex-col-reverse gap-1">
                <div className="w-full h-4 rounded bg-amber-400" />
                <div className="w-full h-4 rounded bg-purple-500" />
                <div className="w-full h-4 rounded bg-blue-500" />
              </div>
              <div className="w-7 h-24 rounded-b-xl border border-white/30 bg-white/5 p-1 flex flex-col-reverse gap-1">
                <div className="w-full h-4 rounded bg-blue-500" />
                <div className="w-full h-4 rounded bg-amber-400" />
                <div className="w-full h-4 rounded bg-purple-500" />
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <button
                onClick={() => {
                  setActiveGame('color_sort');
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black py-3.5 px-4 rounded-2xl shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition text-sm cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>لعب المرحلة الحالية ({currentLevel.color_sort})</span>
              </button>

              <button
                onClick={() => setLevelSelectorGame('color_sort')}
                className="w-full bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold py-2.5 px-4 rounded-xl border border-purple-800 text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <span>اختيار من بين 100+ مرحلة 📜</span>
              </button>
            </div>
          </motion.div>

          {/* GAME 2: 2048 NUMBER MERGE PUZZLE */}
          <motion.div 
            whileHover={{ y: -6 }}
            className="bg-slate-900/90 rounded-3xl border-2 border-amber-500/40 hover:border-amber-400 shadow-xl p-6 flex flex-col justify-between relative overflow-hidden group"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="bg-amber-950 text-amber-300 text-xs font-black px-3 py-1 rounded-full border border-amber-700 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-amber-400" /> لعبة دمج الأرقام 2048 🔢
              </span>
              <span className="text-xs font-black text-amber-400 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                المرحلة {unlockedLevels.number_2048}
              </span>
            </div>

            <div className="mb-4">
              <h4 className="text-xl font-black text-white mb-2">
                لغز دمج الأرقام مضاعفة 2048
              </h4>
              <p className="text-xs font-bold text-slate-400 leading-relaxed">
                حرك المربعات في الاتجاهات لدمج الأرقام المتشابهة واستهداف الرقم المطلوب في كل مرحلة!
              </p>
            </div>

            {/* Visual Sample 2048 Board */}
            <div className="bg-slate-950 rounded-2xl p-4 border border-amber-900/50 grid grid-cols-2 gap-2 my-2 min-h-[140px] place-items-center">
              <div className="w-14 h-14 bg-amber-500 text-slate-950 font-black text-xl rounded-xl flex items-center justify-center shadow">2</div>
              <div className="w-14 h-14 bg-orange-500 text-white font-black text-xl rounded-xl flex items-center justify-center shadow">4</div>
              <div className="w-14 h-14 bg-rose-600 text-white font-black text-xl rounded-xl flex items-center justify-center shadow">8</div>
              <div className="w-14 h-14 bg-amber-400 text-slate-950 font-black text-lg rounded-xl flex items-center justify-center shadow">16</div>
            </div>

            <div className="space-y-2 mt-4">
              <button
                onClick={() => {
                  setActiveGame('number_2048');
                }}
                className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black py-3.5 px-4 rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition text-sm cursor-pointer"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>لعب المرحلة الحالية ({currentLevel.number_2048})</span>
              </button>

              <button
                onClick={() => setLevelSelectorGame('number_2048')}
                className="w-full bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold py-2.5 px-4 rounded-xl border border-amber-800 text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <span>اختيار من بين 50+ مرحلة 📜</span>
              </button>
            </div>
          </motion.div>

          {/* GAME 3: COLOR FLOW / PATH CONNECT PUZZLE */}
          <motion.div 
            whileHover={{ y: -6 }}
            className="bg-slate-900/90 rounded-3xl border-2 border-teal-500/40 hover:border-teal-400 shadow-xl p-6 flex flex-col justify-between relative overflow-hidden group"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="bg-teal-950 text-teal-300 text-xs font-black px-3 py-1 rounded-full border border-teal-700 flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-teal-400" /> لعبة توصيل المسارات 🔴🔵
              </span>
              <span className="text-xs font-black text-amber-400 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                المرحلة {unlockedLevels.color_flow}
              </span>
            </div>

            <div className="mb-4">
              <h4 className="text-xl font-black text-white mb-2">
                توصيل خطوط النقاط الملونة
              </h4>
              <p className="text-xs font-bold text-slate-400 leading-relaxed">
                صل كل زوج من النقاط الملونة بخط متصل بدون تقاطع المسارات أو ترك أي خلية فارغة!
              </p>
            </div>

            {/* Visual Sample Grid Flow */}
            <div className="bg-slate-950 rounded-2xl p-4 border border-teal-900/50 grid grid-cols-3 gap-2 my-2 min-h-[140px] place-items-center">
              <div className="w-10 h-10 bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-center text-lg">🔴</div>
              <div className="w-10 h-10 bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-center text-lg">🔵</div>
              <div className="w-10 h-10 bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-center text-lg">🟢</div>
              <div className="w-10 h-10 bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-center text-lg">🟢</div>
              <div className="w-10 h-10 bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-center text-lg">🔴</div>
              <div className="w-10 h-10 bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-center text-lg">🔵</div>
            </div>

            <div className="space-y-2 mt-4">
              <button
                onClick={() => {
                  setActiveGame('color_flow');
                }}
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black py-3.5 px-4 rounded-2xl shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition text-sm cursor-pointer"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>لعب المرحلة الحالية ({currentLevel.color_flow})</span>
              </button>

              <button
                onClick={() => setLevelSelectorGame('color_flow')}
                className="w-full bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold py-2.5 px-4 rounded-xl border border-teal-800 text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <span>اختيار من بين 100+ مرحلة 📜</span>
              </button>
            </div>
          </motion.div>

        </div>

      </main>

      {/* =================================================================== */}
      {/* LEVEL SELECTOR DRAWER / MODAL FOR ALL 3 GAMES */}
      {/* =================================================================== */}
      <AnimatePresence>
        {levelSelectorGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border-2 border-teal-500/40 rounded-3xl p-6 max-w-2xl w-full text-white shadow-2xl relative space-y-4"
            >
              <button
                onClick={() => setLevelSelectorGame(null)}
                className="absolute top-4 left-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-1">
                <span className="bg-teal-950 text-teal-300 border border-teal-700 text-xs font-bold px-3 py-1 rounded-full">
                  خريطة المراحل والتدرج
                </span>
                <h3 className="text-2xl font-black text-white">
                  {levelSelectorGame === 'color_sort' && 'مراحل لعبة ترتيب الألوان 🧪'}
                  {levelSelectorGame === 'number_2048' && 'مراحل لعبة دمج الأرقام 2048 🔢'}
                  {levelSelectorGame === 'color_flow' && 'مراحل لعبة توصيل المسارات 🔴🔵'}
                </h3>
                <p className="text-xs text-slate-400 font-bold">
                  انقر على أي مرحلة مفتوحة للعبها فوراً. تزداد الصعوبة مع تقدمك في الأرقام!
                </p>
              </div>

              {/* Levels Grid (Show 60 Levels) */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-[360px] overflow-y-auto p-2 border border-slate-800 bg-slate-950 rounded-2xl">
                {[...Array(60)].map((_, idx) => {
                  const lvlNum = idx + 1;
                  const maxUnlocked = unlockedLevels[levelSelectorGame] || 1;
                  const isUnlocked = lvlNum <= maxUnlocked;
                  const starKey = `${levelSelectorGame}_level_${lvlNum}`;
                  const starsCount = completedStars[starKey] || 0;
                  const diffBadge = getLevelDifficultyBadge(lvlNum);

                  return (
                    <button
                      key={lvlNum}
                      disabled={!isUnlocked}
                      onClick={() => {
                        setCurrentLevel(prev => ({ ...prev, [levelSelectorGame]: lvlNum }));
                        setActiveGame(levelSelectorGame);
                        setLevelSelectorGame(null);
                      }}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition relative ${
                        isUnlocked
                          ? 'bg-slate-800 hover:bg-teal-600/30 border-teal-500/50 cursor-pointer'
                          : 'bg-slate-900/40 border-slate-800 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <span className="text-sm font-black text-white">{lvlNum}</span>
                      
                      {isUnlocked ? (
                        <div className="flex gap-0.5">
                          {[...Array(3)].map((_, s) => (
                            <Star
                              key={s}
                              className={`w-2.5 h-2.5 ${s < starsCount ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`}
                            />
                          ))}
                        </div>
                      ) : (
                        <Lock className="w-3 h-3 text-slate-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs font-bold text-slate-400">
                <span>المرحلة المفتوحة حتى الآن: <strong className="text-teal-300">{unlockedLevels[levelSelectorGame] || 1}</strong></span>
                <button
                  onClick={() => setLevelSelectorGame(null)}
                  className="bg-teal-600 text-white font-black px-5 py-2 rounded-xl text-xs"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* GAME MODAL 1: COLOR SORT GAME PLAY SCREEN */}
      {/* =================================================================== */}
      <AnimatePresence>
        {activeGame === 'color_sort' && (
          <motion.div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <motion.div className="bg-slate-900 border-2 border-purple-500/50 rounded-3xl p-6 max-w-lg w-full text-white shadow-2xl relative space-y-4">
              <button
                onClick={() => setActiveGame(null)}
                className="absolute top-4 left-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black bg-purple-950 text-purple-300 px-3 py-1 rounded-full border border-purple-800">
                    لعبة فرز الألوان
                  </span>
                  <span className="text-sm font-black text-amber-300">
                    المرحلة {currentLevel.color_sort}
                  </span>
                </div>
                {(() => {
                  const badge = getLevelDifficultyBadge(currentLevel.color_sort);
                  return <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border ${badge.color}`}>{badge.text}</span>;
                })()}
              </div>

              {/* Game Stats Bar */}
              <div className="flex justify-between items-center bg-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-800">
                <span>الحركات: <strong className="text-purple-300 font-mono text-sm">{sortMoves}</strong></span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={undoSortMove}
                    disabled={sortHistory.length === 0 || sortWon}
                    className="text-slate-300 hover:text-white disabled:opacity-40 flex items-center gap-1 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700"
                  >
                    تراجع ↩️
                  </button>
                  <button
                    onClick={() => initColorSortLevel(currentLevel.color_sort)}
                    className="text-amber-400 flex items-center gap-1 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> إعادة
                  </button>
                </div>
              </div>

              {/* Tubes Play Area */}
              <div className="bg-slate-950 rounded-2xl p-6 border border-purple-900/50 flex flex-wrap justify-center gap-4 min-h-[240px]">
                {sortTubes.map((tube, idx) => {
                  const capacity = currentLevel.color_sort <= 3 ? 3 : 4;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleTubeClick(idx)}
                      className={`w-12 h-36 rounded-b-2xl border-2 cursor-pointer flex flex-col-reverse p-1.5 gap-1 relative transition-all ${
                        selectedTube === idx
                          ? 'border-amber-400 -translate-y-3 shadow-[0_0_15px_rgba(251,191,36,0.5)] bg-purple-950/40'
                          : 'border-slate-700 bg-slate-900/60 hover:border-purple-500/60'
                      }`}
                    >
                      {tube.map((colorHex, colorIdx) => (
                        <div
                          key={colorIdx}
                          style={{ backgroundColor: colorHex }}
                          className="w-full h-7 rounded-lg shadow-inner"
                        />
                      ))}
                      {tube.length === 0 && (
                        <span className="text-[10px] font-bold text-slate-600 absolute top-2 left-1/2 -translate-x-1/2">
                          فارغ
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Victory Card */}
              {sortWon && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-emerald-950 border-2 border-emerald-500 text-emerald-200 p-5 rounded-2xl text-center space-y-3 shadow-2xl"
                >
                  <Trophy className="w-10 h-10 text-amber-400 mx-auto animate-bounce" />
                  <h4 className="font-black text-lg text-white">مبروك! رتبت الألوان بنجاح 🎉</h4>
                  <p className="text-xs font-bold text-emerald-300">
                    اجتزت المرحلة {currentLevel.color_sort} وحصلت على النقاط والنجوم!
                  </p>
                  
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        const nextLvl = currentLevel.color_sort + 1;
                        setCurrentLevel(prev => ({ ...prev, color_sort: nextLvl }));
                        initColorSortLevel(nextLvl);
                      }}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black py-3 rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-1.5"
                    >
                      <span>المرحلة التالية ({currentLevel.color_sort + 1}) ⏭️</span>
                    </button>
                    
                    <button
                      onClick={() => setLevelSelectorGame('color_sort')}
                      className="bg-slate-800 text-white font-bold px-4 py-3 rounded-xl text-xs border border-slate-700"
                    >
                      قائمة المراحل 📜
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* GAME MODAL 2: 2048 NUMBER PUZZLE PLAY SCREEN */}
      {/* =================================================================== */}
      <AnimatePresence>
        {activeGame === 'number_2048' && (
          <motion.div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <motion.div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 max-w-md w-full text-white shadow-2xl relative space-y-4">
              <button
                onClick={() => setActiveGame(null)}
                className="absolute top-4 left-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black bg-amber-950 text-amber-300 px-3 py-1 rounded-full border border-amber-800">
                    لعبة 2048
                  </span>
                  <span className="text-sm font-black text-amber-300">
                    المرحلة {currentLevel.number_2048}
                  </span>
                </div>
                <span className="text-xs font-black text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-800">
                  الهدف: الوصول لـ {getTarget2048(currentLevel.number_2048)}
                </span>
              </div>

              {/* Game Stats */}
              <div className="flex justify-between items-center bg-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-800">
                <span>النقاط: <strong className="text-amber-400 font-mono text-sm">{score2048}</strong></span>
                <span>الحركات: <strong className="text-teal-300 font-mono text-sm">{moves2048}</strong></span>
                <button
                  onClick={() => init2048Game(currentLevel.number_2048)}
                  className="text-amber-400 flex items-center gap-1 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> إعادة
                </button>
              </div>

              {/* 4x4 Grid Board */}
              <div className="bg-slate-950 p-3 rounded-2xl border border-amber-900/50 grid grid-cols-4 gap-2.5 aspect-square">
                {grid2048.map((row, r) =>
                  row.map((val, c) => {
                    let tileColor = 'bg-slate-900 text-slate-600';
                    if (val === 2) tileColor = 'bg-amber-500 text-slate-950 font-black';
                    else if (val === 4) tileColor = 'bg-orange-500 text-white font-black';
                    else if (val === 8) tileColor = 'bg-rose-600 text-white font-black';
                    else if (val === 16) tileColor = 'bg-amber-400 text-slate-950 font-black';
                    else if (val === 32) tileColor = 'bg-teal-500 text-slate-950 font-black';
                    else if (val === 64) tileColor = 'bg-cyan-500 text-slate-950 font-black';
                    else if (val === 128) tileColor = 'bg-purple-600 text-white font-black';
                    else if (val >= 256) tileColor = 'bg-gradient-to-tr from-amber-400 to-rose-500 text-slate-950 font-black shadow-lg';

                    return (
                      <div
                        key={`${r}-${c}`}
                        className={`rounded-xl flex items-center justify-center text-lg sm:text-xl transition-all duration-200 shadow ${tileColor}`}
                      >
                        {val > 0 ? val : ''}
                      </div>
                    );
                  })
                )}
              </div>

              {/* On-screen Directional Touch Controls */}
              <div className="flex flex-col items-center gap-2 pt-1">
                <button
                  onClick={() => move2048('UP')}
                  className="w-12 h-12 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 rounded-xl flex items-center justify-center text-white border border-slate-700 font-black transition cursor-pointer"
                >
                  <ArrowUp className="w-6 h-6" />
                </button>
                <div className="flex gap-4">
                  <button
                    onClick={() => move2048('RIGHT')}
                    className="w-12 h-12 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 rounded-xl flex items-center justify-center text-white border border-slate-700 font-black transition cursor-pointer"
                  >
                    <ArrowRight className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => move2048('DOWN')}
                    className="w-12 h-12 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 rounded-xl flex items-center justify-center text-white border border-slate-700 font-black transition cursor-pointer"
                  >
                    <ArrowDown className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => move2048('LEFT')}
                    className="w-12 h-12 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 rounded-xl flex items-center justify-center text-white border border-slate-700 font-black transition cursor-pointer"
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Victory Card */}
              {won2048 && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-amber-950 border-2 border-amber-500 text-amber-200 p-5 rounded-2xl text-center space-y-3 shadow-2xl"
                >
                  <Trophy className="w-10 h-10 text-amber-400 mx-auto animate-bounce" />
                  <h4 className="font-black text-lg text-white">وصلت للرقم الهدف بنجاح! 🎉</h4>
                  <p className="text-xs font-bold text-amber-300">
                    حققت {score2048} نقطة واجتزت المرحلة {currentLevel.number_2048}!
                  </p>
                  
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        const nextLvl = currentLevel.number_2048 + 1;
                        setCurrentLevel(prev => ({ ...prev, number_2048: nextLvl }));
                        init2048Game(nextLvl);
                      }}
                      className="flex-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black py-3 rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-1.5"
                    >
                      <span>المرحلة التالية ({currentLevel.number_2048 + 1}) ⏭️</span>
                    </button>
                    
                    <button
                      onClick={() => setLevelSelectorGame('number_2048')}
                      className="bg-slate-800 text-white font-bold px-4 py-3 rounded-xl text-xs border border-slate-700"
                    >
                      المراحل 📜
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* GAME MODAL 3: COLOR FLOW / PATH CONNECT PLAY SCREEN */}
      {/* =================================================================== */}
      <AnimatePresence>
        {activeGame === 'color_flow' && (
          <motion.div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <motion.div className="bg-slate-900 border-2 border-teal-500/50 rounded-3xl p-6 max-w-md w-full text-white shadow-2xl relative space-y-4">
              <button
                onClick={() => setActiveGame(null)}
                className="absolute top-4 left-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black bg-teal-950 text-teal-300 px-3 py-1 rounded-full border border-teal-800">
                    لعبة توصيل المسارات
                  </span>
                  <span className="text-sm font-black text-amber-300">
                    المرحلة {currentLevel.color_flow}
                  </span>
                </div>
                <span className="text-xs font-bold text-teal-300">
                  شبكة {flowSize}×{flowSize}
                </span>
              </div>

              {/* Controls Bar */}
              <div className="flex justify-between items-center bg-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-800">
                <span>اللون النشط: <strong className="text-teal-300">{activeDrawColor ? activeDrawColor : 'انقر على نقطة'}</strong></span>
                <button
                  onClick={clearFlowPaths}
                  className="text-amber-400 flex items-center gap-1 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> مسح الخطوط
                </button>
              </div>

              {/* Grid Canvas Area */}
              <div
                className="bg-slate-950 p-3 rounded-2xl border border-teal-900/50 grid gap-2 aspect-square"
                style={{ gridTemplateColumns: `repeat(${flowSize}, minmax(0, 1fr))` }}
              >
                {flowGrid.map((row, r) =>
                  row.map((cell, c) => {
                    const dotInfo = FLOW_DOT_COLORS.find(d => d.id === cell.endpointColorId);
                    const pathInfo = FLOW_DOT_COLORS.find(d => d.id === cell.pathColorId);

                    return (
                      <div
                        key={`${r}-${c}`}
                        onClick={() => handleFlowCellClick(r, c)}
                        style={{
                          backgroundColor: pathInfo ? `${pathInfo.color}33` : 'rgba(15, 23, 42, 0.6)',
                          borderColor: pathInfo ? pathInfo.color : '#334155'
                        }}
                        className="rounded-xl border-2 flex items-center justify-center text-xl cursor-pointer hover:border-teal-400 transition-all shadow-inner relative"
                      >
                        {cell.endpointColorId && dotInfo && (
                          <span className="text-2xl animate-pulse drop-shadow">
                            {dotInfo.emoji}
                          </span>
                        )}
                        {!cell.endpointColorId && cell.pathColorId && pathInfo && (
                          <div
                            style={{ backgroundColor: pathInfo.color }}
                            className="w-4 h-4 rounded-full shadow"
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Color Selector Bar */}
              <div className="flex items-center justify-center gap-2 pt-1">
                {flowPairs.map(p => {
                  const info = FLOW_DOT_COLORS.find(d => d.id === p.colorId);
                  if (!info) return null;
                  const isActive = activeDrawColor === info.id;

                  return (
                    <button
                      key={info.id}
                      onClick={() => setActiveDrawColor(info.id)}
                      style={{ backgroundColor: info.color }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm shadow font-black transition-transform ${
                        isActive ? 'scale-125 ring-4 ring-white' : 'opacity-80'
                      }`}
                    >
                      {info.emoji}
                    </button>
                  );
                })}
              </div>

              {/* Victory Card */}
              {flowWon && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-teal-950 border-2 border-teal-500 text-teal-200 p-5 rounded-2xl text-center space-y-3 shadow-2xl"
                >
                  <Trophy className="w-10 h-10 text-amber-400 mx-auto animate-bounce" />
                  <h4 className="font-black text-lg text-white">تم توصيل جميع المسارات بنجاح! 🎉</h4>
                  <p className="text-xs font-bold text-teal-300">
                    تجاوزت المرحلة {currentLevel.color_flow} بأداء ممتاز!
                  </p>
                  
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        const nextLvl = currentLevel.color_flow + 1;
                        setCurrentLevel(prev => ({ ...prev, color_flow: nextLvl }));
                        initFlowLevel(nextLvl);
                      }}
                      className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black py-3 rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-1.5"
                    >
                      <span>المرحلة التالية ({currentLevel.color_flow + 1}) ⏭️</span>
                    </button>
                    
                    <button
                      onClick={() => setLevelSelectorGame('color_flow')}
                      className="bg-slate-800 text-white font-bold px-4 py-3 rounded-xl text-xs border border-slate-700"
                    >
                      المراحل 📜
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FIXED BOTTOM APP BAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-teal-500/30 pb-safe">
        <div className="max-w-md mx-auto flex justify-around items-center p-2">
          
          <button
            onClick={onNavigateHome}
            className="flex flex-col items-center justify-center p-2 rounded-xl transition w-16 text-slate-400 hover:text-white"
          >
            <Brain className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-black">الرئيسية</span>
          </button>

          <button
            className="flex flex-col items-center justify-center p-2 rounded-xl transition w-16 text-amber-300 font-bold scale-105"
          >
            <Sparkles className="w-5 h-5 mb-1 text-amber-300 fill-amber-300" />
            <span className="text-[10px] font-black text-amber-300">الألعاب (3)</span>
          </button>

          <button
            onClick={onNavigateResults}
            className="flex flex-col items-center justify-center p-2 rounded-xl transition w-16 text-slate-400 hover:text-white"
          >
            <Award className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-black">الإنجازات</span>
          </button>

          <button
            onClick={onNavigateProfile}
            className="flex flex-col items-center justify-center p-2 rounded-xl transition w-16 text-slate-400 hover:text-white"
          >
            <Zap className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-black">الملف</span>
          </button>

        </div>
      </nav>

    </div>
  );
}

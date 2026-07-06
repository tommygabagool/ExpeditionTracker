
class Component extends DCLogic {
  constructor(props) {
    super(props);
    const saved = this.load();
    this.state = {
      tab: 'today',
      weekSel: null,
      expandedDay: null,
      calInput: '',
      wtInput: '',
      trailSel: null,
      trailFilters: { dist: 'any', gain: 'any', drive: 'any' },
      summitBack: 'today',
      badges: saved.badges || {},
      celebrate: null,
      completions: saved.completions || {},
      calories: saved.calories || {},
      weights: saved.weights || [{ date: '2026-07-05', lb: this.startWeight() }],
      hikes: saved.hikes || {}
    };
  }

  load() {
    try { return JSON.parse(localStorage.getItem('expcon-v1')) || {}; } catch (e) { return {}; }
  }
  persist() {
    const { completions, calories, weights, hikes, badges } = this.state;
    try { localStorage.setItem('expcon-v1', JSON.stringify({ completions, calories, weights, hikes, badges })); } catch (e) {}
  }
  setP(patch) { this.setState(patch, () => this.persist()); }

  componentDidMount() { this.reconcileBadges(false); }
  componentDidUpdate() { this.reconcileBadges(true); }

  reconcileBadges(celebrate) {
    const earned = this.computeBadges().filter(b => b.earned);
    const cur = this.state.badges;
    const next = { ...cur };
    let changed = false, newest = null;
    earned.forEach(b => {
      if (!cur[b.id]) { next[b.id] = b.when || this.keyOf(this.today()); changed = true; newest = b; }
    });
    if (changed) {
      const patch = { badges: next };
      if (celebrate && newest) patch.celebrate = newest.id;
      this.setState(patch, () => {
        this.persist();
        if (celebrate && newest) {
          clearTimeout(this._celebT);
          this._celebT = setTimeout(() => this.setState({ celebrate: null }), 5200);
        }
      });
    }
  }

  startWeight() { return this.props.startWeight ?? 260; }
  goalWeight() { return this.props.goalWeight ?? 230; }
  calTarget() { return this.props.calorieTarget ?? 2350; }

  // ---- program calendar ----
  startDate() { return new Date(2026, 6, 5); } // Sun Jul 5 2026
  today() { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }
  dateOf(week, dow) {
    const d = new Date(this.startDate());
    d.setDate(d.getDate() + (week - 1) * 7 + dow);
    return d;
  }
  keyOf(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  fmtShort(d) {
    const mo = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getMonth()];
    return mo + ' ' + String(d.getDate()).padStart(2, '0');
  }
  currentWeek() {
    const days = Math.floor((this.today() - this.startDate()) / 86400000);
    return Math.max(1, Math.min(26, Math.floor(days / 7) + 1));
  }
  isDeload(w) { return [5, 9, 14, 18, 23].includes(w); }
  phaseOf(w) {
    if (w <= 9) return { name: 'BASE CAMP', color: '#5B8C5A', idx: 0 };
    if (w <= 18) return { name: 'LOAD CAMP', color: '#4E7A96', idx: 1 };
    return { name: 'ALPINE PUSH', color: '#C1652E', idx: 2 };
  }

  workoutFor(week, dow) {
    const p = this.phaseOf(week).idx;
    const z2 = [60, 75, 90][p], thr = [40, 50, 60][p];
    const pack = [45, 55, 65][p], hrs = ['2\u20133 h', '3\u20135 h', '5\u20137 h'][p], gain = ['1,500', '2,500', '3,500'][p];
    switch (dow) {
      case 0: return { title: 'Lower A', type: 'strength', exercises: [
        { name: 'Back Squat', detail: '4\u00d75' },
        { name: 'Romanian Deadlift', detail: '3\u00d78' },
        { name: 'Weighted Step-Up', detail: '3\u00d710/leg' },
        { name: 'Standing Calf Raise', detail: '3\u00d715' },
        { name: 'Hanging Knee Raise', detail: '3\u00d712' }] };
      case 1: return { title: 'Upper Pull B', type: 'strength', exercises: [
        { name: 'Weighted Pull-Up', detail: '4\u00d75' },
        { name: 'Barbell Row', detail: '4\u00d78' },
        { name: 'Single-Arm DB Row', detail: '3\u00d710' },
        { name: 'Face Pull', detail: '3\u00d715' },
        { name: 'Farmer Carry', detail: '4\u00d740 m' }] };
      case 2: return { title: 'Zone 2 Cardio', type: 'cardio', exercises: [
        { name: 'Incline Treadmill', detail: z2 + ' min \u00b7 10\u201312%' },
        { name: 'Heart Rate Cap', detail: '130\u2013145 bpm' },
        { name: 'Hip + Ankle Mobility', detail: '15 min' }] };
      case 3: return { title: 'Lower / Full C', type: 'strength', exercises: [
        { name: 'Deadlift', detail: '4\u00d75' },
        { name: 'Front Squat', detail: '3\u00d76' },
        { name: 'Walking Lunge', detail: '3\u00d712/leg' },
        { name: 'Box Step-Down', detail: '3\u00d710/leg' },
        { name: 'Weighted Plank', detail: '3\u00d760 s' }] };
      case 4: return { title: 'Threshold Cardio', type: 'cardio', exercises: [
        { name: 'Stairmill', detail: thr + ' min \u00b7 145\u2013155 bpm' },
        { name: 'Cooldown Walk', detail: '10 min' },
        { name: 'Calf + Quad Stretch', detail: '10 min' }] };
      case 5: return { title: 'Upper Push + Core D', type: 'strength', exercises: [
        { name: 'Overhead Press', detail: '4\u00d75' },
        { name: 'Incline DB Bench', detail: '3\u00d78' },
        { name: 'Weighted Dip', detail: '3\u00d710' },
        { name: 'Pallof Press', detail: '3\u00d712/side' },
        { name: 'Weighted Sit-Up', detail: '3\u00d715' }] };
      default: return { title: 'Long Hike / Ruck', type: 'ruck', exercises: [
        { name: 'Ruck Pack', detail: pack + ' lb' },
        { name: 'Duration', detail: hrs },
        { name: 'Elevation Gain', detail: gain + ' ft' },
        { name: 'Fuel on the Move', detail: '200\u2013300 kcal/h' }] };
    }
  }

  // ---- ridgeline geometry ----
  ridge() {
    const pts = [];
    for (let i = 0; i < 26; i++) {
      const week = i + 1;
      const x = 15 + i * (360 / 25);
      const jag = ((i * 37) % 11) - 5;
      let y = 112 - (i / 25) * 86 + jag;
      if (this.isDeload(week)) y += 9;
      pts.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, week });
    }
    return pts;
  }
  segPaths(pts, from, to) {
    // include one point past `to` for continuity
    const seg = pts.slice(from, Math.min(to + 1, pts.length));
    const line = 'M' + seg.map(p => p.x + ' ' + p.y).join(' L');
    const fill = line + ' L' + seg[seg.length - 1].x + ' 124 L' + seg[0].x + ' 124 Z';
    return { line, fill };
  }

  // ---- trails ----
  trails() {
    return [
      { id: 'talcott', name: 'Talcott Mountain \u00b7 Heublein Tower', dist: 2.5, gain: 550, time: '1:30', drive: 45, diff: 'Easy', seed: 2,
        trailhead: 'Route 185 lot, Simsbury. Restrooms at the tower (seasonal).',
        notes: 'Steady climb on wide gravel to the ridgeline, then flat walking to the tower. Ideal early-phase ruck footing.' },
      { id: 'giant', name: 'Sleeping Giant \u00b7 Tower Trail', dist: 3.2, gain: 740, time: '1:45', drive: 15, diff: 'Moderate', seed: 5,
        trailhead: 'Main lot on Mt Carmel Ave, Hamden \u2014 opposite Quinnipiac.',
        notes: 'Carriage road with a consistent grade to the stone tower. Add the Blue Trail loop for extra vert.' },
      { id: 'chauncey', name: 'Mattabesett \u00b7 Chauncey Peak Loop', dist: 4.8, gain: 900, time: '2:30', drive: 25, diff: 'Moderate', seed: 8,
        trailhead: 'Giuffrida Park, Meriden. Lot fills by 9 AM on weekends.',
        notes: 'Cliff-edge walking above Crescent Lake, two summits per lap. Rocky sections \u2014 good boot practice.' },
      { id: 'ragged', name: 'Ragged Mountain Loop', dist: 5.5, gain: 1100, time: '3:00', drive: 30, diff: 'Moderate', seed: 11,
        trailhead: 'West Lane lot, Berlin. No facilities.',
        notes: 'Traprock ridgeline with repeated short climbs \u2014 the best mid-phase leg burner in central CT.' },
      { id: 'bear', name: 'Bear Mountain via Undermountain', dist: 6.7, gain: 1650, time: '4:00', drive: 75, diff: 'Hard', seed: 14,
        trailhead: 'Undermountain Trail lot, Route 41, Salisbury.',
        notes: 'Highest peak in CT. Sustained climb with a steep, scrambly summit block \u2014 treat it as a dress rehearsal.' }
    ];
  }
  diffColor(diff) { return diff === 'Easy' ? '#5B8C5A' : diff === 'Hard' ? '#C1652E' : '#E3B341'; }
  topo(seed, w, h, rings) {
    const paths = [];
    const cx = w * 0.48, cy = h * 0.5;
    for (let k = 1; k <= rings; k++) {
      const r = (k / rings) * Math.min(w, h) * 0.55 + 3;
      let d = '';
      const steps = 26;
      for (let i = 0; i <= steps; i++) {
        const a = (i % steps) / steps * Math.PI * 2;
        const wob = 1 + 0.16 * Math.sin(a * 3 + seed) + 0.11 * Math.sin(a * 5 + seed * 2.3) + 0.07 * Math.sin(a * 8 + seed * 4.1);
        const x = cx + Math.cos(a) * r * wob * (w / h) * 0.62;
        const y = cy + Math.sin(a) * r * wob * 0.78;
        d += (i ? ' L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      paths.push({ d: d + ' Z' });
    }
    return paths;
  }
  trailRoute(seed, w, h) {
    let d = '', ex = 0, ey = 0, sx = 0, sy = 0;
    const n = 12;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = (0.12 + t * 0.38) * w + Math.sin(t * 9 + seed) * w * 0.05;
      const y = (0.80 - t * 0.32) * h + Math.sin(t * 13 + seed * 2) * h * 0.05;
      if (i === 0) { sx = x; sy = y; }
      if (i === n) { ex = x; ey = y; }
      d += (i ? ' L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return { d, sx, sy, ex, ey };
  }
  trailProfile(seed, w, h) {
    const pts = [];
    const n = 32;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const up = t < 0.55 ? t / 0.55 : (1 - t) / 0.45;
      const e = Math.max(0, Math.min(1, Math.pow(up, 1.15) + 0.05 * Math.sin(t * 21 + seed)));
      pts.push((38 + t * (w - 48)).toFixed(1) + ' ' + (h - 16 - e * (h - 34)).toFixed(1));
    }
    const line = 'M' + pts.join(' L');
    const area = line + ' L' + (w - 10) + ' ' + (h - 16) + ' L38 ' + (h - 16) + ' Z';
    return { line, area };
  }
  nextSaturday() {
    const t = this.today();
    const d = new Date(t);
    d.setDate(d.getDate() + ((6 - t.getDay()) + 7) % 7);
    return d;
  }
  targetGain(week) {
    let g = 500 + (week - 1) * (3500 - 500) / 25;
    if (this.isDeload(week)) g *= 0.6;
    return g;
  }

  // ---- achievements ----
  ICONS() {
    return {
      mountain: ['M4 40 L18 14 L26 26 L32 18 L44 40 Z', 'M18 14 L22 20', 'M32 18 L29 23'],
      pack: ['M16 18 Q16 9 24 9 Q32 9 32 18', 'M13 18 L35 18 L35 42 L13 42 Z', 'M19 27 L29 27', 'M21 18 L21 12', 'M27 18 L27 12'],
      dumbbell: ['M8 24 L40 24', 'M8 18 L8 30', 'M13 20 L13 28', 'M35 20 L35 28', 'M40 18 L40 30'],
      fire: ['M24 8 Q33 20 27 30 Q32 28 31 22 Q39 32 30 42 Q17 46 15 33 Q14 24 22 22 Q18 15 24 8 Z'],
      calendar: ['M12 14 L36 14 L36 40 L12 40 Z', 'M12 22 L36 22', 'M18 10 L18 18', 'M30 10 L30 18'],
      check: ['M10 26 L20 36 L38 12'],
      scale: ['M24 10 L24 40', 'M14 40 L34 40', 'M16 20 L32 20', 'M16 20 L11 30 L21 30 Z', 'M32 20 L27 30 L37 30 Z'],
      trophy: ['M16 12 L32 12 L31 24 Q24 30 17 24 Z', 'M16 14 L10 14 Q10 22 17 22', 'M32 14 L38 14 Q38 22 31 22', 'M24 30 L24 36', 'M18 40 L30 40 L30 36 L18 36 Z'],
      clock: ['M24 24 m-15 0 a15 15 0 1 0 30 0 a15 15 0 1 0 -30 0', 'M24 24 L24 13', 'M24 24 L32 29'],
      shield: ['M24 8 L38 14 L38 26 Q38 38 24 44 Q10 38 10 26 L10 14 Z', 'M18 25 L23 31 L32 18'],
      utensils: ['M15 9 L15 41', 'M11 9 L11 19 Q11 23 15 23', 'M19 9 L19 19 Q19 23 15 23', 'M32 9 Q26 12 26 23 L32 23 L32 41'],
      flag: ['M16 42 L16 9', 'M16 11 L33 15 L16 21']
    };
  }
  BADGE_DEFS() {
    return [
      { id: 'first_ruck', camp: 0, icon: 'pack', title: 'First Ruck', goal: 1, kind: 'ruck' },
      { id: 'lb_5', camp: 0, icon: 'scale', title: '5 lb Down', goal: 5, kind: 'lb' },
      { id: 'streak_7', camp: 0, icon: 'calendar', title: '7-Day Streak', goal: 7, kind: 'streak' },
      { id: 'rucks_10', camp: 1, icon: 'pack', title: '10 Rucks', goal: 10, kind: 'ruck' },
      { id: 'ruck_3h', camp: 1, icon: 'clock', title: 'First 3-Hr Ruck', goal: 1, kind: 'ruck3h' },
      { id: 'lb_10', camp: 1, icon: 'scale', title: '10 lb Down', goal: 10, kind: 'lb' },
      { id: 'streak_30', camp: 2, icon: 'fire', title: '30-Day Streak', goal: 30, kind: 'streak' },
      { id: 'workouts_50', camp: 2, icon: 'dumbbell', title: '50 Sessions', goal: 50, kind: 'sessions' },
      { id: 'perfect_week', camp: 2, icon: 'check', title: 'Perfect Week', goal: 1, kind: 'perfect' },
      { id: 'lb_20', camp: 3, icon: 'scale', title: '20 lb Down', goal: 20, kind: 'lb' },
      { id: 'base_survived', camp: 3, icon: 'mountain', title: 'Base Camp Survived', goal: 63, kind: 'phase', phase: 0 },
      { id: 'cal_30', camp: 3, icon: 'utensils', title: '30-Day Fuel Log', goal: 30, kind: 'calstreak' },
      { id: 'workouts_100', camp: 4, icon: 'dumbbell', title: '100 Sessions', goal: 100, kind: 'sessions' },
      { id: 'load_complete', camp: 4, icon: 'mountain', title: 'Load Camp Complete', goal: 63, kind: 'phase', phase: 1 },
      { id: 'deloads_all', camp: 4, icon: 'shield', title: 'All Deloads Respected', goal: 5, kind: 'deload' },
      { id: 'alpine_finished', camp: 5, icon: 'flag', title: 'Alpine Push Finished', goal: 56, kind: 'phase', phase: 2 },
      { id: 'goal_230', camp: 5, icon: 'trophy', title: 'Summit Weight', goal: 1, kind: 'goal' }
    ];
  }
  CAMP_DEFS() {
    return [
      { name: 'TRAILHEAD', alt: '0' },
      { name: 'CAMP 1', alt: '17,600' },
      { name: 'CAMP 2', alt: '19,900' },
      { name: 'CAMP 3', alt: '21,300' },
      { name: 'HIGH CAMP', alt: '26,000' },
      { name: 'SUMMIT', alt: '29,032' }
    ];
  }
  weekOfKey(key) {
    const d = new Date(key + 'T00:00:00');
    return Math.floor((d - this.startDate()) / 604800000) + 1;
  }
  longestRun(keys) {
    if (!keys.length) return 0;
    const days = [...new Set(keys.map(k => Math.floor(new Date(k + 'T00:00:00').getTime() / 86400000)))].sort((a, b) => a - b);
    let best = 1, run = 1;
    for (let i = 1; i < days.length; i++) {
      run = days[i] === days[i - 1] + 1 ? run + 1 : 1;
      if (run > best) best = run;
    }
    return best;
  }
  metrics() {
    const s = this.state;
    const doneKeys = Object.keys(s.completions).filter(k => s.completions[k]);
    const sessions = doneKeys.length;
    const ruckKeys = doneKeys.filter(k => new Date(k + 'T00:00:00').getDay() === 6);
    const streak = this.longestRun(doneKeys);
    // perfect week
    const byWeek = {};
    doneKeys.forEach(k => { const w = this.weekOfKey(k); byWeek[w] = (byWeek[w] || 0) + 1; });
    const perfect = Object.values(byWeek).some(c => c >= 7);
    // phases
    const phaseTot = [63, 63, 56];
    const phaseDone = [0, 0, 0];
    doneKeys.forEach(k => { const w = this.weekOfKey(k); if (w >= 1 && w <= 9) phaseDone[0]++; else if (w >= 10 && w <= 18) phaseDone[1]++; else if (w >= 19 && w <= 26) phaseDone[2]++; });
    // weight
    const sorted = [...s.weights].sort((a, b) => a.date < b.date ? -1 : 1);
    let maxLost = 0, lb5 = null, lb10 = null, lb20 = null, goalWhen = null, running = this.startWeight();
    const goal = this.goalWeight();
    sorted.forEach(e => {
      const lost = this.startWeight() - e.lb;
      if (lost > maxLost) maxLost = lost;
      if (lb5 == null && lost >= 5) lb5 = e.date;
      if (lb10 == null && lost >= 10) lb10 = e.date;
      if (lb20 == null && lost >= 20) lb20 = e.date;
      if (goalWhen == null && e.lb <= goal) goalWhen = e.date;
    });
    // deload weeks respected
    const deloadWeeks = [5, 9, 14, 18, 23];
    const deloadRespected = deloadWeeks.filter(w => (byWeek[w] || 0) >= 5).length;
    // 3-hour ruck (phase idx>=1, weeks>=10)
    const ruck3h = ruckKeys.some(k => this.weekOfKey(k) >= 10);
    const ruck3hWhen = ruck3h ? ruckKeys.find(k => this.weekOfKey(k) >= 10) : null;
    // calorie streak
    const calStreak = this.longestRun(Object.keys(s.calories));
    return {
      sessions, ruckCount: ruckKeys.length, firstRuckWhen: ruckKeys.sort()[0] || null,
      streak, perfect, phaseDone, phaseTot,
      maxLost, lb5, lb10, lb20, goalReached: goalWhen != null, goalWhen,
      deloadRespected, ruck3h, ruck3hWhen, calStreak
    };
  }
  computeBadges() {
    const m = this.metrics();
    const icons = this.ICONS();
    return this.BADGE_DEFS().map(def => {
      let cur = 0, when = null;
      switch (def.kind) {
        case 'ruck': cur = m.ruckCount; when = m.firstRuckWhen; break;
        case 'ruck3h': cur = m.ruck3h ? 1 : 0; when = m.ruck3hWhen; break;
        case 'sessions': cur = m.sessions; break;
        case 'streak': cur = m.streak; break;
        case 'perfect': cur = m.perfect ? 1 : 0; break;
        case 'lb': cur = Math.floor(m.maxLost); when = def.goal === 5 ? m.lb5 : def.goal === 10 ? m.lb10 : m.lb20; break;
        case 'goal': cur = m.goalReached ? 1 : 0; when = m.goalWhen; break;
        case 'phase': cur = m.phaseDone[def.phase]; break;
        case 'deload': cur = m.deloadRespected; break;
        case 'calstreak': cur = m.calStreak; break;
      }
      const earned = cur >= def.goal;
      return { ...def, iconPaths: icons[def.icon], cur: Math.min(cur, def.goal), earned, when: earned ? when : null };
    });
  }

  // ---- weight chart ----
  weightChart() {
    const goal = this.goalWeight();
    const entries = [...this.state.weights].sort((a, b) => a.date < b.date ? -1 : 1);
    const start = this.startDate().getTime();
    const span = 182 * 86400000;
    const lbs = entries.map(e => e.lb);
    const top = Math.max(this.startWeight(), ...lbs) + 3;
    const bot = goal - 5;
    const X = d => 34 + Math.max(0, Math.min(1, (new Date(d + 'T00:00:00').getTime() - start) / span)) * 326;
    const Y = lb => 14 + (top - lb) / (top - bot) * 152;
    const points = entries.map(e => ({ x: Math.round(X(e.date) * 10) / 10, y: Math.round(Y(e.lb) * 10) / 10 }));
    const linePath = points.length ? 'M' + points.map(p => p.x + ' ' + p.y).join(' L') : '';
    const areaPath = points.length > 1 ? linePath + ' L' + points[points.length - 1].x + ' 166 L' + points[0].x + ' 166 Z' : '';
    const gridLines = [];
    for (let lb = Math.floor(top / 10) * 10; lb > bot; lb -= 10) {
      const y = Math.round(Y(lb) * 10) / 10;
      gridLines.push({ y, labelY: y + 3, label: String(lb) });
    }
    const goalY = Math.round(Y(goal) * 10) / 10;
    return { points, linePath, areaPath, gridLines, goalY, goalLabelY: goalY - 6 };
  }

  renderVals() {
    const s = this.state;
    const nowWeek = this.currentWeek();
    const selWeek = s.weekSel ?? nowWeek;
    const today = this.today();
    const todayKey = this.keyOf(today);
    const dow = today.getDay();
    const goal = this.goalWeight(), startW = this.startWeight(), calTarget = this.calTarget();

    // ridge
    const pts = this.ridge();
    const s1 = this.segPaths(pts, 0, 9), s2 = this.segPaths(pts, 9, 18), s3 = this.segPaths(pts, 18, 26);
    const nowPt = pts[nowWeek - 1];
    const ridgePoints = pts.map(p => ({
      x: p.x, y: p.y,
      r: p.week === nowWeek ? 4 : 3,
      fill: p.week === nowWeek ? '#E3B341' : this.phaseOf(p.week).color,
      onClick: () => this.setState({ tab: 'week', weekSel: p.week, expandedDay: null })
    }));

    // stats
    const sorted = [...s.weights].sort((a, b) => a.date < b.date ? -1 : 1);
    const cur = sorted.length ? sorted[sorted.length - 1].lb : startW;
    const lost = Math.round((startW - cur) * 10) / 10;

    // today
    const tw = this.workoutFor(nowWeek, dow);
    const phase = this.phaseOf(nowWeek);
    const done = !!s.completions[todayKey];
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    // week tab
    const selPhase = this.phaseOf(selWeek);
    const weekDays = [];
    for (let d = 0; d < 7; d++) {
      const date = this.dateOf(selWeek, d);
      const key = this.keyOf(date);
      const w = this.workoutFor(selWeek, d);
      const dDone = !!s.completions[key];
      const expanded = s.expandedDay === d;
      weekDays.push({
        abbr: dayNames[d], dateStr: this.fmtShort(date), title: w.title,
        color: w.type === 'strength' ? selPhase.color : w.type === 'cardio' ? '#4A5866' : '#E3B341',
        exercises: w.exercises,
        doneMark: dDone ? '\u2713' : '\u00b7',
        doneColor: dDone ? '#5B8C5A' : '#4A5866',
        chev: expanded ? '\u25be' : '\u25b8',
        expanded,
        onToggle: () => this.setState({ expandedDay: expanded ? null : d })
      });
    }
    const selStart = this.dateOf(selWeek, 0), selEnd = this.dateOf(selWeek, 6);

    // fuel
    const calRows = [];
    let sum = 0, n = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = this.keyOf(d);
      const v = s.calories[key];
      if (v != null) { sum += v; n++; }
      const delta = v != null ? v - calTarget : null;
      calRows.push({
        date: (i === 0 ? 'TODAY' : dayNames[d.getDay()]) + ' ' + this.fmtShort(d),
        kcal: v != null ? v.toLocaleString('en-US') : '\u2014',
        delta: delta == null ? '' : (delta > 0 ? '+' : '') + delta.toLocaleString('en-US'),
        deltaColor: delta == null ? '#4A5866' : delta > 0 ? '#C1652E' : '#5B8C5A'
      });
    }
    const avg = n ? Math.round(sum / n) : null;

    // weight tab
    const wtRows = [...sorted].reverse().slice(0, 10).map((e, i, arr) => {
      const prev = arr[i + 1];
      const delta = prev ? Math.round((e.lb - prev.lb) * 10) / 10 : null;
      const d = new Date(e.date + 'T00:00:00');
      return {
        date: dayNames[d.getDay()] + ' ' + this.fmtShort(d),
        lb: e.lb.toFixed(1),
        delta: delta == null ? '' : (delta > 0 ? '+' : '') + delta.toFixed(1),
        deltaColor: delta == null ? '#4A5866' : delta > 0 ? '#C1652E' : '#5B8C5A'
      };
    });

    // trails
    const satDate = this.nextSaturday();
    const satKey = this.keyOf(satDate);
    const satWeek = Math.max(1, Math.min(26, Math.floor((satDate - this.startDate()) / 604800000) + 1));
    const satPhaseIdx = this.phaseOf(satWeek).idx;
    const satPack = [45, 55, 65][satPhaseIdx];
    const satHrs = ['2\u20133 H', '3\u20135 H', '5\u20137 H'][satPhaseIdx];
    const satGainFt = ['1,500', '2,500', '3,500'][satPhaseIdx];
    const allTrails = this.trails();
    const tgt = this.targetGain(satWeek);
    const suggestedTrail = allTrails.reduce((best, t) => Math.abs(t.gain - tgt) < Math.abs(best.gain - tgt) ? t : best, allTrails[0]);
    const mkCard = t => {
      const r = this.trailRoute(t.seed, 92, 68);
      return {
        name: t.name, diff: t.diff.toUpperCase(), diffColor: this.diffColor(t.diff),
        statLine: t.dist.toFixed(1) + ' MI \u00b7 ' + t.gain.toLocaleString('en-US') + ' FT \u00b7 ~' + t.time + ' \u00b7 ' + t.drive + ' MIN DRIVE',
        contours: this.topo(t.seed, 92, 68, 5),
        trailPath: r.d,
        onOpen: () => this.setState({ trailSel: t.id })
      };
    };
    const F = s.trailFilters;
    const passes = t =>
      (F.dist === 'any' || (F.dist === 'short' ? t.dist < 4 : t.dist >= 4)) &&
      (F.gain === 'any' || (F.gain === 'low' ? t.gain < 1000 : t.gain >= 1000)) &&
      (F.drive === 'any' || (F.drive === 'near' ? t.drive <= 30 : t.drive > 30));
    const trailCards = allTrails.filter(passes).map(mkCard);
    const chip = (k, v, label) => {
      const act = F[k] === v;
      return { label, bg: act ? '#C1652E' : 'transparent', border: act ? '#C1652E' : '#33465A', color: act ? '#10161C' : '#7A8794',
        onClick: () => this.setState({ trailFilters: { ...F, [k]: v } }) };
    };
    const chipRows = [
      { label: 'DIST', chips: [chip('dist', 'any', 'ANY'), chip('dist', 'short', '< 4 MI'), chip('dist', 'long', '4+ MI')] },
      { label: 'GAIN', chips: [chip('gain', 'any', 'ANY'), chip('gain', 'low', '< 1,000 FT'), chip('gain', 'high', '1,000+ FT')] },
      { label: 'DRIVE', chips: [chip('drive', 'any', 'ANY'), chip('drive', 'near', '\u2264 30 MIN'), chip('drive', 'far', '30+ MIN')] }
    ];
    const selTrail = allTrails.find(t => t.id === s.trailSel) || null;
    let td = null;
    if (selTrail) {
      const r = this.trailRoute(selTrail.seed, 358, 210);
      const prof = this.trailProfile(selTrail.seed, 358, 130);
      td = {
        name: selTrail.name, diff: selTrail.diff.toUpperCase(), diffColor: this.diffColor(selTrail.diff),
        dist: selTrail.dist.toFixed(1), gain: selTrail.gain.toLocaleString('en-US'), time: selTrail.time, drive: selTrail.drive,
        gainLabel: selTrail.gain.toLocaleString('en-US') + ' FT',
        contours: this.topo(selTrail.seed, 358, 210, 8),
        routeD: r.d, sx: r.sx, sy: r.sy, ex: r.ex, ey: r.ey,
        slx: r.sx + 9, sly: r.sy + 4, elx: r.ex + 9, ely: r.ey - 6,
        profileLine: prof.line, profileArea: prof.area,
        trailhead: selTrail.trailhead, notes: selTrail.notes
      };
    }
    const satDone = !!s.completions[satKey];

    // ---- summit log ----
    const campDefs = this.CAMP_DEFS();
    const allBadges = this.computeBadges();
    const fmtWhen = id => {
      const k = s.badges[id];
      if (!k) return '';
      const d = new Date(k + 'T00:00:00');
      return this.fmtShort(d) + ' ' + d.getFullYear();
    };
    const earnedRing = '#C1652E', earnedIcon = '#E3B341', lockGray = '#3A4653';
    const camps = campDefs.map((cd, ci) => {
      const list = allBadges.filter(b => b.camp === ci);
      const earnedN = list.filter(b => b.earned).length;
      const full = earnedN === list.length;
      const badges = list.map(b => {
        let sub;
        if (b.earned) sub = fmtWhen(b.id) || 'EARNED';
        else if (b.goal > 1) sub = b.cur + '/' + b.goal;
        else sub = 'LOCKED';
        return {
          title: b.title, iconPaths: b.iconPaths,
          ring: b.earned ? earnedRing : lockGray,
          icon: b.earned ? earnedIcon : lockGray,
          medalBg: b.earned ? '#141C25' : 'transparent',
          titleColor: b.earned ? '#E8E4DC' : '#5A6672',
          subColor: b.earned ? '#E3B341' : '#4A5866',
          sub, starMark: b.earned ? [1] : []
        };
      });
      return {
        name: cd.name, alt: cd.alt,
        badges,
        count: earnedN + '/' + list.length,
        countColor: full ? '#5B8C5A' : earnedN > 0 ? '#E3B341' : '#4A5866',
        dotFill: full ? '#E3B341' : earnedN > 0 ? '#C1652E' : '#10161C',
        dotStroke: earnedN > 0 ? '#E3B341' : '#3A4653',
        nameColor: earnedN > 0 ? '#E8E4DC' : '#7A8794',
        earnedN, total: list.length
      };
    });
    const totalEarned = allBadges.filter(b => b.earned).length;
    // ascent diagram nodes (summit top → trailhead bottom)
    const nodeX = [70, 150, 110, 200, 165, 250];
    const ascNodes = campDefs.map((cd, ci) => {
      const y = 300 - ci * 52;
      const x = nodeX[ci];
      const c = camps[ci];
      const reached = c.earnedN > 0;
      const full = c.earnedN === c.total;
      const leftLabel = x > 180;
      return {
        x, y, r: reached ? 6 : 4,
        fill: full ? '#E3B341' : reached ? '#C1652E' : '#10161C',
        stroke: reached ? '#E3B341' : '#3A4653',
        lx1: leftLabel ? x - 46 : x + 12, lx2: leftLabel ? x - 12 : x + 46,
        tx: leftLabel ? x - 50 : x + 50, anchor: leftLabel ? 'end' : 'start',
        ty: y - 1, ty2: y + 10,
        name: cd.name, altCount: cd.alt + ' FT \u00b7 ' + c.count,
        labelColor: reached ? '#E8E4DC' : '#5A6672'
      };
    });
    const ridge = 'M' + ascNodes.map(n => n.x + ' ' + n.y).join(' L');
    const silhouette = 'M0 300 L70 300 L' + ascNodes.slice().reverse().map(n => n.x + ' ' + n.y).join(' L') + ' L250 300 L358 300 L358 340 L0 340 Z';
    const highestReached = camps.reduce((acc, c, i) => c.earnedN > 0 ? i : acc, 0);
    const anyReached = camps.some(c => c.earnedN > 0);
    const hereNode = ascNodes[highestReached];
    const hereMarker = anyReached ? [{ x: hereNode.x, y: hereNode.y }] : [];
    const currentCampName = anyReached ? campDefs[highestReached].name : 'TRAILHEAD';

    // next milestone teaser
    const locked = allBadges.filter(b => !b.earned);
    const nextBadge = locked.slice().sort((a, b) => (b.cur / b.goal) - (a.cur / a.goal))[0] || allBadges[0];
    const nextRatio = Math.min(1, nextBadge.cur / nextBadge.goal);
    const nextCampName = campDefs[nextBadge.camp].name;
    const nextMs = {
      title: nextBadge.title, iconPaths: nextBadge.iconPaths,
      ring: nextRatio > 0 ? '#C1652E' : '#3A4653',
      icon: nextRatio > 0 ? '#E3B341' : '#3A4653',
      pct: Math.round(nextRatio * 100) + '%',
      progText: nextBadge.goal > 1 ? (nextBadge.cur + ' / ' + nextBadge.goal) : nextCampName
    };

    // celebration
    const celebBadge = s.celebrate ? allBadges.find(b => b.id === s.celebrate) : null;

    const tab = s.tab;
    const on = '#E8E4DC', off = '#4A5866';
    const barOn = '#C1652E', barOff = 'transparent';

    return {
      headerMeta: 'WK ' + String(nowWeek).padStart(2, '0') + '/26 \u00b7 ' + phase.name,
      badgeCountLine: totalEarned + '/' + allBadges.length,
      openSummit: () => this.setState({ summitBack: s.tab === 'summit' ? 'today' : s.tab, tab: 'summit' }),
      closeSummit: () => this.setState({ tab: s.summitBack || 'today' }),
      showSummit: tab === 'summit',
      camps,
      currentCampName,
      ascent: { silhouette, ridge, nodes: ascNodes, hereMarker },
      nextMs,
      showCelebrate: !!celebBadge,
      celeb: celebBadge ? { title: celebBadge.title, iconPaths: celebBadge.iconPaths, campName: campDefs[celebBadge.camp].name } : { title: '', iconPaths: [], campName: '' },
      dismissCelebrate: () => this.setState({ celebrate: null }),
      ridgeLine1: s1.line, ridgeFill1: s1.fill,
      ridgeLine2: s2.line, ridgeFill2: s2.fill,
      ridgeLine3: s3.line, ridgeFill3: s3.fill,
      ridgePoints,
      nowX: nowPt.x, nowY: nowPt.y, nowLabelY: nowPt.y - 14,
      startW: startW.toFixed(0), currentW: cur.toFixed(1), goalW: goal.toFixed(0), lostW: (lost > 0 ? '-' : '') + Math.abs(lost).toFixed(1),

      showToday: tab === 'today', showWeek: tab === 'week', showFuel: tab === 'fuel', showTrails: tab === 'trails',
      goToday: () => this.setState({ tab: 'today' }),
      goWeek: () => this.setState({ tab: 'week' }),
      goFuel: () => this.setState({ tab: 'fuel' }),
      goTrails: () => this.setState({ tab: 'trails' }),
      tabColor: { today: tab === 'today' ? on : off, week: tab === 'week' ? on : off, fuel: tab === 'fuel' ? on : off, trails: tab === 'trails' ? on : off },
      tabBar: { today: tab === 'today' ? barOn : barOff, week: tab === 'week' ? barOn : barOff, fuel: tab === 'fuel' ? barOn : barOff, trails: tab === 'trails' ? barOn : barOff },

      todayDateLine: dayNames[dow] + ' \u00b7 ' + this.fmtShort(today) + ' \u00b7 WK ' + String(nowWeek).padStart(2, '0') + '/26',
      todayTitle: tw.title,
      todayPhaseColor: phase.color,
      todayPhaseName: phase.name,
      todayDeload: this.isDeload(nowWeek),
      todayExercises: tw.exercises,
      toggleTodayDone: () => this.setP({ completions: { ...s.completions, [todayKey]: !done } }),
      todayDoneBorder: done ? '#5B8C5A' : '#4A5866',
      todayDoneBg: done ? '#5B8C5A' : 'transparent',
      todayDoneCheck: done ? '#10161C' : '#4A5866',
      todayDoneLabel: done ? 'COMPLETE' : 'MARK COMPLETE',
      todayDoneLabelColor: done ? '#5B8C5A' : '#7A8794',

      selWeekPad: String(selWeek).padStart(2, '0'),
      selPhaseColor: selPhase.color,
      selPhaseName: selPhase.name,
      selDeload: this.isDeload(selWeek),
      selRange: this.fmtShort(selStart) + '\u2013' + this.fmtShort(selEnd),
      prevWeek: () => this.setState({ weekSel: Math.max(1, selWeek - 1), expandedDay: null }),
      nextWeek: () => this.setState({ weekSel: Math.min(26, selWeek + 1), expandedDay: null }),
      weekDays,

      calTargetFmt: calTarget.toLocaleString('en-US'),
      deficitFmt: '-' + (3100 - calTarget).toLocaleString('en-US'),
      calInput: s.calInput,
      onCalChange: e => this.setState({ calInput: e.target.value }),
      logCalories: () => {
        const v = parseInt(s.calInput, 10);
        if (!v || v < 200 || v > 12000) return;
        this.setP({ calories: { ...s.calories, [todayKey]: v }, calInput: '' });
      },
      calAvg: avg != null ? avg.toLocaleString('en-US') + ' kcal' : '\u2014',
      avgColor: avg == null ? '#4A5866' : avg <= calTarget ? '#5B8C5A' : '#C1652E',
      calRows,
      sampleMeals: [
        { slot: 'BREAKFAST', food: '4 eggs + 4 whites, oats w/ berries, black coffee', kcal: '620' },
        { slot: 'LUNCH', food: '8 oz chicken, 1.5 cup rice, mixed greens + olive oil', kcal: '650' },
        { slot: 'PRE-TRAINING', food: 'Banana + whey isolate shake', kcal: '280' },
        { slot: 'DINNER', food: '8 oz lean beef, baked potato, roasted vegetables', kcal: '600' },
        { slot: 'EVENING', food: 'Greek yogurt + almonds', kcal: '200' }
      ],

      wtInput: s.wtInput,
      onWtChange: e => this.setState({ wtInput: e.target.value }),
      logWeight: () => {
        const v = parseFloat(s.wtInput);
        if (!v || v < 80 || v > 500) return;
        const rest = s.weights.filter(w => w.date !== todayKey);
        this.setP({ weights: [...rest, { date: todayKey, lb: Math.round(v * 10) / 10 }], wtInput: '' });
      },
      satDateLine: 'SAT \u00b7 ' + this.fmtShort(satDate),
      satPrescription: satPack + ' LB RUCK \u00b7 ' + satHrs + ' \u00b7 ' + satGainFt + ' FT GAIN',
      suggested: mkCard(suggestedTrail),
      chipRows,
      trailCards,
      noTrails: trailCards.length === 0,
      trailDetailOpen: !!td,
      trailListOpen: !td,
      td,
      closeTrail: () => this.setState({ trailSel: null }),
      logHike: () => { if (selTrail) this.setP({ completions: { ...s.completions, [satKey]: true }, hikes: { ...s.hikes, [satKey]: selTrail.id } }); },
      logLabel: satDone ? '\u2713 LOGGED \u2014 SATURDAY COMPLETE' : 'LOG THIS HIKE',
      logBg: satDone ? '#5B8C5A' : '#C1652E',
      logBorder: satDone ? '#5B8C5A' : '#C1652E',
      logColor: '#10161C',

      wc: this.weightChart(),
      wtRows
    };
  }
}

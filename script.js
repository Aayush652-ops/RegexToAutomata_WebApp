(() => {
  const svg = document.getElementById('graphSvg');
  const regexInput = document.getElementById('regexInput');
  const stringInput = document.getElementById('stringInput');
  const buildBtn = document.getElementById('buildBtn');
  const nextBtn = document.getElementById('nextBtn');
  const playBtn = document.getElementById('playBtn');
  const resetBtn = document.getElementById('resetBtn');
  const convertBtn = document.getElementById('convertBtn');
  const simulateNfaBtn = document.getElementById('simulateNfaBtn');
  const simulateDfaBtn = document.getElementById('simulateDfaBtn');
  const stepDescription = document.getElementById('stepDescription');
  const concatView = document.getElementById('concatView');
  const postfixView = document.getElementById('postfixView');
  const resultView = document.getElementById('resultView');
  const machineView = document.getElementById('machineView');

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const VIEW_W = 1200;
  const VIEW_H = 700;
  const RADIUS = 28;
  const START_COLOR = '#1f9d55';
  const ACCEPT_COLOR = '#dc3545';
  const NORMAL_COLOR = '#0d6efd';
  const HIGHLIGHT_COLOR = '#ffb020';
  const EDGE_COLOR = '#364152';

  let stateCounter = 0;
  let edgeCounter = 0;
  let steps = [];
  let currentStepIndex = 0;
  let builtNfa = null;
  let builtDfa = null;
  let currentMachine = 'NFA';
  let playTimer = null;

  function resetIds() {
    stateCounter = 0;
    edgeCounter = 0;
  }

  function newStateId(prefix = 'q') {
    return `${prefix}${stateCounter++}`;
  }

  function newEdgeId(prefix = 'e') {
    return `${prefix}${edgeCounter++}`;
  }

  function isOperand(ch) {
    return /^[a-zA-Z0-9]$/.test(ch) || ch === 'ε';
  }

  function showResult(text, cls = 'result-info') {
    resultView.textContent = text;
    resultView.className = cls;
  }

  function cloneTransitions(transitions) {
    const out = {};
    for (const state in transitions) {
      out[state] = transitions[state].map(edge => ({ ...edge }));
    }
    return out;
  }
  window.loadExample = function (regex) {
  document.getElementById("regexInput").value = regex;
  document.getElementById("buildBtn").click();
};   
  function createSymbolNFA(symbol) {
    const start = newStateId('q');
    const accept = newStateId('q');
    const transitions = {
      [start]: [{ id: newEdgeId('e'), symbol, to: accept }],
      [accept]: []
    };   
    return {
      type: 'NFA',
      start,
      accept,
      states: new Set([start, accept]),
      transitions
    };
  }

  function mergeTransitions(a, b) {
    const out = cloneTransitions(a);
    for (const state in b) {
      out[state] = (out[state] || []).concat(b[state].map(edge => ({ ...edge })));
    }
    return out;
  }

  function concatNFA(a, b) {
    const transitions = mergeTransitions(a.transitions, b.transitions);
    transitions[a.accept] = transitions[a.accept] || [];
    const edgeId = newEdgeId('e');
    transitions[a.accept].push({ id: edgeId, symbol: 'ε', to: b.start });
    return {
      type: 'NFA',
      start: a.start,
      accept: b.accept,
      states: new Set([...a.states, ...b.states]),
      transitions,
      __highlightStates: [],
      __highlightEdges: [edgeId]
    };
  }

  function unionNFA(a, b) {
    const start = newStateId('q');
    const accept = newStateId('q');
    const transitions = mergeTransitions(a.transitions, b.transitions);
    const e1 = newEdgeId('e');
    const e2 = newEdgeId('e');
    const e3 = newEdgeId('e');
    const e4 = newEdgeId('e');
    transitions[start] = [
      { id: e1, symbol: 'ε', to: a.start },
      { id: e2, symbol: 'ε', to: b.start }
    ];
    transitions[a.accept] = transitions[a.accept] || [];
    transitions[b.accept] = transitions[b.accept] || [];
    transitions[a.accept].push({ id: e3, symbol: 'ε', to: accept });
    transitions[b.accept].push({ id: e4, symbol: 'ε', to: accept });
    transitions[accept] = transitions[accept] || [];
    return {
      type: 'NFA',
      start,
      accept,
      states: new Set([...a.states, ...b.states, start, accept]),
      transitions,
      __highlightStates: [start, accept],
      __highlightEdges: [e1, e2, e3, e4]
    };
  }

  function starNFA(a) {
    const start = newStateId('q');
    const accept = newStateId('q');
    const transitions = cloneTransitions(a.transitions);
    const e1 = newEdgeId('e');
    const e2 = newEdgeId('e');
    const e3 = newEdgeId('e');
    const e4 = newEdgeId('e');
    transitions[start] = [
      { id: e1, symbol: 'ε', to: a.start },
      { id: e2, symbol: 'ε', to: accept }
    ];
    transitions[a.accept] = transitions[a.accept] || [];
    transitions[a.accept].push({ id: e3, symbol: 'ε', to: a.start });
    transitions[a.accept].push({ id: e4, symbol: 'ε', to: accept });
    transitions[accept] = transitions[accept] || [];
    return {
      type: 'NFA',
      start,
      accept,
      states: new Set([...a.states, start, accept]),
      transitions,
      __highlightStates: [start, accept],
      __highlightEdges: [e1, e2, e3, e4]
    };
  }

  function plusNFA(a) {
    const start = newStateId('q');
    const accept = newStateId('q');
    const transitions = cloneTransitions(a.transitions);
    const e1 = newEdgeId('e');
    const e2 = newEdgeId('e');
    const e3 = newEdgeId('e');
    transitions[start] = [{ id: e1, symbol: 'ε', to: a.start }];
    transitions[a.accept] = transitions[a.accept] || [];
    transitions[a.accept].push({ id: e2, symbol: 'ε', to: a.start });
    transitions[a.accept].push({ id: e3, symbol: 'ε', to: accept });
    transitions[accept] = transitions[accept] || [];
    return {
      type: 'NFA',
      start,
      accept,
      states: new Set([...a.states, start, accept]),
      transitions,
      __highlightStates: [start, accept],
      __highlightEdges: [e1, e2, e3]
    };
  }

  function optionalNFA(a) {
    const start = newStateId('q');
    const accept = newStateId('q');
    const transitions = cloneTransitions(a.transitions);
    const e1 = newEdgeId('e');
    const e2 = newEdgeId('e');
    const e3 = newEdgeId('e');
    transitions[start] = [
      { id: e1, symbol: 'ε', to: a.start },
      { id: e2, symbol: 'ε', to: accept }
    ];
    transitions[a.accept] = transitions[a.accept] || [];
    transitions[a.accept].push({ id: e3, symbol: 'ε', to: accept });
    transitions[accept] = transitions[accept] || [];
    return {
      type: 'NFA',
      start,
      accept,
      states: new Set([...a.states, start, accept]),
      transitions,
      __highlightStates: [start, accept],
      __highlightEdges: [e1, e2, e3]
    };
  }

  function insertConcatOperators(regex) {
    let result = '';
    const cleaned = regex.replace(/\s+/g, '');
    for (let i = 0; i < cleaned.length; i++) {
      const c1 = cleaned[i];
      result += c1;
      if (i < cleaned.length - 1) {
        const c2 = cleaned[i + 1];
        if ((isOperand(c1) || c1 === ')' || c1 === '*' || c1 === '+' || c1 === '?') && (isOperand(c2) || c2 === '(')) {
          result += '.';
        }
      }
    }
    return result;
  }

  function regexToPostfix(regex) {
    const output = [];
    const stack = [];
    const precedence = { '|': 1, '.': 2, '?': 3, '+': 3, '*': 3 };
    const rightAssoc = { '*': true, '+': true, '?': true };

    for (let i = 0; i < regex.length; i++) {
      const token = regex[i];
      if (isOperand(token)) {
        output.push(token);
      } else if (token === '(') {
        stack.push(token);
      } else if (token === ')') {
        while (stack.length && stack[stack.length - 1] !== '(') output.push(stack.pop());
        if (!stack.length) throw new Error('Mismatched parentheses');
        stack.pop();
      } else if (token in precedence) {
        while (stack.length) {
          const top = stack[stack.length - 1];
          if (!(top in precedence)) break;
          if ((rightAssoc[token] && precedence[top] > precedence[token]) || (!rightAssoc[token] && precedence[top] >= precedence[token])) {
            output.push(stack.pop());
          } else {
            break;
          }
        }
        stack.push(token);
      } else {
        throw new Error(`Unsupported character: ${token}`);
      }
    }

    while (stack.length) {
      const top = stack.pop();
      if (top === '(' || top === ')') throw new Error('Mismatched parentheses');
      output.push(top);
    }
    return output.join('');
  }

  function buildStepsFromPostfix(postfix) {
    const stack = [];
    const builtSteps = [];

    for (const ch of postfix) {
      if (isOperand(ch)) {
        const nfa = createSymbolNFA(ch);
        nfa.__highlightStates = [nfa.start, nfa.accept];
        nfa.__highlightEdges = [nfa.transitions[nfa.start][0].id];
        stack.push(nfa);
        builtSteps.push({
          description: `Create NFA for '${ch}'`,
          machine: cloneMachine(nfa),
          machineType: 'NFA'
        });
      } else if (ch === '.') {
        const b = stack.pop();
        const a = stack.pop();
        if (!a || !b) throw new Error('Invalid regex: not enough operands for concatenation');
        const nfa = concatNFA(a, b);
        stack.push(nfa);
        builtSteps.push({
          description: `Concatenate two NFAs`,
          machine: cloneMachine(nfa),
          machineType: 'NFA'
        });
      } else if (ch === '|') {
        const b = stack.pop();
        const a = stack.pop();
        if (!a || !b) throw new Error('Invalid regex: not enough operands for union');
        const nfa = unionNFA(a, b);
        stack.push(nfa);
        builtSteps.push({
          description: `Apply union '|'`,
          machine: cloneMachine(nfa),
          machineType: 'NFA'
        });
      } else if (ch === '*') {
        const a = stack.pop();
        if (!a) throw new Error('Invalid regex: missing operand for *');
        const nfa = starNFA(a);
        stack.push(nfa);
        builtSteps.push({
          description: `Apply Kleene star '*'`,
          machine: cloneMachine(nfa),
          machineType: 'NFA'
        });
      } else if (ch === '+') {
        const a = stack.pop();
        if (!a) throw new Error('Invalid regex: missing operand for +');
        const nfa = plusNFA(a);
        stack.push(nfa);
        builtSteps.push({
          description: `Apply one-or-more '+'`,
          machine: cloneMachine(nfa),
          machineType: 'NFA'
        });
      } else if (ch === '?') {
        const a = stack.pop();
        if (!a) throw new Error('Invalid regex: missing operand for ?');
        const nfa = optionalNFA(a);
        stack.push(nfa);
        builtSteps.push({
          description: `Apply optional '?'`,
          machine: cloneMachine(nfa),
          machineType: 'NFA'
        });
      }
    }

    if (stack.length !== 1) throw new Error('Invalid regex: build did not end with exactly one NFA');
    return { steps: builtSteps, finalNFA: stack[0] };
  }

  function cloneMachine(machine) {
    return {
      type: machine.type,
      start: machine.start,
      accept: Array.isArray(machine.accept) ? [...machine.accept] : machine.accept,
      states: new Set([...machine.states]),
      transitions: cloneTransitions(machine.transitions),
      __highlightStates: machine.__highlightStates ? [...machine.__highlightStates] : [],
      __highlightEdges: machine.__highlightEdges ? [...machine.__highlightEdges] : [],
      __sourceSets: machine.__sourceSets ? { ...machine.__sourceSets } : {}
    };
  }

  function epsilonClosure(nfa, states) {
    const closure = new Set(states);
    const stack = [...states];
    while (stack.length) {
      const state = stack.pop();
      for (const edge of (nfa.transitions[state] || [])) {
        if (edge.symbol === 'ε' && !closure.has(edge.to)) {
          closure.add(edge.to);
          stack.push(edge.to);
        }
      }
    }
    return closure;
  }

  function move(nfa, states, symbol) {
    const res = new Set();
    for (const state of states) {
      for (const edge of (nfa.transitions[state] || [])) {
        if (edge.symbol === symbol) res.add(edge.to);
      }
    }
    return res;
  }

  function nfaAlphabet(nfa) {
    const set = new Set();
    for (const state in nfa.transitions) {
      for (const edge of nfa.transitions[state]) {
        if (edge.symbol !== 'ε') set.add(edge.symbol);
      }
    }
    return [...set].sort();
  }

  function setKey(set) {
    return [...set].sort().join(',') || '∅';
  }

  function convertNfaToDfa(nfa) {
    const alphabet = nfaAlphabet(nfa);
    const startClosure = epsilonClosure(nfa, new Set([nfa.start]));
    const queue = [startClosure];
    const seen = new Map();
    const sourceSets = {};
    const transitions = {};
    const states = new Set();
    const accepts = [];
    let dfaIndex = 0;

    function ensureState(set) {
      const key = setKey(set);
      if (!seen.has(key)) {
        const id = `D${dfaIndex++}`;
        seen.set(key, id);
        states.add(id);
        sourceSets[id] = key;
        transitions[id] = [];
        if (set.has(nfa.accept)) accepts.push(id);
      }
      return seen.get(key);
    }

    const startId = ensureState(startClosure);

    for (let i = 0; i < queue.length; i++) {
      const currentSet = queue[i];
      const currentId = ensureState(currentSet);

      for (const symbol of alphabet) {
        const moved = move(nfa, currentSet, symbol);
        const closure = epsilonClosure(nfa, moved);
        const key = setKey(closure);
        if (!seen.has(key)) queue.push(closure);
        const targetId = ensureState(closure);
        transitions[currentId].push({ id: newEdgeId('de'), symbol, to: targetId });
      }
    }

    return {
      type: 'DFA',
      start: startId,
      accept: accepts,
      states,
      transitions,
      __sourceSets: sourceSets,
      __highlightStates: [],
      __highlightEdges: []
    };
  }

  function simulateNFA(nfa, input) {
    let current = epsilonClosure(nfa, new Set([nfa.start]));
    for (const ch of input) {
      current = epsilonClosure(nfa, move(nfa, current, ch));
      if (!current.size) return false;
    }
    return current.has(nfa.accept);
  }

  function simulateDFA(dfa, input) {
    let current = dfa.start;
    for (const ch of input) {
      const next = (dfa.transitions[current] || []).find(edge => edge.symbol === ch);
      if (!next) return false;
      current = next.to;
    }
    return dfa.accept.includes(current);
  }

  function clearSvg() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  }

  function createSvg(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }

  function computeLevels(machine) {
    const dist = {};
    const queue = [machine.start];
    dist[machine.start] = 0;

    while (queue.length) {
      const state = queue.shift();
      const cur = dist[state];
      for (const edge of (machine.transitions[state] || [])) {
        if (dist[edge.to] == null) {
          dist[edge.to] = cur + 1;
          queue.push(edge.to);
        }
      }
    }

    let fallbackLevel = 0;
    for (const state of machine.states) {
      if (dist[state] == null) dist[state] = ++fallbackLevel;
    }
    return dist;
  }

  function computePositions(machine) {
    const levels = computeLevels(machine);
    const groups = new Map();
    for (const state of machine.states) {
      const level = levels[state] || 0;
      if (!groups.has(level)) groups.set(level, []);
      groups.get(level).push(state);
    }

    const sortedLevels = [...groups.keys()].sort((a, b) => a - b);
    const positions = {};
    const leftPad = 100;
    const rightPad = 120;
    const topPad = 90;
    const bottomPad = 80;
    const usableW = VIEW_W - leftPad - rightPad;
    const usableH = VIEW_H - topPad - bottomPad;
    const levelGap = sortedLevels.length === 1 ? 0 : usableW / (sortedLevels.length - 1);

    sortedLevels.forEach((level, i) => {
      const states = groups.get(level).sort();
      const x = leftPad + i * levelGap;
      const gap = states.length === 1 ? 0 : usableH / (states.length - 1);
      states.forEach((state, j) => {
        const y = states.length === 1 ? VIEW_H / 2 : topPad + j * gap;
        positions[state] = { x, y };
      });
    });
    return positions;
  }

  function addDefs() {
    const defs = createSvg('defs');
    const arrow = createSvg('marker', {
      id: 'arrowHead',
      markerWidth: '10',
      markerHeight: '10',
      refX: '8',
      refY: '3',
      orient: 'auto',
      markerUnits: 'strokeWidth'
    });
    arrow.appendChild(createSvg('path', { d: 'M0,0 L0,6 L9,3 z', fill: EDGE_COLOR }));
    defs.appendChild(arrow);
    svg.appendChild(defs);
  }

  function drawMachine(machine) {
    clearSvg();
    svg.setAttribute('viewBox', `0 0 ${VIEW_W} ${VIEW_H}`);
    addDefs();

    const positions = computePositions(machine);
    const highlightStates = new Set(machine.__highlightStates || []);
    const highlightEdges = new Set(machine.__highlightEdges || []);
    const acceptSet = new Set(Array.isArray(machine.accept) ? machine.accept : [machine.accept]);

    const renderedPairs = new Map();

    for (const from in machine.transitions) {
      for (const edge of machine.transitions[from]) {
        const key = `${from}->${edge.to}`;
        const reverseKey = `${edge.to}->${from}`;
        const count = (renderedPairs.get(key) || 0) + 1;
        renderedPairs.set(key, count);
        const reverseExists = (machine.transitions[edge.to] || []).some(e => e.to === from);
        drawEdge(from, edge.to, edge.symbol, positions, highlightEdges.has(edge.id), count, reverseExists, edge.id === '__dummy');
      }
    }

    for (const state of machine.states) {
      drawState(state, positions[state], {
        isStart: state === machine.start,
        isAccept: acceptSet.has(state),
        highlight: highlightStates.has(state),
        subtitle: machine.type === 'DFA' && machine.__sourceSets?.[state] ? machine.__sourceSets[state] : null
      });
    }
  }

  function drawEdge(from, to, label, positions, highlight, occurrence, reverseExists) {
    const p1 = positions[from];
    const p2 = positions[to];
    if (!p1 || !p2) return;

    if (from === to) {
      const path = createSvg('path', {
        d: `M ${p1.x} ${p1.y - RADIUS} C ${p1.x - 45} ${p1.y - 75}, ${p1.x + 45} ${p1.y - 75}, ${p1.x + 18} ${p1.y - RADIUS - 4}`,
        fill: 'none',
        stroke: highlight ? HIGHLIGHT_COLOR : EDGE_COLOR,
        'stroke-width': highlight ? 4 : 2.5,
        'marker-end': 'url(#arrowHead)'
      });
      svg.appendChild(path);
      const text = createSvg('text', { x: p1.x, y: p1.y - 82, class: 'edge-label' });
      text.textContent = label;
      svg.appendChild(text);
      return;
    }

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;

    const startX = p1.x + ux * RADIUS;
    const startY = p1.y + uy * RADIUS;
    const endX = p2.x - ux * RADIUS;
    const endY = p2.y - uy * RADIUS;

    let offset = 0;
    if (reverseExists) offset = 30;
    if (occurrence > 1) offset += occurrence * 12;

    const perpX = -uy;
    const perpY = ux;
    const cx = (startX + endX) / 2 + perpX * offset;
    const cy = (startY + endY) / 2 + perpY * offset;

    const path = createSvg('path', {
      d: `M ${startX} ${startY} Q ${cx} ${cy} ${endX} ${endY}`,
      fill: 'none',
      stroke: highlight ? HIGHLIGHT_COLOR : EDGE_COLOR,
      'stroke-width': highlight ? 4 : 2.5,
      'marker-end': 'url(#arrowHead)'
    });
    svg.appendChild(path);

    const lx = 0.25 * startX + 0.5 * cx + 0.25 * endX;
    const ly = 0.25 * startY + 0.5 * cy + 0.25 * endY - 6;
    const text = createSvg('text', { x: lx, y: ly, class: 'edge-label' });
    text.textContent = label;
    svg.appendChild(text);
  }

  function drawState(id, pos, { isStart, isAccept, highlight, subtitle }) {
    const group = createSvg('g');
    const fill = highlight ? HIGHLIGHT_COLOR : isStart ? START_COLOR : isAccept ? ACCEPT_COLOR : NORMAL_COLOR;

    if (isStart) {
      const startArrow = createSvg('line', {
        x1: pos.x - 60,
        y1: pos.y,
        x2: pos.x - RADIUS - 6,
        y2: pos.y,
        stroke: '#1f2937',
        'stroke-width': 2.5,
        'marker-end': 'url(#arrowHead)'
      });
      group.appendChild(startArrow);
    }

    const outer = createSvg('circle', {
      cx: pos.x,
      cy: pos.y,
      r: RADIUS,
      fill,
      stroke: '#0f172a',
      'stroke-width': 2
    });
    group.appendChild(outer);

    if (isAccept) {
      const inner = createSvg('circle', {
        cx: pos.x,
        cy: pos.y,
        r: RADIUS - 7,
        fill: 'none',
        stroke: 'white',
        'stroke-width': 2.4
      });
      group.appendChild(inner);
    }

    const text = createSvg('text', {
      x: pos.x,
      y: pos.y,
      class: 'state-label'
    });
    text.textContent = id;
    group.appendChild(text);

    if (subtitle) {
      const sub = createSvg('text', {
        x: pos.x,
        y: pos.y + 46,
        'text-anchor': 'middle',
        'font-size': '12',
        fill: '#475467',
        'font-weight': '700'
      });
      sub.textContent = `{${subtitle === '∅' ? '' : subtitle}}`;
      group.appendChild(sub);
    }

    svg.appendChild(group);
  }

  function renderCurrentStep() {
    if (!steps.length) return;
    const step = steps[currentStepIndex];
    stepDescription.textContent = `Step ${currentStepIndex + 1}/${steps.length}: ${step.description}`;
    machineView.textContent = step.machineType === 'DFA' ? 'DFA' : 'ε-NFA';
    currentMachine = step.machineType === 'DFA' ? 'DFA' : 'NFA';
    drawMachine(step.machine);

    const atEnd = currentStepIndex >= steps.length - 1;
    nextBtn.disabled = atEnd;
    playBtn.disabled = atEnd;
    playBtn.textContent = playTimer ? 'Pause' : 'Play';
    convertBtn.disabled = !(atEnd && builtNfa);
    simulateNfaBtn.disabled = !builtNfa;
    simulateDfaBtn.disabled = !builtDfa;
  }

  function stopPlaying() {
    if (playTimer) {
      clearInterval(playTimer);
      playTimer = null;
      playBtn.textContent = 'Play';
    }
  }

  function buildMachine() {
    stopPlaying();
    builtNfa = null;
    builtDfa = null;
    steps = [];
    currentStepIndex = 0;
    showResult('-', 'result-info');

    try {
      resetIds();
      const raw = regexInput.value.trim();
      if (!raw) throw new Error('Regex cannot be empty');
      const concat = insertConcatOperators(raw);
      const postfix = regexToPostfix(concat);
      concatView.textContent = concat;
      postfixView.textContent = postfix;

      const { steps: constructedSteps, finalNFA } = buildStepsFromPostfix(postfix);
      steps = constructedSteps;
      builtNfa = cloneMachine(finalNFA);
      resetBtn.disabled = false;
      nextBtn.disabled = steps.length <= 1;
      playBtn.disabled = steps.length <= 1;
      renderCurrentStep();
    } catch (err) {
      stepDescription.textContent = `Error: ${err.message}`;
      clearSvg();
      resetBtn.disabled = true;
      nextBtn.disabled = true;
      playBtn.disabled = true;
      convertBtn.disabled = true;
      simulateNfaBtn.disabled = true;
      simulateDfaBtn.disabled = true;
      concatView.textContent = '-';
      postfixView.textContent = '-';
      showResult('Build failed', 'result-rejected');
    }
  }

  function nextStep() {
    if (currentStepIndex < steps.length - 1) {
      currentStepIndex++;
      renderCurrentStep();
    }
    if (currentStepIndex >= steps.length - 1) stopPlaying();
  }

  function togglePlay() {
    if (playTimer) {
      stopPlaying();
      return;
    }
    playBtn.textContent = 'Pause';
    playTimer = setInterval(() => {
      if (currentStepIndex < steps.length - 1) nextStep();
      else stopPlaying();
    }, 1000);
  }

  function resetView() {
    stopPlaying();
    if (!steps.length) return;
    currentStepIndex = 0;
    builtDfa = null;
    steps = steps.filter(step => step.machineType === 'NFA');
    renderCurrentStep();
    showResult('Reset to first ε-NFA step', 'result-info');
  }

  function convertToDfa() {
    if (!builtNfa) return;
    builtDfa = convertNfaToDfa(builtNfa);
    builtDfa.__highlightStates = [...builtDfa.states];
    builtDfa.__highlightEdges = Object.values(builtDfa.transitions).flat().map(e => e.id);
    steps.push({
      description: 'Converted final ε-NFA to DFA using subset construction',
      machine: cloneMachine(builtDfa),
      machineType: 'DFA'
    });
    currentStepIndex = steps.length - 1;
    renderCurrentStep();
    showResult('DFA created', 'result-info');
  }

  function runNfaSimulation() {
    if (!builtNfa) return;
    const accepted = simulateNFA(builtNfa, stringInput.value);
    showResult(accepted ? 'Accepted by ε-NFA' : 'Rejected by ε-NFA', accepted ? 'result-accepted' : 'result-rejected');
  }

  function runDfaSimulation() {
    if (!builtDfa) return;
    const accepted = simulateDFA(builtDfa, stringInput.value);
    showResult(accepted ? 'Accepted by DFA' : 'Rejected by DFA', accepted ? 'result-accepted' : 'result-rejected');
  }

  buildBtn.addEventListener('click', buildMachine);
  nextBtn.addEventListener('click', nextStep);
  playBtn.addEventListener('click', togglePlay);
  resetBtn.addEventListener('click', resetView);
  convertBtn.addEventListener('click', convertToDfa);
  simulateNfaBtn.addEventListener('click', runNfaSimulation);
  simulateDfaBtn.addEventListener('click', runDfaSimulation);

  // Initial blank canvas message.
  function drawPlaceholder() {
    clearSvg();
    const text = createSvg('text', {
      x: VIEW_W / 2,
      y: VIEW_H / 2,
      'text-anchor': 'middle',
      'font-size': '26',
      fill: '#6b7280',
      'font-weight': '700'
    });
    text.textContent = 'Build a regex to see the automaton here';
    svg.appendChild(text);
  }

  drawPlaceholder();
})();

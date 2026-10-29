/* ==========================================================================
   O Tribunal da Pátria — utilitários partilhados por todas as páginas:
   navegação, formatação e animações (contagem de números, placar, brilho
   de vitórias recentes).
   ========================================================================== */

const SITE_PAGES = [
  {href: "index.html",         label: "Hoje"},
  {href: "como-funciona.html",  label: "Como Funciona"},
  {href: "especialistas.html",  label: "Os Especialistas"},
  {href: "tribunal.html",       label: "O Tribunal"},
  {href: "historico.html",      label: "Histórico"},
  {href: "construtor.html",     label: "Construtor de Múltiplas"},
  {href: "indices.html",        label: "Índices Sintéticos"},
  {href: "especiais.html",      label: "Apostas Especiais"},
  {href: "ranking.html",        label: "Ranking dos Jurados"},
  {href: "metodologia.html",    label: "Metodologia"},
  {href: "glossario.html",      label: "Glossário"},
];

// Mesmas páginas, mesma ordem, MENOS "Apostas Especiais" — essa secção é só
// para ligas/taças de futebol fora da cobertura normal das APIs gratuitas
// (ver apostas_especiais no schema), não existe equivalente de NBA. As
// páginas da NBA vivem na pasta nba/ e usam os mesmos nomes de ficheiro das
// restantes, só com conteúdo diferente.
const SITE_PAGES_NBA = SITE_PAGES.filter(p => p.href !== "especiais.html");

function renderNav(activeHref, pages){
  const navEl = document.getElementById('sitenav');
  if(!navEl) return;
  // Nenhuma página da NBA passa "pages" explicitamente — por isso o default
  // tem de detetar sozinho se estamos na secção NBA (pasta nba/) e usar
  // SITE_PAGES_NBA (sem "Apostas Especiais", que não tem equivalente de NBA
  // e apontaria para uma página inexistente, nba/especiais.html).
  if(!pages){
    pages = location.pathname.includes('/nba/') ? SITE_PAGES_NBA : SITE_PAGES;
  }
  navEl.innerHTML = pages.map(p =>
    `<a href="${p.href}" class="${p.href===activeHref ? 'active' : ''}">${p.label}</a>`
  ).join('');
}

// Alterna entre a secção de Futebol (raiz do site) e a secção de NBA (pasta nba/).
// current: 'futebol' | 'nba'. As páginas da NBA chamam isto com a mesma
// página ativa (mesmo nome de ficheiro) para que o toggle troque de secção
// sem trocar de separador dentro da secção.
function renderSportToggle(current){
  const el = document.getElementById('sport-toggle');
  if(!el) return;
  const isNba = current === 'nba';
  const futebolHref = isNba ? '../index.html' : 'index.html';
  const nbaHref = isNba ? 'index.html' : 'nba/index.html';
  el.innerHTML = `
    <a href="${futebolHref}" class="${!isNba ? 'active' : ''}">⚽ Futebol</a>
    <a href="${nbaHref}" class="${isNba ? 'active' : ''}">🏀 NBA</a>
  `;
}

function fmtEUR(v){ return (v<0?"-":"") + Math.abs(v).toFixed(2).replace(".",",") + " €"; }
function fmtPct(v){ return (v>=0?"+":"") + v.toFixed(1) + "%"; }
function fmtDate(iso){
  try{
    const d = new Date(iso);
    return d.toLocaleString('pt-PT', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  }catch(e){ return iso; }
}
function safeParseList(raw){
  if(!raw) return [];
  if(Array.isArray(raw)) return raw;
  try{ return JSON.parse(raw); }catch(e){ return []; }
}

/* ---- animação: contagem de números em stat tiles ----
   target: elemento; endValue: número final; fmt: função que formata o número;
   isCurrency: se o valor pode ser negativo e deve mostrar sinal. */
function animateCount(el, endValue, fmt, duration){
  duration = duration || 900;
  const startValue = 0;
  const startTime = performance.now();
  function tick(now){
    const t = Math.min((now - startTime) / duration, 1);
    // ease-out cúbico
    const eased = 1 - Math.pow(1 - t, 3);
    const current = startValue + (endValue - startValue) * eased;
    el.textContent = fmt(current);
    if(t < 1) requestAnimationFrame(tick);
    else el.textContent = fmt(endValue);
  }
  requestAnimationFrame(tick);
}

/* ---- animação: placar do Tribunal "revela-se" ao abrir o cartão ---- */
function animatePlacarReveal(el){
  el.classList.remove('reveal');
  // forçar reflow para poder reiniciar a animação
  void el.offsetWidth;
  el.classList.add('reveal');
}

/* ---- animação: barras de ranking crescem até à percentagem final ---- */
function animateBars(container){
  const bars = container.querySelectorAll('.bar-fill');
  requestAnimationFrame(() => {
    bars.forEach(b => { b.style.width = b.dataset.target; });
  });
}

/* ---- mostra um aviso no topo da página se a última corrida do bot falhou,
   ou se os dados estão há muito tempo sem atualizar (sinal indireto de que
   a tarefa agendada parou de correr). ---- */
function renderStatusBanner(data){
  const el = document.getElementById('status-banner');
  if(!el) return;
  const run = data.ultima_corrida;
  const generatedAt = data.generated_at ? new Date(data.generated_at) : null;
  const ageHours = generatedAt ? (Date.now() - generatedAt.getTime()) / 3600000 : null;

  let msg = null;
  if(run && run.ok === false){
    msg = `A última corrida do bot falhou a meio: ${run.error || 'erro desconhecido'}. Os dados podem estar desatualizados.`;
  } else if(ageHours !== null && ageHours > 26){
    msg = `Os dados não são atualizados há mais de ${Math.floor(ageHours)}h — vale a pena verificar se a tarefa agendada está a correr.`;
  }

  if(msg){
    el.textContent = msg;
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
}

/* ---- radar dos pesos dos Jurados numa aposta concreta ----
   Cada Jurado pondera os Especialistas disponíveis de forma diferente (ver
   agents/jury.py) — isto desenha essa matriz de pesos como um radar, um
   polígono por Jurado, para tornar visível porque é que divergem mesmo
   vendo exatamente a mesma informação nesta aposta.
   processoRaw: string JSON (ou objeto já parseado) guardado em b.processo_json.
   agentLabels: dict {chave_do_especialista: nome_bonito}, na ordem canónica
   da página (define também a ordem dos eixos). Devolve '' se não há dados
   suficientes (menos de 3 eixos, ou nenhum jurado). */
function buildPesosRadarSVG(processoRaw, agentLabels){
  if(!processoRaw) return '';
  let processo;
  try{ processo = typeof processoRaw === 'string' ? JSON.parse(processoRaw) : processoRaw; }
  catch(e){ return ''; }
  const jurados = processo && processo.jurados;
  if(!Array.isArray(jurados) || jurados.length === 0) return '';

  const axisKeys = Object.keys(agentLabels).filter(k => jurados.some(j => j.pesos && (k in j.pesos)));
  if(axisKeys.length < 3) return '';

  const JUROR_COLORS = ['#c79a5b','#5fae80','#b24f41','#5b84c7','#b05bc2','#4fb0bd'];
  let maxPeso = 0;
  jurados.forEach(j => axisKeys.forEach(k => { const v = (j.pesos||{})[k] || 0; if(v > maxPeso) maxPeso = v; }));
  if(maxPeso <= 0) maxPeso = 1;

  const cx = 130, cy = 130, R = 92, N = axisKeys.length;
  const angle = i => -Math.PI/2 + i * 2*Math.PI/N;
  const pt = (i, frac) => [cx + Math.cos(angle(i))*R*frac, cy + Math.sin(angle(i))*R*frac];

  let grid = '';
  [0.25, 0.5, 0.75, 1].forEach(frac => {
    const pts = axisKeys.map((_,i) => pt(i,frac).map(n=>n.toFixed(1)).join(',')).join(' ');
    grid += `<polygon points="${pts}" fill="none" stroke="var(--line)" stroke-width="1"/>`;
  });

  let axesSvg = '';
  axisKeys.forEach((k,i) => {
    const [x,y] = pt(i,1);
    axesSvg += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line)" stroke-width="1"/>`;
    const [lx,ly] = pt(i,1.22);
    axesSvg += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="var(--paper-dim)">${agentLabels[k]||k}</text>`;
  });

  let polys = '', legend = '';
  jurados.forEach((j,ji) => {
    const color = JUROR_COLORS[ji % JUROR_COLORS.length];
    const pts = axisKeys.map((k,i) => {
      const v = (j.pesos||{})[k] || 0;
      const frac = Math.max(0.04, v/maxPeso);
      return pt(i,frac).map(n=>n.toFixed(1)).join(',');
    }).join(' ');
    polys += `<polygon points="${pts}" fill="${color}" fill-opacity="0.1" stroke="${color}" stroke-width="1.6"/>`;
    legend += `<span class="radar-legend-item"><span class="sw" style="background:${color}"></span>${j.jurado}</span>`;
  });

  return `
    <div class="radar-wrap">
      <div class="radar-title">Como cada Jurado ponderou os Especialistas nesta aposta</div>
      <svg viewBox="0 0 260 270" width="260" height="270">${grid}${axesSvg}${polys}</svg>
      <div class="radar-legend">${legend}</div>
    </div>`;
}

/* ---- Monte Carlo formal: Odd Justa vs Odd da Casa, EV% ----
   O modelo (Poisson/Dixon-Coles no futebol, Normal na NBA) já calcula a
   probabilidade final (b.final_probability, o "Oráculo") de forma exata, por
   enumeração completa — não por amostragem. Simular 10.000 vezes não muda
   essa probabilidade; o que a simulação mostra, com honestidade, é a Lei dos
   Grandes Números em ação: se esta aposta exata fosse repetida 10.000 vezes
   com a mesma probabilidade, a taxa de vitórias simulada converge para o
   número que o modelo já afirmava — é essa convergência visível que dá
   confiança na probabilidade publicada, não um novo número.
   bet: objeto da aposta (precisa de final_probability e market_odds).
   Devolve '' se faltar informação suficiente. */
function buildMonteCarloBlock(bet){
  const p = bet.final_probability, odds = bet.market_odds;
  if(p == null || odds == null || p <= 0 || p >= 1) return '';

  const oddJusta = 1 / p;
  const evPct = (p * odds - 1) * 100;
  const evCls = evPct > 0.5 ? 'pos' : (evPct < -0.5 ? 'neg' : 'neu');

  const N = 10000, CHECKPOINTS = 60;
  const step = Math.max(1, Math.floor(N / CHECKPOINTS));
  let wins = 0;
  const series = [];
  for(let i = 1; i <= N; i++){
    if(Math.random() < p) wins++;
    if(i % step === 0) series.push(wins / i);
  }
  if(series.length < 2) return '';

  const W = 260, H = 64, padL = 4, padR = 4, padT = 6, padB = 6;
  const allVals = series.concat([p]);
  const minV = Math.min(...allVals), maxV = Math.max(...allVals);
  const span = (maxV - minV) || 0.05;
  const lo = Math.min(minV, p) - span * 0.2;
  const hi = Math.max(maxV, p) + span * 0.2;
  const safeSpan = (hi - lo) || 0.1;
  const x = i => padL + (i / (series.length - 1)) * (W - padL - padR);
  const ys = v => padT + (1 - (v - lo) / safeSpan) * (H - padT - padB);

  const path = series.map((v,i) => `${i===0?'M':'L'} ${x(i).toFixed(1)} ${ys(v).toFixed(1)}`).join(' ');
  const refY = ys(p).toFixed(1);

  return `
    <div class="mc-wrap">
      <div class="radar-title">Monte Carlo (10.000 simulações) — convergência da taxa de vitórias para a probabilidade do modelo</div>
      <div class="mc-stats">
        <div><span class="m-label">Odd Justa</span><span class="m-value">${oddJusta.toFixed(2)}</span></div>
        <div><span class="m-label">Odd da Casa</span><span class="m-value">${odds.toFixed(2)}</span></div>
        <div><span class="m-label">EV</span><span class="m-value ${evCls}">${fmtPct(evPct)}</span></div>
      </div>
      <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
        <line x1="${padL}" y1="${refY}" x2="${W-padR}" y2="${refY}" stroke="var(--brass)" stroke-width="1" stroke-dasharray="3,3"/>
        <path d="${path}" fill="none" stroke="var(--pitch-bright)" stroke-width="1.6"/>
      </svg>
      <div class="mc-caption">Linha a tracejado = probabilidade do modelo (${(p*100).toFixed(1)}%); linha sólida = taxa de vitórias acumulada ao longo de 10.000 repetições simuladas desta aposta.</div>
    </div>`;
}

/* ---- deteta se uma aposta ganhou "recentemente" (liquidada nas últimas 48h)
   para aplicar o efeito de luz subtil no cartão ---- */
function isRecentWin(bet){
  if(bet.status !== 'won') return false;
  const settledAt = bet.settled_at || bet.kickoff_utc;
  if(!settledAt) return false;
  const diffMs = Date.now() - new Date(settledAt).getTime();
  return diffMs >= 0 && diffMs < 48 * 3600 * 1000;
}

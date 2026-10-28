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
  {href: "ranking.html",        label: "Ranking dos Jurados"},
  {href: "metodologia.html",    label: "Metodologia"},
  {href: "glossario.html",      label: "Glossário"},
];

function renderNav(activeHref){
  const navEl = document.getElementById('sitenav');
  if(!navEl) return;
  navEl.innerHTML = SITE_PAGES.map(p =>
    `<a href="${p.href}" class="${p.href===activeHref ? 'active' : ''}">${p.label}</a>`
  ).join('');
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

/* ---- deteta se uma aposta ganhou "recentemente" (liquidada nas últimas 48h)
   para aplicar o efeito de luz subtil no cartão ---- */
function isRecentWin(bet){
  if(bet.status !== 'won') return false;
  const settledAt = bet.settled_at || bet.kickoff_utc;
  if(!settledAt) return false;
  const diffMs = Date.now() - new Date(settledAt).getTime();
  return diffMs >= 0 && diffMs < 48 * 3600 * 1000;
}

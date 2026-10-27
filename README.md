# O Tribunal da Pátria

Dashboard público do bot de simulação de apostas desportivas — sem dinheiro real.

- Site estático multi-página (sem build necessário): `index.html` (Hoje), `como-funciona.html`,
  `especialistas.html`, `tribunal.html`, `historico.html`, `ranking.html`, `metodologia.html`, `glossario.html`.
- Estilo e utilitários partilhados em `assets/style.css` e `assets/common.js` (navegação, formatação, animações).
- Lê os dados de `data/snapshot.json`.
- Esse ficheiro é publicado automaticamente pelo bot (a correr no PC do dono do projeto) depois de cada
  `scheduler/daily_run.py`, via GitHub Contents API — cada push aqui dispara um novo deploy automático na Vercel.

Modelo: Poisson/Dixon-Coles + "Tribunal" de agentes de IA (7 Especialistas, 5 Jurados, 1 Presidente — D. João II).
Dados de jogos via football-data.org, odds via SharpAPI.

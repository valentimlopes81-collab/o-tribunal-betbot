# O Tribunal

Dashboard público do bot de simulação de apostas desportivas — sem dinheiro real.

- Site estático (`index.html`), sem build necessário.
- Lê os dados de `data/snapshot.json`.
- Esse ficheiro é publicado automaticamente pelo bot (a correr no PC do dono do projeto) depois de cada `scheduler/daily_run.py`, via GitHub Contents API — cada push aqui dispara um novo deploy automático na Vercel.

Modelo: Poisson/Dixon-Coles + "Tribunal" de agentes de IA. Dados de jogos via football-data.org, odds via SharpAPI.

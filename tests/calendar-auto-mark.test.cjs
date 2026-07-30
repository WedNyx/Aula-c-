// Marcar "hoje teve aula" sozinho só pode acontecer se algum aluno foi visto ONLINE hoje — antes
// a checagem era só "a turma tem algum aluno cadastrado", o que fica true pra sempre depois do
// primeiro aluno criado (mesmo em dias sem ninguém online), e desfazia sozinho em até 10s quando
// o professor removia manualmente o dia errado pelo calendário.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require('./helpers.cjs');

const d = new Date();
const todayKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const yesterday = new Date(Date.now() - 26 * 60 * 60 * 1000).getTime(); // >24h atrás, claramente "não hoje"

(async () => {
  // ── parte 1: ninguém foi visto hoje → NÃO marca hoje sozinho, mesmo com aluno cadastrado ──
  {
    const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
    kvStore.set('student:matutino:AlunoAntigo', JSON.stringify({
      name: 'AlunoAntigo', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'x' }],
      phase: 'coding', lastSeen: yesterday, score: 80,
    }));

    const browser = await launchBrowser();
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);

    await loginTeacher(page);
    await page.waitForTimeout(1800); // dá tempo do load() inicial rodar pelo menos 1x

    const meta = JSON.parse(kvStore.get('teachermeta:main'));
    check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    check('Ninguém visto hoje → hoje NÃO é marcado sozinho (só ter aluno cadastrado não basta)', !(meta.classDays || []).includes(todayKey), JSON.stringify(meta.classDays));

    await ctx.close();
    await browser.close();
  }

  // ── parte 2: aluno visto ONLINE hoje → marca hoje sozinho normalmente (não quebrou a funcionalidade) ──
  {
    const kvStore = baseKvStore({ city: 'Sobradinho', classDays: ['2026-07-20'] });
    kvStore.set('student:matutino:AlunoHoje', JSON.stringify({
      name: 'AlunoHoje', shift: 'matutino', avatar: {}, files: [{ name: 'Program.cs', code: 'x' }],
      phase: 'coding', lastSeen: Date.now(), score: 80,
    }));

    const browser = await launchBrowser();
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
    const page = await ctx.newPage();
    const jsErrors = await mockRoutes(page, kvStore);

    await loginTeacher(page);
    await page.waitForTimeout(1800);

    const meta = JSON.parse(kvStore.get('teachermeta:main'));
    check('SEM erro de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
    check('Aluno visto ONLINE hoje → hoje é marcado sozinho normalmente', (meta.classDays || []).includes(todayKey), JSON.stringify(meta.classDays));

    await ctx.close();
    await browser.close();
  }

  process.exit(summary('CALENDÁRIO: SÓ MARCA "TEVE AULA HOJE" SE ALGUÉM FOI VISTO ONLINE HOJE') ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message, e.stack); process.exit(1); });

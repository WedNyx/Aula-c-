// Mock bem simples do endpoint REST estilo Upstash (só o suficiente pra api/kv.js funcionar
// contra ele) — usado pelos testes de api/*.js pra não precisar de um banco de verdade.
import http from 'node:http';

const mem = new Map();

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/pipeline') { res.writeHead(404); res.end(); return; }
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    const cmds = JSON.parse(body); // [[cmd, ...args]]
    const results = cmds.map(([cmd, ...args]) => {
      if (cmd === 'EVAL' && args[0].includes('-- student-cas')) {
        const [, , key, presence, expected, value] = args;
        if ((presence === 'missing' && !mem.has(key)) || (presence === 'present' && mem.get(key) === expected)) {
          mem.set(key, value); return { result: 1 };
        }
        return { result: 0 };
      }
      if (cmd === 'SET') { mem.set(args[0], args[1]); return { result: 'OK' }; }
      if (cmd === 'GET') return { result: mem.has(args[0]) ? mem.get(args[0]) : null };
      if (cmd === 'DEL') { args.forEach(k => mem.delete(k)); return { result: args.length }; }
      if (cmd === 'KEYS') return { result: [...mem.keys()].filter(k => k.startsWith(args[0].replace('*', ''))) };
      if (cmd === 'MGET') return { result: args.map(k => mem.get(k) ?? null) };
      return { result: null };
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results));
  });
});

const PORT = Number(process.env.FAKE_REDIS_PORT || 8934);
server.listen(PORT, () => console.log(`fake redis on :${PORT}`));

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const kv = fs.readFileSync(path.join(root, 'api', 'kv.js'), 'utf8');
const storage = fs.readFileSync(path.join(root, 'src', 'storage.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src', 'App.jsx'), 'utf8');
const env = fs.readFileSync(path.join(root, '.env.local.example'), 'utf8');

assert.ok(kv.includes("import { createSign, randomUUID } from 'node:crypto'"), 'Firebase deve autenticar apenas no servidor');
assert.ok(kv.includes("process.env.DATABASE_PRIMARY === 'firebase'"), 'a troca de banco deve exigir ativação explícita');
assert.ok(kv.includes("case 'migrate_to_firebase'"), 'endpoint deve oferecer migração autenticada');
assert.ok(kv.includes("if (action === 'migrate_to_firebase') return true"), 'migração deve exigir senha do professor');
assert.ok(kv.includes(".range(from, from + 999)"), 'migração deve paginar mais de mil registros do Supabase');
assert.ok(kv.includes("batchBytes + estimatedBytes > 8 * 1024 * 1024"), 'migração deve limitar lotes por tamanho e quantidade');
assert.ok(kv.includes("firestoreDocumentName(item.key)"), 'commits devem usar nomes de recurso do Firestore');
assert.ok(kv.includes("SHADOW_FIREBASE"), 'transição deve manter gravação dupla até o corte');
assert.ok(kv.includes("if (FIREBASE_PRIMARY) throw"), 'migração deve ser bloqueada depois do corte');
assert.ok(kv.includes("FIREBASE_INLINE_VALUE_BYTES"), 'valores grandes devem ser fragmentados');
assert.ok(kv.includes("currentDocument.updateTime"), 'compare-and-set deve preservar concorrência no Firestore');
assert.ok(kv.includes("chunkGeneration"), 'blocos grandes devem ser publicados por geração imutável');
assert.ok(kv.includes("firestoreShadowWrite"), 'gravações duplas devem respeitar a revisão da origem');
assert.ok(kv.includes("tombstone = false"), 'exclusões devem deixar marcadores durante a migração');
assert.ok(storage.includes("export async function migrateToFirebase"), 'cliente deve expor a migração protegida');
assert.ok(app.includes("Copiar dados do Supabase para o Firebase"), 'painel deve oferecer a migração');
assert.ok(app.includes('diag.storageHealth?.activeBackend === "firebase"'), 'painel deve distinguir o banco ativo');
assert.ok(env.includes('FIREBASE_SERVICE_ACCOUNT_JSON='), 'exemplo deve documentar credenciais Firebase');
assert.ok(env.includes('DATABASE_PRIMARY=supabase'), 'migração deve começar sem trocar o banco antes da cópia');

console.log('firebase-migration-contract.test.cjs: ok');

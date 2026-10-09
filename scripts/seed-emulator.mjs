// Cria (ou reutiliza) uma conta de administração no emulador local.
const PROJETO = 'demo-app-juris';
const EMAIL = 'admin@juris.test';
const PASSWORD = 'admin-local-123';
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const FIRESTORE = `http://127.0.0.1:8080/v1/projects/${PROJETO}/databases/(default)/documents`;

async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}

let conta = await post(`${AUTH}/accounts:signUp?key=fake-api-key`, { email: EMAIL, password: PASSWORD, returnSecureToken: true });
if (conta.error?.message === 'EMAIL_EXISTS') {
  conta = await post(`${AUTH}/accounts:signInWithPassword?key=fake-api-key`, { email: EMAIL, password: PASSWORD, returnSecureToken: true });
}
if (conta.error) throw new Error(conta.error.message);

const r = await fetch(`${FIRESTORE}/admins/${conta.localId}`, {
  method: 'PATCH',
  headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields: { criadoEm: { stringValue: new Date().toISOString() } } }),
});
if (!r.ok) throw new Error(`Falhou a criar admins/${conta.localId}: ${r.status}`);
console.log(`Conta de administração local pronta: ${EMAIL} (password em scripts/seed-emulator.mjs)`);

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../src/services/roleIntegritySentinelAgent.js', import.meta.url), 'utf8');
const implementation = source.slice(source.indexOf('export async function applyReviewedRoleChanges')).replace('export ', '');
const proposal = {docId:'one',email:'person@example.org',previousRole:'coordinador',previousRoles:['coordinador'],repairedRole:'coord_c1',repairedRoles:['coord_c1']};
function harness(current) {
  const writes=[];
  const runTransaction = async (_, action) => action({get: async () => ({exists:()=>true,data:()=>current}),update:(ref,payload)=>writes.push({ref,payload})});
  const apply = new Function('db','runTransaction','doc','serverTimestamp', implementation+'; return applyReviewedRoleChanges;')({},runTransaction,(_,collection,id)=>({collection,id}),()=> 'timestamp');
  return {apply,writes};
}
test('revisión obsoleta no escribe ningún cambio', async () => {
  const {apply,writes}=harness({email:proposal.email,role:'gerente',roles:['gerente']});
  await assert.rejects(apply({healedUsers:[proposal]},'reviewer@example.org'),/cambió/);
  assert.equal(writes.length,0);
});
test('corrección aprobada mantiene sede y registra el rol anterior', async () => {
  const {apply,writes}=harness({email:proposal.email,role:'coordinador',roles:['coordinador'],sede:'Quito'});
  assert.equal(await apply({healedUsers:[proposal]},'reviewer@example.org'),1);
  assert.equal(writes[0].payload.role,'coord_c1');
  assert.equal(writes[0].payload.rolesAuditPreviousRole,'coordinador');
  assert.equal('sede' in writes[0].payload,false);
});

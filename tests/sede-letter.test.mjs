import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const catalog=JSON.parse(readFileSync(new URL('../public/cartas/sedes-institucionales.json',import.meta.url),'utf8'));
const script=readFileSync(new URL('../public/cartas/carta-sedes.js',import.meta.url),'utf8');
async function render(sede,fields){
  const elements=new Map();let handler;
  const node=()=>({textContent:'',children:[],value:'',append(...n){this.children.push(...n)},prepend(){},replaceChildren(){this.children=[]},setAttribute(){},addEventListener(){}});
  const document={currentScript:{src:'https://example.test/carta-sedes.js'},createElement:node,body:node(),getElementById(id){if(!elements.has(id))elements.set(id,node());return elements.get(id)},addEventListener(_,fn){handler=fn}};
  const context={document,URL,URLSearchParams,AbortSignal,location:{search:'?sede='+sede},history:{replaceState(){}},fetch:async url=>String(url).includes('firestore.googleapis')?{ok:!!fields,status:fields?200:404,json:async()=>({fields:Object.fromEntries(Object.entries(fields||{}).map(([k,v])=>[k,{stringValue:v}]))})}:{ok:true,json:async()=>catalog}};
  vm.runInNewContext(script,context);await handler();return elements;
}
test('cada sede conserva sus responsables y no hereda la razón social de Lima',async()=>{
  for(const [id,data] of Object.entries(catalog)){
    const result=await render(id);const signature=result.get('sede-signature').children.map(n=>n.textContent).join(' ');
    for(const manager of data.gerentes)assert.ok(signature.includes(manager.nombre));
    if(id!=='lima'){assert.equal(signature,data.gerentes.map(g=>g.nombre).join(' '));assert.ok(!result.get('sede-invitation').textContent.includes('20612592811'));}
    assert.ok(result.get('sede-authority').textContent.includes(data.pais));
  }
});
test('datos suministrados en Causa OS reemplazan los datos faltantes',async()=>{
  const result=await render('quito',{razonSocial:'Empresa de prueba',identificacionFiscal:'ID de prueba',direccionFiscal:'Dirección de prueba',correoContacto:'contacto@example.org',telefonoContacto:'+593 000'});
  assert.ok(result.get('sede-invitation').textContent.includes('Empresa de prueba'));
  assert.equal(result.get('sede-signature').children.length,6);
});
test('sede ausente no se convierte en Lima',async()=>{
  const result=await render('');assert.equal(result.get('sede-signature').children.length,0);assert.match(result.get('sede-city').textContent,/PENDIENTE/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCensus, fetchCensus, CENSUS_VARIABLES } from '../server/census.mjs';
const headers=['NAME',...CENSUS_VARIABLES,'state','county'];
function row(overrides={}){
  const values={NAME:'Rincón Municipio, Puerto Rico',state:'72',county:'117',B01003_001E:'15000',B01003_001M:'350',B19013_001E:'26000',B19013_001M:'2100',B25077_001E:'150000',B25077_001M:'14000',B01002_001E:'46.5',B01002_001M:'1.2',...overrides};
  return headers.map(name=>values[name]??null);
}
test('Census values retain their survey period, FIPS, units and margins of error',()=>{
  const result=parseCensus([headers,row()])[0];
  assert.equal(result.town,'Rincón');assert.equal(result.fips,'72117');
  assert.equal(result.period,'2020–2024');
  assert.equal(result.marginOfErrorConfidenceLevel,0.9);
  assert.equal(result.medianHouseholdIncome.estimate,26000);
  assert.equal(result.medianHouseholdIncome.marginOfError,2100);
  assert.equal(result.medianAge.estimate,46.5);
  assert.equal(result.medianOwnerOccupiedHomeValue.unit,'USD');
});
test('Census unavailable sentinels stay missing and annotations are preserved',()=>{
  const result=parseCensus([headers,row({B25077_001E:'-666666666',B25077_001M:'-222222222',B25077_001EA:'N',B19013_001M:null})])[0];
  assert.equal(result.medianOwnerOccupiedHomeValue.estimate,null);
  assert.equal(result.medianOwnerOccupiedHomeValue.marginOfError,null);
  assert.equal(result.medianOwnerOccupiedHomeValue.annotation,'N');
  assert.equal(result.medianHouseholdIncome.marginOfError,null);
});
test('malformed or foreign geography cannot enter a Puerto Rico municipality cache',()=>{
  assert.throws(()=>parseCensus([['NAME','state','county'],['Ponce','72','113']]));
  assert.throws(()=>parseCensus([headers,row({state:'06'})]));
  assert.throws(()=>parseCensus([headers,row(),row()]));
});
test('controlled population margins are distinguished from unavailable margins',()=>{
  const result=parseCensus([headers,row({B01003_001M:'-555555555',B19013_001M:null})])[0];
  assert.equal(result.population.marginOfError,null);
  assert.match(result.population.marginOfErrorNote,/controlled.*no sampling error/i);
  assert.equal(result.medianHouseholdIncome.marginOfErrorNote,null);
});
test('retrieved Census schema errors retain their safe diagnostic',async()=>{
  await assert.rejects(fetchCensus({key:'private-test-key',fetchImpl:async()=>({
    ok:true,json:async()=>[['NAME','state','county'],['Ponce','72','113']],
  })}),/Incomplete Census schema/);
});
test('Census fetch keeps the key out of data and errors',async()=>{
  const key='private-test-key';
  const result=await fetchCensus({key,fetchImpl:async url=>{
    assert.equal(new URL(url).hostname,'api.census.gov');
    assert.equal(new URL(url).searchParams.get('key'),key);
    return{ok:true,json:async()=>[headers,row()]};
  }});
  assert.equal(JSON.stringify(result).includes(key),false);
  await assert.rejects(fetchCensus({key,fetchImpl:async()=>{throw new Error(key)}}),err=>!err.message.includes(key));
});

'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=require('./app.js');
const observation={observed_state:'ACTIVE_DELEGATE_OBSERVED',observed_at:'2026-01-01T00:00:00Z',expires_at:'2026-01-01T00:05:00+00:00',stale_after_seconds:300,basis:'HERMES_NATIVE_DELEGATE_LIST'};
test('real observed worker expires independently of fresh runtime',()=>{
 const state=app.workerState;
 assert.equal(state?.(observation,Date.parse('2026-01-01T00:04:59Z')),'ACTIVE_DELEGATE_OBSERVED');
 assert.equal(state?.(observation,Date.parse('2026-01-01T00:05:00Z')),'UNKNOWN');
 assert.equal(state?.(null,Date.now()),'UNKNOWN');
 assert.equal(state?.({...observation,stale_after_seconds:true},Date.parse('2026-01-01T00:01:00Z')),'UNKNOWN');
 assert.equal(state?.({...observation,expires_at:'2027-01-01T00:05:00Z'},Date.parse('2026-01-01T00:01:00Z')),'UNKNOWN');
 assert.equal(app.health('2026-01-01T00:05:00Z',Date.parse('2026-01-01T00:06:00Z')),'RECENT_RUNTIME_ONLY');
});
function harness(){
 class Element {
  constructor(){this.children=[];this.textContent='';this.hidden=false;}
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=[...items];}
  get text(){return this.textContent+this.children.map(x=>typeof x==='string'?x:x.text).join(' ');}
 }
 const elements=new Map();
 const document={createElement:()=>new Element(),getElementById:id=>{
  if(!elements.has(id))elements.set(id,new Element());return elements.get(id);
 }};
 const intervals=[];
 const context={...app,document,localStorage:{getItem:()=>null,setItem:()=>{}},fetch:async()=>{throw Error('offline control');},setInterval:(fn,ms)=>intervals.push({fn,ms}),Date:class extends Date{},console};
 vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/ui.js','utf8'),context);
 return {context,elements,intervals};
}
test('actual renderer separates accepted Drop1, active Drop11, stale workers and runtime',async()=>{
 const {context,elements}=harness();
 const snapshot={schema_version:1,last_checked:'2026-01-01T00:00:00Z',nodes:[{id:'home-windows',title:'Windows',connection:'UNKNOWN',runtime_heartbeat_at:new Date().toISOString(),agent_heartbeat_at:null},{id:'pi',title:'Pi',connection:'NOT_CONNECTED',runtime_heartbeat_at:null}],agents:[],lanes:[
 {id:'drop1-human-loop',title:'Drop1 accepted',status:'DONE',title_ar:'Accepted Build11',milestone:'Accepted Build11',outcome:'FUNCTIONALLY_ACCEPTED'},
 {id:'drop-1-1-fast-playtest',title:'Drop1.1 correction',status:'ACTIVE',title_ar:'Separate correction',milestone:'Area Foundation remains required',worker_observation:observation},
 {id:'truenas-backup-audit',title:'NAS parked',status:'BLOCKED',title_ar:'Parked',milestone:'No work executed',outcome:'PARKED'}]};
 context.render(snapshot);
 assert.match(elements.get('lanes').text,/Drop1.1 correction/);
 assert.match(elements.get('history').text,/Accepted Build11/);
 assert.match(elements.get('lanes').text,/Worker: UNKNOWN/);
 assert.match(elements.get('nodes').text,/RECENT_RUNTIME_ONLY/);
 assert.match(elements.get('nodes').text,/تشغيل الأتمتة حديث/); // Service provenance, never a claim that the Lead is continuously online.
 assert.match(elements.get('nodes').text,/NOT CONNECTED/);
 assert.ok(elements.get('worker-status')?.text.includes('UNKNOWN'),'Worker summary must be driven by observations, not hardcoded HTML');
 // Exercise actual failed-refresh retention, not only the retain helper.
 vm.runInContext('last = '+JSON.stringify(snapshot),context);
 await context.refresh();
 assert.match(elements.get('lanes').text,/Drop1.1 correction/);
 assert.equal(elements.get('error').hidden,false);
 assert.match(elements.get('error').textContent,/last-known snapshot retained/);
});
test('Lead renderer uses parent observation then expires offline while retaining original times',async()=>{
 const {context,elements,intervals}=harness(),at=Date.parse('2026-01-01T00:00:00Z');
 const lead={observed_state:'ACTIVE_TURN_OBSERVED',observed_at:'2026-01-01T00:00:00Z',expires_at:'2026-01-01T00:05:00+00:00',stale_after_seconds:300,basis:'HERMES_NATIVE_LEAD_TURN'};
 const snapshot={schema_version:1,last_checked:lead.observed_at,nodes:[{id:'home-windows',title:'Windows',connection:'UNKNOWN',agent_heartbeat_at:null,runtime_heartbeat_at:lead.observed_at,lead_observation:lead}],lanes:[]};
 context.clock=at+299999;vm.runInContext('Date.now=()=>clock;last='+JSON.stringify(snapshot),context);
 context.render(snapshot);
 assert.match(elements.get('lead-status').text,/ACTIVE_TURN_OBSERVED/);
 assert.doesNotMatch(elements.get('lead-status').text,/ONLINE/);
 assert.match(elements.get('lead-status').text,/2026-01-01T00:00:00Z/);
 assert.match(elements.get('lead-status').text,/2026-01-01T00:05:00/);
 context.clock=at+300000;intervals.find(i=>i.ms===15000).fn();
 assert.match(elements.get('lead-status').text,/UNKNOWN/);
 assert.match(elements.get('lead-status').text,/2026-01-01T00:00:00Z/);
 await context.refresh();assert.match(elements.get('lead-status').text,/UNKNOWN/);
 assert.equal(snapshot.nodes[0].agent_heartbeat_at,null);
 for(const bad of [null,{...lead,observed_at:'future'},{...lead,stale_after_seconds:true},
    {...lead,basis:'RUNTIME_CLOCK'},{...lead,observed_state:'ONLINE'},
    {...lead,expires_at:'2099-01-01T00:00:00Z'},{...lead,session_id:'private'}]){
  assert.equal(app.leadState?.(bad,at+1000),'UNKNOWN');
 }
 assert.equal(app.leadState?.(lead,at-1),'UNKNOWN');
 assert.equal(app.leadState?.(lead,at),'ACTIVE_TURN_OBSERVED');
});
test('normalized invalid UTC calendar dates are not Lead observations',()=>{
 const bad={observed_state:'ACTIVE_TURN_OBSERVED',observed_at:'2026-02-30T00:00:00Z',expires_at:'2026-02-30T00:05:00Z',stale_after_seconds:300,basis:'HERMES_NATIVE_LEAD_TURN'};
 assert.equal(app.leadState(bad,Date.parse('2026-03-02T00:01:00Z')),'UNKNOWN');
});
test('index exposes dynamic worker summary without layout redesign',()=>{
 const html=fs.readFileSync(__dirname+'/index.html','utf8');
 assert.match(html,/id="worker-status"/);
 assert.match(html,/id="lead-status"/);
});

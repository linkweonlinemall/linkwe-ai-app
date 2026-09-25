const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const Module=require('node:module'),path=require('node:path');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const h=require('../lib/messages/vendor-inbox.ts');
const rows=[
 {id:'a',customerName:'Alicia James',lastMessageText:'Orange gift wrap',lastMessageAt:'2026-09-25T10:00:00Z',unread:2,lastSenderRole:'CUSTOMER'},
 {id:'b',customerName:'Marcus Pierre',lastMessageText:'Thanks for your order',lastMessageAt:'2026-09-24T10:00:00Z',unread:0,lastSenderRole:'VENDOR'},
 {id:'c',customerName:'Nia Thomas',lastMessageText:null,lastMessageAt:'2026-09-23T10:00:00Z',unread:0,lastSenderRole:null},
];
assert.deepEqual(h.filterInbox(rows,'james orange','all','recent').map(x=>x.id),['a']);
assert.deepEqual(h.filterInbox(rows,'','reply','recent').map(x=>x.id),['a']);
assert.deepEqual(h.filterInbox(rows,'','unread','recent').map(x=>x.id),['a']);
assert.deepEqual(h.filterInbox(rows,'','all','oldest').map(x=>x.id),['c','b','a']);
assert.equal(h.clearSeenUnread(rows,'a','2026-09-25T09:59:59Z')[0].unread,2);
assert.equal(h.clearSeenUnread(rows,'a','2026-09-25T10:00:00Z')[0].unread,0);
assert.equal(rows[0].unread,2);
const messages=[{id:'a',createdAt:'2026-09-25T10:00:00Z',content:'First'},{id:'b',createdAt:'2026-09-25T11:00:00Z',content:'Second'}];
assert.deepEqual(h.mergeChatMessages(messages,[messages[0]]),messages);
assert.equal(h.mergeChatMessages(messages,[messages[1]]).length,2);
assert.notEqual(h.draftKey('vendor1','c'),h.draftKey('vendor2','c'));
assert.notEqual(h.draftKey('vendor1','c'),h.draftKey('vendor1','d'));
assert.equal(h.recentlyActive('2026-09-25T12:00:00Z',Date.parse('2026-09-25T12:01:00Z')),true);
assert.equal(h.recentlyActive('2026-09-25T13:00:00Z',Date.parse('2026-09-25T12:01:00Z')),false);
assert.equal(h.messageDay('2026-09-25T02:00:00Z').includes('24'),true);
assert.equal(h.messageParts('javascript:alert(1)')[0].href,null);
assert.equal(h.messageParts('Visit https://example.com then reply')[1].href,'https://example.com/');
assert.equal(h.quickReplies('Alicia James')[0].text.includes('Alicia'),true);
console.log('PASS: search, filters, sorting, unread race guard, message deduplication, scoped drafts, local dates, presence and safe links.');

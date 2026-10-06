import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {randomBytes} from 'node:crypto';
import {LiteSVM,FailedTransactionMetadata} from 'litesvm';
import {address,lamports,getTransactionDecoder} from '@solana/kit';
import {Keypair,PublicKey,SystemProgram,Transaction,TransactionInstruction} from '@solana/web3.js';
const u64=(n:bigint)=>{const b=Buffer.alloc(8);b.writeBigUInt64LE(n);return b;};
function setup(){
 const svm=new LiteSVM();const program=Keypair.generate().publicKey,buyer=Keypair.generate(),worker=Keypair.generate(),authority=Keypair.generate(),attacker=Keypair.generate();
 for(const k of [buyer,worker,authority,attacker])svm.airdrop(address(k.publicKey.toBase58()),lamports(2000000000n));
 svm.addProgram(address(program.toBase58()),readFileSync(process.env.PROGRAM_BINARY??'docs/evidence/orca_orders.so'));
 const clock=svm.getClock();clock.unixTimestamp=100n;svm.setClock(clock);
 const nonce=randomBytes(32),input=randomBytes(32),seller=randomBytes(32),quote=randomBytes(32),result=randomBytes(32),payment=randomBytes(32);
 const pda=PublicKey.findProgramAddressSync([Buffer.from('order'),buyer.publicKey.toBuffer(),nonce],program)[0];
 const send=(tag:number,data:Buffer,signer=buyer,destination:PublicKey=SystemProgram.programId,order=pda)=> {
  svm.expireBlockhash();const tx=new Transaction({feePayer:signer.publicKey,recentBlockhash:svm.latestBlockhash()}).add(new TransactionInstruction({programId:program,data:Buffer.concat([Buffer.from([tag]),data]),keys:[{pubkey:signer.publicKey,isSigner:true,isWritable:true},{pubkey:order,isSigner:false,isWritable:true},{pubkey:destination,isSigner:false,isWritable:destination!==SystemProgram.programId}]}));tx.sign(signer);
  return svm.sendTransaction(getTransactionDecoder().decode(tx.serialize()));
 };
 const create=()=>send(0,Buffer.concat([nonce,input,seller,worker.publicKey.toBuffer(),authority.publicKey.toBuffer(),u64(10000000n),u64(1000n),u64(2000000n)]));
 const reserve=(price=2000000n,signer=worker,s=seller,i=input)=>send(1,Buffer.concat([quote,u64(price),s,i]),signer);
 const settle=(signer=authority,q=quote,dest=worker.publicKey)=>send(2,Buffer.concat([q,result,payment]),signer,dest);
 const refund=(signer=buyer,dest=buyer.publicKey)=>send(3,Buffer.alloc(0),signer,dest);
 const state=()=>svm.getAccount(address(pda.toBase58()))!;
 return{svm,pda,buyer,worker,authority,attacker,quote,send,create,reserve,settle,refund,state};
}
const pass=(r:unknown)=>assert.ok(!(r instanceof FailedTransactionMetadata),r instanceof FailedTransactionMetadata?r.toString():'');
const fail=(r:unknown)=>assert.ok(r instanceof FailedTransactionMetadata,'Expected an actual VM rejection');
test('compiled escrow funds, reserves and pays the fixed worker exactly once',()=>{const f=setup();pass(f.create());const escrowBefore=f.state().lamports;pass(f.reserve());const workerBefore=f.svm.getBalance(address(f.worker.publicKey.toBase58()))!;pass(f.settle());assert.equal(f.state().data[1],2);assert.equal(f.state().lamports,escrowBefore-10000000n);assert.equal(f.svm.getBalance(address(f.worker.publicKey.toBase58())),workerBefore+10000000n);fail(f.settle());fail(f.refund());});
test('compiled escrow rejects wrong authority, recipient, unreserved quote and early refund',()=>{const f=setup();pass(f.create());fail(f.settle());fail(f.refund());pass(f.reserve());fail(f.settle(f.attacker));fail(f.settle(f.authority,randomBytes(32)));fail(f.settle(f.authority,f.quote,f.attacker.publicKey));assert.equal(f.state().data[1],1);});
test('compiled quote guard rejects excess budget, wrong signer, seller, input and replay',()=>{const f=setup();pass(f.create());fail(f.reserve(2000001n));fail(f.reserve(2000000n,f.attacker));fail(f.reserve(2000000n,f.worker,randomBytes(32)));fail(f.reserve(2000000n,f.worker,undefined,randomBytes(32)));assert.equal(f.state().data[1],0);pass(f.reserve());fail(f.reserve());});
test('compiled expired escrow refunds buyer once and prevents subsequent settlement',()=>{const f=setup();pass(f.create());pass(f.reserve());const before=f.state().lamports;const clock=f.svm.getClock();clock.unixTimestamp=1000n;f.svm.setClock(clock);fail(f.settle());fail(f.refund(f.attacker));pass(f.refund());assert.equal(f.state().data[1],3);assert.equal(f.state().lamports,before-10000000n);fail(f.refund());fail(f.settle());});
test('compiled program rejects reinitialization and a counterfeit order address',()=>{const f=setup();pass(f.create());fail(f.create());fail(f.send(3,Buffer.alloc(0),f.buyer,f.buyer.publicKey,Keypair.generate().publicKey));});

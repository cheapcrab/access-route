import { createClient } from 'genlayer-js';
import { testnetBradbury,testnetAsimov,studionet } from 'genlayer-js/chains';
import type { CalldataEncodable,TransactionHash } from 'genlayer-js/types';
import { assertTarget,completeWrite } from './core';

export const networks={studio:studionet,bradbury:testnetBradbury,asimov:testnetAsimov};
type Provider=NonNullable<NonNullable<Parameters<typeof createClient>[0]>['provider']>;
let account:`0x${string}`|undefined;
export function provider():Provider{const p=(window as unknown as {ethereum?:Provider}).ethereum;if(!p)throw Error('Install or unlock MetaMask to sign testnet transactions.');return p;}
export function disconnect():void{account=undefined;}
export function currentAccount():string{return account??'';}
export async function connect(network:keyof typeof networks):Promise<string>{
  const p=provider(),chain=networks[network];
  const accounts=await p.request({method:'eth_requestAccounts'});const selected=(accounts as string[])[0] as `0x${string}`;
  if(!selected)throw Error('Wallet did not provide an account.');
  try{await p.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x'+chain.id.toString(16)}]});}
  catch(error){if((error as {code?:number}).code!==4902)throw error;await p.request({method:'wallet_addEthereumChain',params:[{chainId:'0x'+chain.id.toString(16),chainName:chain.name,nativeCurrency:chain.nativeCurrency,rpcUrls:[...chain.rpcUrls.default.http],...(chain.blockExplorers?{blockExplorerUrls:[chain.blockExplorers.default.url]}:{})}]});}
  account=selected;return selected;
}
export async function write(network:keyof typeof networks,address:string,method:string,args:CalldataEncodable[],report:(text:string)=>void):Promise<`0x${string}`>{
  if(!account)throw Error('Connect your wallet first.');
  const p=provider(),chain=networks[network],walletChain=Number(await p.request({method:'eth_chainId'}));
  assertTarget(address,walletChain,chain.id);
  const active=(await p.request({method:'eth_accounts'}) as string[])[0];
  if(active?.toLowerCase()!==account.toLowerCase()){disconnect();throw Error('Wallet account changed; reconnect.');}
  const read=createClient({chain}),signed=createClient({chain,account,provider:p});
  return completeWrite(async()=>{const hash=await signed.writeContract({address,functionName:method,args,value:0n});if(typeof hash!=='string'||!/^0x[0-9a-fA-F]{64}$/.test(hash))throw Error('SDK returned an invalid transaction identifier.');return hash as `0x${string}`;},hash=>read.waitForTransactionReceipt({hash:hash as TransactionHash,waitUntil:'finalized',interval:5000,retries:120}),report);
}
export async function read(network:keyof typeof networks,address:string,method:string,args:CalldataEncodable[]):Promise<unknown>{
  const chain=networks[network];assertTarget(address,chain.id,chain.id);
  const value=await createClient({chain}).readContract({address,functionName:method,args});
  if(typeof value!=='string')throw Error('Unexpected contract view response.');return JSON.parse(value);
}
export async function inspect(network:keyof typeof networks,hash:`0x${string}`):Promise<unknown>{if(!/^0x[0-9a-fA-F]{64}$/.test(hash))throw Error('Transaction ID must be a 32-byte hex hash.');return createClient({chain:networks[network]}).getTransaction({hash:hash as TransactionHash});}


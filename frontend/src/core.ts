import { isSuccessful } from 'genlayer-js';
import type { GenLayerTransaction } from 'genlayer-js/types';

export function assertTarget(address:string,walletChain:number,expectedChain:number):asserts address is `0x${string}` {
  if(!/^0x[0-9a-fA-F]{40}$/.test(address)||/^0x0{40}$/.test(address)) throw Error('Configure a real deployment address first.');
  if(walletChain!==expectedChain) throw Error('Wallet network does not match the selected testnet.');
}
export async function completeWrite(submit:()=>Promise<`0x${string}`>,wait:(hash:`0x${string}`)=>Promise<GenLayerTransaction>,report:(text:string)=>void):Promise<`0x${string}`>{
  report('Awaiting wallet approval…');
  const hash=await submit(); report(`Submitted: ${hash}`);
  const receipt=await wait(hash);
  report(`Stored status: ${receipt.statusName??receipt.status??'unknown'}; execution: ${receipt.txExecutionResultName??'unknown'}`);
  if(receipt.lifecycle.state!=='finalized') throw Error('Finality is unresolved; retain the submitted transaction ID.');
  if(!isSuccessful(receipt)) throw Error('Contract execution failed or has no successful return. Inspect the transaction.');
  report('Finalized; execution succeeded.'); return hash;
}

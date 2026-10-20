import {expect,it} from 'vitest';
import {edgeState,routeDisplay} from '../src/domain';
import {completeWrite} from '../src/core';
import {TransactionStatus,ExecutionResult} from 'genlayer-js/types';
it('hides expired access evidence rather than displaying a green edge',()=>{expect(edgeState({assessments:[{assessment:{status:'OPEN'},valid_until:120}]},120)).toBe('EXPIRED');expect(edgeState({assessments:[{assessment:{status:'OPEN'},valid_until:121}]},120)).toBe('OPEN');});
it('a no-evidence route never becomes a physical impossibility claim',()=>{expect(routeDisplay({outcome:'NO_EVIDENCE_PATH',edge_ids:[],minutes:0,valid_until:0},120).title).toBe('No evidence-qualified path');});
it('removes path highlights when the route evidence expires',()=>{const route={outcome:'EVIDENCE_PATH',edge_ids:['ab','bc'],minutes:5,valid_until:121};expect(routeDisplay(route,120).edges).toEqual(['ab','bc']);expect(routeDisplay(route,121).edges).toEqual([]);});
it('rejects finalized contract failure from the actual SDK success classifier',async()=>{await expect(completeWrite(async()=> '0x1234',async()=>({statusName:TransactionStatus.FINALIZED,txExecutionResultName:ExecutionResult.FINISHED_WITH_ERROR,lifecycle:{state:'finalized'}}),()=>{})).rejects.toThrow('execution failed');});

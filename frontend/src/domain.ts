export type EdgeRecord={assessments:{assessment:{status:string};valid_until:number}[]};
export function edgeState(record:EdgeRecord|undefined,now:number):string{const last=record?.assessments.at(-1);if(!last)return 'UNASSESSED';return last.valid_until<=now?'EXPIRED':last.assessment.status;}
export type RouteResult={outcome:string;edge_ids:string[];minutes:number;valid_until:number};
export function routeDisplay(route:RouteResult,now:number):{title:string;edges:string[]}{if(route.outcome!=='EVIDENCE_PATH')return {title:'No evidence-qualified path',edges:[]};if(route.valid_until<=now)return {title:'Route evidence expired',edges:[]};return {title:`Evidence-qualified path · ${route.minutes} registered minutes`,edges:route.edge_ids};}

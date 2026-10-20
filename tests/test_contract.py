import json
from pathlib import Path
import pytest

FILE=Path(__file__).resolve().parents[1]/'contract.py'
URL='https://raw.githubusercontent.com/example/routes/'+'a'*40+'/access.txt'
BODY='The library east entrance has a step-free ramp. This route is open for the stated demonstration.'
NODES=[{'id':'A','label':'Library'},{'id':'B','label':'Garden'},{'id':'C','label':'Station'}]
EDGES=[{'id':'ab','from':'A','to':'B','minutes':2,'sources':[URL]},{'id':'bc','from':'B','to':'C','minutes':3,'sources':[URL]},{'id':'ac','from':'A','to':'C','minutes':9,'sources':[URL]}]

def api(c,name):assert callable(getattr(c,name,None)), f'{name} behavior not implemented'
@pytest.fixture
def route(direct_vm,direct_deploy):
    direct_vm.warp('2026-10-21T00:00:00Z');return direct_deploy(str(FILE))
def publish(c):
    api(c,'publish_graph');c.publish_graph('demo','Campus demonstration','Step-free public passage',json.dumps(NODES),json.dumps(EDGES),60)
def mock(vm,status='OPEN',reason='ACCESSIBLE'):
    vm.mock_web('.*',{'status':200,'body':BODY});vm.mock_llm('.*',json.dumps({'status':status,'reason':reason,'citations':[{'source':0,'quote':'The library east entrance has a step-free ramp.'}]}))

def test_owner_and_immutable_graph(route,direct_vm,direct_bob):
    publish(route)
    with pytest.raises(Exception,match='already locked'):publish(route)
    direct_vm.sender=direct_bob
    with pytest.raises(Exception,match='owner'):route.publish_graph('other','x','x',json.dumps(NODES),json.dumps(EDGES),60)

def test_shortest_fresh_evidence_route(route,direct_vm):
    publish(route);mock(direct_vm)
    for edge in ['ac','ab','bc']:route.assess_edge('demo',edge)
    assert direct_vm.run_validator() is True
    result=json.loads(route.find_route('demo','A','C'))
    assert result['outcome']=='EVIDENCE_PATH' and result['minutes']==5 and result['edge_ids']==['ab','bc']
    assert result['valid_until']==1792540860 and len(result['evidence'])==2

def test_expiry_excludes_edges_and_refresh_appends(route,direct_vm):
    publish(route);mock(direct_vm);route.assess_edge('demo','ac')
    with pytest.raises(Exception,match='fresh'):route.assess_edge('demo','ac')
    direct_vm.warp('2026-10-21T00:01:00Z')
    assert json.loads(route.find_route('demo','A','C'))['outcome']=='NO_EVIDENCE_PATH'
    route.assess_edge('demo','ac')
    assert len(json.loads(route.get_edge('demo','ac'))['assessments'])==2
    assert json.loads(route.find_route('demo','A','C'))['minutes']==9

def test_closed_and_unknown_edges_never_form_a_route(route,direct_vm):
    publish(route);mock(direct_vm,'CLOSED','RESTRICTION');route.assess_edge('demo','ac')
    direct_vm.clear_mocks();mock(direct_vm,'UNKNOWN','INSUFFICIENT_EVIDENCE');route.assess_edge('demo','ab')
    assert json.loads(route.find_route('demo','A','C'))['outcome']=='NO_EVIDENCE_PATH'

def test_missing_source_is_unknown(route,direct_vm):
    publish(route);direct_vm.mock_web('.*',{'status':404,'body':'missing'});route.assess_edge('demo','ac')
    assert json.loads(route.get_edge('demo','ac'))['assessments'][0]['reason']=='SOURCE_UNAVAILABLE'

def test_validator_rejects_forged_open_and_quote(route,direct_vm):
    publish(route);mock(direct_vm);route.assess_edge('demo','ac')
    packet=json.loads(route.get_edge('demo','ac'))['assessments'][0]['assessment']
    packet['citations'][0]['quote']='Invented ramp access assurance.'
    assert direct_vm.run_validator(leader_result=packet) is False
    direct_vm.clear_mocks();mock(direct_vm,'CLOSED','RESTRICTION');assert direct_vm.run_validator() is False

def test_invalid_topology_and_weight_rejected(route):
    api(route,'publish_graph')
    for bad in [dict(EDGES[0],minutes=0),dict(EDGES[0],to='missing')]:
        with pytest.raises(Exception):route.publish_graph('bad','x','x',json.dumps(NODES),json.dumps([bad]),60)

def test_equal_cost_paths_use_edge_identifier_tie_break(route,direct_vm):
    api(route,'publish_graph');edges=[dict(EDGES[2],id='z',minutes=5),EDGES[0],EDGES[1]]
    route.publish_graph('demo','x','x',json.dumps(NODES),json.dumps(edges),60);mock(direct_vm)
    for edge in ['z','ab','bc']:route.assess_edge('demo',edge)
    assert json.loads(route.find_route('demo','A','C'))['edge_ids']==['ab','bc']

def test_validator_rejects_a_changed_document_even_same_label(route,direct_vm):
    publish(route);mock(direct_vm);route.assess_edge('demo','ac');direct_vm.clear_mocks()
    direct_vm.mock_web('.*',{'status':200,'body':BODY+' Changed snapshot.'})
    direct_vm.mock_llm('.*',json.dumps({'status':'OPEN','reason':'ACCESSIBLE','citations':[{'source':0,'quote':'The library east entrance has a step-free ramp.'}]}))
    assert direct_vm.run_validator() is False

def test_malformed_model_never_enables_an_edge(route,direct_vm):
    publish(route);direct_vm.mock_web('.*',{'status':200,'body':BODY});direct_vm.mock_llm('.*','{"status":"OPEN","reason":"ACCESSIBLE","citations":[],"minutes":1}')
    route.assess_edge('demo','ac')
    record=json.loads(route.get_edge('demo','ac'))['assessments'][0]
    assert record['reason']=='MODEL_INVALID'
    assert json.loads(route.find_route('demo','A','C'))['outcome']=='NO_EVIDENCE_PATH'

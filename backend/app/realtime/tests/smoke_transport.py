from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.api.v1.live import router, ws_router, get_live_service
from app.core.security import create_access_token
from types import SimpleNamespace
from time import perf_counter

users = {
 'teacher': {'id':'teacher','full_name':'Teacher','role':'teacher','is_active':True},
 'student': {'id':'student','full_name':'Student','role':'student','is_active':True},
}
class Store:
 async def get_user(self, user_id): return users.get(user_id)
app = FastAPI()
app.include_router(router,prefix='/api')
app.include_router(ws_router)
app.state.data_store=Store()
tokens={key:create_access_token({'sub':key}) for key in users}
headers={key:{'Authorization':'Bearer '+token} for key,token in tokens.items()}
body={'title':'Endpoint smoke','questions':[{'question':'2+2?','options':['3','4'],'correct_answer':1,'time_limit_seconds':30}]}
with TestClient(app) as client:
 assert client.post('/api/live/sessions',json=body).status_code==401
 assert client.post('/api/live/sessions',json=body,headers=headers['student']).status_code==403
 created=client.post('/api/live/sessions',json=body,headers=headers['teacher'])
 assert created.status_code==201, created.text
 code=created.json()['room_code']
 with client.websocket_connect('/ws/live/'+code) as host:
  host.send_json({'type':'authenticate','token':tokens['teacher']})
  assert host.receive_json()['session']['is_host']
  with client.websocket_connect('/ws/live/'+code) as student:
   student.send_json({'type':'authenticate','token':tokens['student']})
   state=student.receive_json()['session']
   assert state['participant_count']==1
   assert host.receive_json()['session']['participant_count']==1
   started=perf_counter()
   host.send_json({'type':'advance'})
   assert host.receive_json()['session']['status']=='active'
   active=student.receive_json()['session']
   assert perf_counter()-started<1
   qid=active['question']['id']
   assert 'correct_answer' not in str(active)
   student.send_json({'type':'answer','question_id':qid,'answer':1})
   assert host.receive_json()['session']['leaderboard'][0]['score']==1000
   assert student.receive_json()['session']['submitted_answer']==1
   assert student.receive_json()['type']=='answer_accepted'
   student.send_json({'type':'answer','question_id':qid,'answer':0})
   assert student.receive_json()['code']=='already_answered'
  with client.websocket_connect('/ws/live/'+code) as student:
   student.send_json({'type':'authenticate','token':tokens['student']})
   restored=student.receive_json()['session']
   assert restored['submitted_answer']==1
   assert restored['leaderboard'][0]['score']==1000
   host.receive_json()
  with client.websocket_connect('/ws/live/'+code) as invalid:
   invalid.send_bytes(b'bad')
   assert invalid.receive_json()['code']=='invalid_message'
 with client.websocket_connect('/ws/notifications') as stream:
  stream.send_json({'type':'authenticate','token':tokens['student']})
  assert stream.receive_json()['type']=='notifications'
  service=app.state.live_quiz_service
  client.portal.call(service.notifications.publish,['student'],'marks_released','Marks ready','Your marks are available.')
  assert stream.receive_json()['notification']['event']=='marks_released'
  stream.send_json({'type':'publish','message':'spoofed'})
  assert stream.receive_json()['code']=='read_only_stream'
print('PASS: real JWT HTTP role checks, WS question push <1s, answers, leaderboard, reconnect, binary rejection, private notifications.')

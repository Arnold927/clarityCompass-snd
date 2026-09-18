import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

User = get_user_model()

class DecisionConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'You are now connected!'
        }))
        
    async def disconnect(self, close_code):
        pass
    
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get('action')
            
            if action == 'subscribe_decision':
                decision_id = data.get('decision_id')
                await self.send(text_data=json.dumps({
                    'type': 'subscription_confirmed',
                    'decision_id': decision_id,
                    'message': f'Subscribed to decision {decision_id} updates'
                }))
            elif action == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'message': 'pong'
                }))
            else:
                await self.send(text_data=json.dumps({
                    'type': 'echo',
                    'message': f'Received: {text_data}'
                }))
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Notification channel connected'
        }))
    
    async def disconnect(self, close_code):
        pass
    
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            await self.send(text_data=json.dumps({
                'type': 'echo',
                'message': f'Notification channel: {data}'
            }))
        except json.JSONDecodeError:
            pass
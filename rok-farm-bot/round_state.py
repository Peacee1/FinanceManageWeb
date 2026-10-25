"""Durable per-round completion records; never infer completion from login."""
import json
import time
import uuid
from pathlib import Path


class RoundState:
    def __init__(self, path, signature, clock=time.time):
        self.path = Path(path)
        self.signature = signature
        self.clock = clock
        self.data = None
        if self.path.exists():
            # A broken journal must not silently cause duplicate logins.
            self.data = json.loads(self.path.read_text('utf-8'))
        if self.data is None or self.data.get('signature') != signature:
            self.new_round()

    def save(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.path.with_suffix('.tmp')
        temporary.write_text(json.dumps(self.data, ensure_ascii=False, indent=2), 'utf-8')
        temporary.replace(self.path)

    def new_round(self):
        saved_roster = self.data.get('characters', []) if self.data else []
        self.data = {'round': str(uuid.uuid4()), 'signature': self.signature, 'started': self.clock(),
                     'characters': saved_roster, 'completed': {}, 'attempts': {}, 'cursors': {},
                     'alliance_done': {}, 'next_at': None}
        self.save()

    def roster(self, characters):
        self.data['characters'] = [{'identity': c.identity, 'name': c.name, 'kingdom': c.kingdom} for c in characters]
        self.save()

    def completed(self, identity):
        return identity in self.data['completed']

    def pending(self):
        return [c for c in self.data['characters'] if not self.completed(c['identity'])]

    def finish(self, identity, queue, capacity):
        if queue is None or capacity is None:
            raise ValueError('Cần xác nhận hàng đợi trước khi hoàn tất nhân vật.')
        self.data['completed'][identity] = {'at': self.clock(), 'queue': queue, 'capacity': capacity}
        self.data['attempts'].pop(identity, None)
        self.save()

    def fail(self, identity, error):
        old = self.data['attempts'].get(identity, {})
        self.data['attempts'][identity] = {'count': old.get('count', 0)+1, 'error': str(error)}
        self.save()

    def schedule(self, hours):
        if not self.data['characters'] or self.pending():
            raise ValueError('Còn nhân vật chưa hoàn tất, chưa lên lịch vòng tiếp theo.')
        if self.data['next_at'] is None or self.data.get('repeat_hours') != hours:
            ended = max(self.data['completed'][c['identity']]['at'] for c in self.data['characters'])
            self.data['next_at'] = ended+hours*3600
            self.data['repeat_hours'] = hours
            self.save()
        return self.data['next_at']

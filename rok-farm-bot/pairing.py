"""Read only the explicit fleet pairing schema; never log its token."""
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from uuid import UUID


def load_pairing(path):
    value = json.loads(Path(path).read_text('utf-8-sig'))
    if not isinstance(value, dict):
        raise ValueError('JSON ghép nối phải là object.')
    server = value.get('server', '').rstrip('/')
    parsed = urlparse(server)
    if (parsed.scheme != 'https' or parsed.hostname != 'rokbot.peacee1.io.vn'
            or parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment
            or parsed.port not in (None, 443)):
        raise ValueError('Địa chỉ server trong JSON ghép nối không hợp lệ.')
    bot_id = str(UUID(value.get('botId', '')))
    token = value.get('token', '')
    if not isinstance(token, str) or not re.fullmatch(r'[a-f0-9]{64}', token):
        raise ValueError('Token trong JSON ghép nối không hợp lệ.')
    return {'server': server, 'botId': bot_id, 'token': token}

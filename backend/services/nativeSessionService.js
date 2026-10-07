const { randomBytes, randomUUID, createHash, createHmac } = require('node:crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const IDLE_DAYS = 180;
const hashToken = token => createHash('sha256').update(token).digest('hex');
const isToken = token => typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token);
const nextToken = token => createHmac('sha256', process.env.JWT_SECRET).update('native-refresh-v1:' + token).digest('base64url');
const userInfo = user => ({ id: user.id, name: user.name, email: user.email, role: user.role || 'owner', plan: user.plan, mustChangePassword: user.must_change_password || false });
const accessToken = user => jwt.sign({userId:user.id,role:user.role || 'owner',sv:user.session_version || 0},process.env.JWT_SECRET,{expiresIn:'1d',algorithm:'HS256'});

async function createNativeSession(user) {
  const token = randomBytes(32).toString('base64url');
  await db.query(`INSERT INTO native_sessions(id,user_id,session_version,token_hash,expires_at)
    VALUES($1,$2,$3,$4,now()+$5*interval '1 day')`,[randomUUID(),user.id,user.session_version || 0,hashToken(token),IDLE_DAYS]);
  return token;
}

async function refreshNativeSession(token) {
  if (!isToken(token)) return null;
  return db.transaction(async client => {
    const hash = hashToken(token);
    const row = (await client.query(`SELECT * FROM native_sessions WHERE token_hash=$1 OR previous_hash=$1 FOR UPDATE`,[hash])).rows[0];
    if (!row || row.revoked_at || new Date(row.expires_at).getTime() <= Date.now()) return null;
    const user = (await client.query('SELECT id,name,email,role,plan,must_change_password,is_active,session_version FROM users WHERE id=$1',[row.user_id])).rows[0];
    if (!user || user.is_active === false || (user.session_version || 0) !== row.session_version) {
      await client.query('UPDATE native_sessions SET revoked_at=now() WHERE id=$1',[row.id]);
      return null;
    }
    const successor = nextToken(token);
    if (hash === row.previous_hash) {
      // A lost response or concurrent request can retry the same rotation for
      // 30 seconds. The successor is deterministic and only its hash is stored.
      if (new Date(row.previous_valid_until).getTime() <= Date.now() || hashToken(successor) !== row.token_hash) {
        await client.query('UPDATE native_sessions SET revoked_at=now() WHERE id=$1',[row.id]);
        return null;
      }
    } else {
      await client.query(`UPDATE native_sessions SET previous_hash=token_hash,previous_valid_until=now()+interval '30 seconds',
        token_hash=$2,refreshed_at=now(),expires_at=now()+$3*interval '1 day' WHERE id=$1`,[row.id,hashToken(successor),IDLE_DAYS]);
    }
    return { token:accessToken(user), refreshToken:successor, user:userInfo(user) };
  });
}

async function revokeNativeSession(token) {
  if (!isToken(token)) return;
  await db.query('UPDATE native_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE token_hash=$1 OR previous_hash=$1',[hashToken(token)]);
}
module.exports = { createNativeSession,refreshNativeSession,revokeNativeSession,hashToken,isToken,nextToken };

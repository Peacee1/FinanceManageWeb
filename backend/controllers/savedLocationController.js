const db = require('../config/db');
const list = async (req,res,next) => {
  try { res.json((await db.query('SELECT id,name,lat,lng FROM saved_locations WHERE user_id=$1 ORDER BY updated_at DESC,id DESC',[req.user.userId])).rows); }
  catch(error) { next(error); }
};
const save = async (req,res,next) => {
  const {name,lat,lng} = req.body || {};
  if(typeof name!=='string' || !name.trim() || name.trim().length>100 || !Number.isFinite(lat) || Math.abs(lat)>90 || !Number.isFinite(lng) || Math.abs(lng)>180) return res.status(400).json({message:'Nhập tên địa điểm và tọa độ hợp lệ.'});
  try {
    const result=await db.transaction(async client=>{
      await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[req.user.userId]);
      const existing=await client.query('SELECT id FROM saved_locations WHERE user_id=$1 AND name=$2',[req.user.userId,name.trim()]);
      if(!existing.rowCount && (await client.query('SELECT count(*)::int AS count FROM saved_locations WHERE user_id=$1',[req.user.userId])).rows[0].count>=50) return null;
      return (await client.query(`INSERT INTO saved_locations(user_id,name,lat,lng) VALUES($1,$2,$3,$4)
        ON CONFLICT(user_id,name) DO UPDATE SET lat=EXCLUDED.lat,lng=EXCLUDED.lng,updated_at=now() RETURNING id,name,lat,lng`,[req.user.userId,name.trim(),lat,lng])).rows[0];
    });
    if(!result) return res.status(400).json({message:'Bạn đã lưu 50 địa điểm. Hãy xóa một địa điểm trước khi thêm.'});
    res.json(result);
  } catch(error) { next(error); }
};
const remove = async (req,res,next) => {
  if(!/^[1-9][0-9]{0,9}$/.test(req.params.id) || Number(req.params.id)>2147483647) return res.status(400).json({message:'Địa điểm không hợp lệ.'});
  try {
    const result=await db.query('DELETE FROM saved_locations WHERE id=$1 AND user_id=$2 RETURNING id',[req.params.id,req.user.userId]);
    if(!result.rowCount) return res.status(404).json({message:'Không tìm thấy địa điểm.'});
    res.json({message:'Đã xóa địa điểm đã lưu.'});
  } catch(error) { next(error); }
};
module.exports={list,save,remove};

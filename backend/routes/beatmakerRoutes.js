const express = require('express');
const db = require('../config/db');
const { protect } = require('../middleware/authMiddleware');
const { validateProject } = require('../utils/beatProject');
const router = express.Router();
router.use(protect);
router.get('/project', async (req,res,next) => {
 try { const result = await db.query('SELECT project,revision,updated_at FROM beat_projects WHERE user_id=$1',[req.user.userId]);res.json(result.rows[0] || {project:null,revision:0}); } catch(error){next(error);}
});
router.put('/project', async (req,res,next) => {
 const {project,revision}=req.body || {};
 if (!validateProject(project) || !Number.isSafeInteger(revision) || revision<0) return res.status(400).json({message:'Dự án beat không hợp lệ.'});
 try {
  let result;
  if(revision===0) result=await db.query('INSERT INTO beat_projects(user_id,project) VALUES($1,$2) ON CONFLICT(user_id) DO NOTHING RETURNING revision,updated_at',[req.user.userId,JSON.stringify(project)]);
  else result=await db.query('UPDATE beat_projects SET project=$1,revision=revision+1,updated_at=now() WHERE user_id=$2 AND revision=$3 RETURNING revision,updated_at',[JSON.stringify(project),req.user.userId,revision]);
  if(!result.rows.length)return res.status(409).json({message:'Dự án đã được lưu ở tab khác. Tải lại trang trước khi lưu tiếp.'});
  res.json(result.rows[0]);
 } catch(error){next(error);}
});
module.exports=router;

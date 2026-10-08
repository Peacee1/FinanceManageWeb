const express = require('express');
const db = require('../config/db');
const { protect } = require('../middleware/authMiddleware');
const { validateProject } = require('../utils/beatProject');
const router = express.Router();
router.use(protect);
router.get('/projects', async(req,res,next)=>{
 try{res.json((await db.query("SELECT id,project->>'name' AS name,revision,updated_at FROM beatmaker_projects WHERE user_id=$1 ORDER BY updated_at DESC,id DESC",[req.user.userId])).rows);}catch(error){next(error);}
});
router.post('/projects', async(req,res,next)=>{
 const project=req.body?.project;
 if(!validateProject(project))return res.status(400).json({message:'Dự án beat không hợp lệ.'});
 try{const result=await db.query('INSERT INTO beatmaker_projects(user_id,project) VALUES($1,$2) RETURNING id,project,revision,updated_at',[req.user.userId,JSON.stringify(project)]);res.status(201).json(result.rows[0]);}catch(error){next(error);}
});
router.use('/projects/:id',(req,res,next)=>{
 if(!/^[1-9]\d{0,18}$/.test(req.params.id))return res.status(400).json({message:'Dự án không hợp lệ.'});next();
});
router.get('/projects/:id',async(req,res,next)=>{
 try{const result=await db.query('SELECT id,project,revision,updated_at FROM beatmaker_projects WHERE id=$1 AND user_id=$2',[req.params.id,req.user.userId]);if(!result.rows.length)return res.status(404).json({message:'Không tìm thấy dự án.'});res.json(result.rows[0]);}catch(error){next(error);}
});
router.put('/projects/:id',async(req,res,next)=>{
 const {project,revision}=req.body||{};
 if(!validateProject(project)||!Number.isSafeInteger(revision)||revision<1)return res.status(400).json({message:'Dự án beat không hợp lệ.'});
 try{const result=await db.query('UPDATE beatmaker_projects SET project=$1,revision=revision+1,updated_at=now() WHERE id=$2 AND user_id=$3 AND revision=$4 RETURNING id,revision,updated_at',[JSON.stringify(project),req.params.id,req.user.userId,revision]);if(!result.rows.length)return res.status(409).json({message:'Dự án không khả dụng hoặc đã được lưu ở tab khác. Tải lại trang trước khi lưu tiếp.'});res.json(result.rows[0]);}catch(error){next(error);}
});
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

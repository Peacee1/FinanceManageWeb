function roomMode(value,plan){const mode=value??'2d';if(!['2d','3d'].includes(mode))throw Object.assign(Error('Chế độ phòng không hợp lệ.'),{status:400});if(mode==='3d'&&plan!=='ultra')throw Object.assign(Error('Chỉ tài khoản Ultra được tạo phòng 3D.'),{status:403});return mode;}
module.exports={roomMode};

function requireHost(state,userId){
 if(state.host!==userId)throw Object.assign(new Error('Chỉ chủ phòng được giải tán phòng.'),{status:403});
}
module.exports={requireHost};

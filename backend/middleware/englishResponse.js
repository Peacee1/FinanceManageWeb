const messages = new Map([
 ['Vui lòng nhập đầy đủ thông tin.','Please complete all required fields'],['Vui long nhap day du thong tin.','Please complete all required fields'],
 ['Thong tin dang nhap khong dung.','Incorrect email or password'],['Thông tin đăng nhập không đúng.','Incorrect email or password'],
 ['Mật khẩu không đạt yêu cầu bảo mật.','Use at least 8 characters, including uppercase and lowercase letters, a number and a symbol'],
 ['Email đã được sử dụng.','This email address is already in use'],['Đã tạo tài khoản. Bạn có thể đăng nhập ngay.','Account created. You can now sign in'],
 ['Dang nhap thanh cong.','Signed in successfully'],['Lỗi server.','Something went wrong. Please try again'],['Loi server.','Something went wrong. Please try again'],
 ['Yêu cầu không hợp lệ.','Invalid request'],['Quá nhiều yêu cầu. Vui lòng thử lại sau.','Too many requests. Please try again later'],
 ['Vui lòng đăng nhập.','Please sign in'],['Phiên đăng nhập không hợp lệ hoặc đã hết hạn.','Your session has expired. Please sign in again'],['Tài khoản không còn tồn tại.','This account is no longer available'],['Vui lòng đổi mật khẩu trước khi tiếp tục.','Please change your password before continuing'],
 ['Nhập email hợp lệ.','Enter a valid email address'],['Vui lòng chờ ít nhất 5 phút trước khi yêu cầu mã mới.','Please wait at least 5 minutes before requesting another code'],
 ['Dịch vụ gửi mã chưa được cấu hình. Vui lòng thử lại sau.','Verification email is unavailable. Please try again later'],
 ['Bạn cần xác thực email trước khi yêu cầu đặt lại mật khẩu.','Verify your email before resetting your password'],
 ['Nếu email phù hợp với tài khoản, mã sẽ được gửi. Kiểm tra cả thư rác.','If this email matches an account, a code will be sent. Check your spam folder too'],
 ['Mã không đúng, đã hết hạn hoặc đã sử dụng.','This code is incorrect, expired or has already been used'],
 ['Đã xác thực email. Hãy đặt mật khẩu mới.','Email verified. Set your new password'],['Đã xác thực email. Bạn có thể đăng nhập.','Email verified. You can now sign in'],
 ['Mật khẩu cần ít nhất 8 ký tự, chữ hoa, chữ thường, số và ký tự đặc biệt.','Use at least 8 characters, including uppercase and lowercase letters, a number and a symbol'],
 ['Mật khẩu cần ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.','Use at least 8 characters, including uppercase and lowercase letters, a number and a symbol'],
 ['Nhập mật khẩu hiện tại và mật khẩu mới hợp lệ (ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt).','Enter your current password and a new password with at least 8 characters, uppercase and lowercase letters, a number and a symbol'],
 ['Mật khẩu hiện tại không đúng.','Your current password is incorrect'],['Đã đổi mật khẩu. Vui lòng đăng nhập lại.','Password changed. Please sign in again'],['Doi mat khau thanh cong.','Password changed successfully'],
 ['Đã lưu email. Hãy xác thực để hoàn tất.','Email saved. Verify your email to finish'],['Đã lưu email.','Email saved'],
 ['Vui lòng hoàn tất xác minh bảo mật.','Please complete the security verification'],['Xác minh bảo mật không hợp lệ. Vui lòng thử lại.','Security verification failed. Please try again']
]);
function englishResponse(req,res,next) {
  if(!/^en(?:[-,;\s]|$)/i.test(req.headers['accept-language']||''))return next();
  res.setHeader('Content-Language','en');
  const send=res.json;
  res.json=function(body){
    if(body&&typeof body==='object'&&!Array.isArray(body)&&typeof body.message==='string'){
      const fallback=res.statusCode===429?'Too many requests. Please try again later':res.statusCode>=500?'This service is temporarily unavailable. Please try again':res.statusCode>=400?'Unable to complete your request. Please check your details and try again':'Your request was completed';
      const translated=messages.get(body.message)||(/[À-ỹĐđ]/u.test(body.message)?fallback:body.message);
      body={...body,message:translated};
    }
    return send.call(this,body);
  };
  next();
}
module.exports=englishResponse;

(function(global){
const reminder='Bật Không làm phiền và nhớ cắm sạc để phiên tập trung không bị gián đoạn.';
const quotes=`Chỉ một việc thôi. Dành trọn tâm trí cho điều đang làm.
Không cần vội. Mỗi phút tập trung đều là một bước tiến.
Để những điều khác chờ một chút. Đây là thời gian của bạn.
Một bước nhỏ, làm thật trọn vẹn.
Hít thở nhẹ. Quay lại với việc trước mắt.
Sự đều đặn tạo nên những thay đổi lớn.
Bạn không cần làm tất cả ngay lúc này.
Hoàn thành bước hiện tại trước khi nghĩ đến bước tiếp theo.
Dành sự chú ý cho điều bạn có thể làm ngay bây giờ.
Tiến chậm vẫn là đang tiến về phía trước.
Mỗi lần quay lại với công việc là một lần rèn sự tập trung.
Một khoảng yên tĩnh có thể mở ra một ý tưởng mới.
Làm ít việc hơn, nhưng dành cho chúng nhiều chú ý hơn.
Bạn đang dành thời gian cho điều có ý nghĩa với mình.
Chưa hoàn hảo cũng không sao. Hãy tiếp tục từng chút một.
Đặt những lo lắng sang bên, trở về với bước đang làm.
Một việc làm trọn vẹn đáng giá hơn nhiều việc dang dở.
Hãy để sự kiên nhẫn dẫn đường cho bạn.
Chú ý vào quá trình, từng kết quả sẽ dần xuất hiện.
Bạn đã bắt đầu. Giờ chỉ cần tiếp tục.
Không cần chạy theo mọi suy nghĩ vừa xuất hiện.
Giữ nhịp làm việc vừa sức để có thể đi xa hơn.
Mỗi phút hiện tại là cơ hội để quay về với mục tiêu.
Hãy làm phần việc nhỏ nhất mà bạn có thể hoàn thành.
Tạm gác thông báo. Điều trước mắt xứng đáng được chú ý.
Một tâm trí bình tĩnh giúp bạn nhìn rõ bước tiếp theo.
Không cần nhanh hơn người khác, hãy giữ nhịp của mình.
Dành trọn vài phút cho một việc, bạn sẽ thấy khác biệt.
Việc lớn thường được xây từ nhiều lần cố gắng nhỏ.
Cho bản thân đủ thời gian để hiểu điều đang làm.
Nếu mất tập trung, hãy nhẹ nhàng bắt đầu lại.
Trở lại với công việc mà không trách móc bản thân.
Chỉ cần tốt hơn một chút so với lúc bạn bắt đầu.
Một khoảng tập trung hôm nay là món quà cho ngày mai.
Giữ sự tò mò với điều bạn đang học.
Làm rõ một ý trước khi chuyển sang ý khác.
Để đôi tay bắt đầu, ý tưởng sẽ dần theo sau.
Tiến độ không phải lúc nào cũng dễ nhận thấy.
Sự chú ý của bạn là nguồn lực đáng được giữ gìn.
Từng dòng viết, từng bước làm đều góp phần tạo kết quả.
Dành sự tử tế cho chính mình trong lúc cố gắng.
Một lần hoàn thành nhỏ có thể tạo đà cho việc tiếp theo.
Bạn được phép làm việc với nhịp độ bình tĩnh.
Đừng đo cả hành trình bằng một phút khó khăn.
Tập trung vào điều quan trọng, không chỉ điều thúc giục.
Nếu thấy rối, hãy hỏi: bước tiếp theo là gì?
Một mục tiêu rõ ràng giúp mỗi phút có hướng đi.
Bạn đang xây thói quen bằng chính phiên tập trung này.
Cứ làm từng phần, công việc sẽ nhẹ hơn.
Khởi đầu chưa trôi chảy vẫn có thể dẫn đến kết quả tốt.
Để khoảng yên giúp bạn nghe rõ suy nghĩ của mình.
Giữ ánh nhìn ở việc đang làm, không phải mọi việc còn lại.
Không cần cảm hứng hoàn hảo để tiếp tục.
Kiên trì bắt đầu bằng việc ở lại thêm một chút.
Hoàn thành một bước, hãy ghi nhận nỗ lực của mình.
Bạn đang dành chỗ cho điều mình muốn làm tốt.
Chậm lại một nhịp để làm rõ điều cốt lõi.
Tập trung là quay lại với điều mình đã chọn.
Hãy hiện diện trọn vẹn với công việc trước mắt.
Hết phiên, hãy nghỉ ngơi và ghi nhận những gì đã làm.`.split('\n');
let quiet=false,enabled=false,text=reminder;
function message(elapsed){return elapsed<300?reminder:quotes[(Math.floor(elapsed/300)-1)%quotes.length];}
function layout(width,height){const landscape=width>height,size=Math.min(width*.7,height*(landscape?.5:.62),360);return {size,x:(width-size)/2,y:height*(landscape?.42:.5)-size/2};}
function position(){const dial=document.querySelector('body>.focus-dial');if(!dial)return;const box=layout(innerWidth,innerHeight);Object.assign(dial.style,{left:box.x+'px',top:box.y+'px',width:box.size+'px',height:box.size+'px',transform:'none'});document.documentElement.style.setProperty('--quiet-size',box.size+'px');document.documentElement.style.setProperty('--quiet-center',innerHeight*(innerWidth>innerHeight?.42:.5)+'px');}
function place(){let node=document.getElementById('focus-quote');if(!enabled){node?.remove();return;}if(!node){node=document.createElement('p');node.id='focus-quote';}if(node.textContent!==text)node.textContent=text;if(quiet){if(node.parentElement!==document.body)document.body.appendChild(node);}else{const dial=document.querySelector('.focus-card .focus-dial');if(dial&&node.previousElementSibling!==dial)dial.after(node);}}
function sync(active,elapsed){enabled=active;text=message(Math.max(0,elapsed));place();}
function active(value){quiet=value;place();if(value)position();}
function notify(isFocus){global.ReactNativeWebView?.postMessage(JSON.stringify({type:'task-focus',active:isFocus}));}
global.addEventListener('resize',()=>{if(document.body.classList.contains('focus-idle')||document.body.classList.contains('focus-fading'))position();});
global.FocusPresentation={layout,active,notify,sync,message,quotes,reminder};
})(window);

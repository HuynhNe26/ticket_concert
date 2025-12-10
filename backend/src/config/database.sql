CREATE TABLE members (
    member_id SERIAL PRIMARY KEY,
    membership VARCHAR(50),
    member_point INT
)

INSERT INTO members (membership, member_point) VALUES 
("Đồng", 10),
("Bạc", 500),
("Vàng", 1200),
("Kim Cương", 2000)

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    fullName VARCHAR(255) NOT NULL,
    birthOfDay DATE NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    phoneNumber VARCHAR(11) NOT NULL,
    gender VARCHAR(10) NOT NULL,
    point INT DEFAULT 10 NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50),
    login_time TIMESTAMP,
    logout_time TIMESTAMP,
    member_id INT NOT NULL,
    CONSTRAINT fk_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
)

INSERT INTO users 
(fullName, birthOfDay, email, password, phoneNumber, gender, status, member_id)
VALUES
('Nguyễn Văn A', '2002-09-12', 'nguyenvana@gmail.com', '123456', '0123456789', 'Nam', 'Tài khoản mới', 1)

CREATE TABLE admins (
    admin_id SERIAL PRIMARY KEY,
    fullName VARCHAR(255) NOT NULL,
    birthOfDay DATE NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    phoneNumber VARCHAR(11) NOT NULL,
    gender VARCHAR(10) NOT NULL,
    address VARCHAR(255) NOT NULL,
    level INT NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50),
    login_time TIMESTAMP,
    logout_time TIMESTAMP,
)

INSERT INTO admins 
(fullName, birthOfDay, email, password, phoneNumber, gender, address, level, role, status)
VALUES
('Nguyễn Hoàng Huynh', '2005-08-26', 'hoanghuynh@gmail.com', '123456', '0937569205', 'Nam', "1322/768, Tổ 5, Khu Phố Ông Hường, Phường Trảng Dài, Tỉnh Đồng Nai", 1, "Quản trị viên cấp cao", "Tài khoản mới"),
('Trần Diệp Anh Kiệt', '2005-01-01', 'anhkiet@gmail.com', '123456', '0123456789', 'Nam', "TP. Hồ Chí Minh", 1, "Quản trị viên cấp cao", "Tài khoản mới"),
('Phùng Minh Vũ', '2005-01-01', 'minhvu@gmail.com', '123456', '0123456789', 'Nam', "TP. Hồ Chí Minh", 1, "Quản trị viên cấp cao", "Tài khoản mới");

CREATE TABLE events (
    event_id SERIAL PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    event_description TEXT NOT NULL,
    event_location VARCHAR(255) NOT NULL,
    event_age INT NOT NULL,
    banner_url VARCHAR(255) NOT NULL,
    event_layout VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    event_start TIMESTAMP NOT NULL,
    event_end TIMESTAMP NOT NULL,
    event_status BOOLEAN DEFAULT 0
)

INSERT INTO events (event_name, event_description, event_location, event_age, banner_url, event_layout, event_start)
VALUES
('ANH TRAI "SAY HI" 2025 CONCERT', 'I. ĐIỀU KIỆN VÀ ĐIỀU KHOẢN MUA VÉ:
●      Khi mua vé, tức là người mua đã đồng ý với các Điều Kiện và Điều Khoản của BTC và Quy Định Tham Gia Chương Trình được ghi rõ tại ticketbox.vn.

●      Ticketbox là đơn vị phân phối vé độc quyền của sự kiện:

Anh Trai “Say Hi” 2025 Concert. Diễn ra vào ngày 27.12.2025 tại Khu Đô Thị Vạn Phúc

Ticketbox chịu trách nhiệm giải quyết các vấn đề phát sinh liên quan đến vé mua và vé tặng thông qua hệ thống Ticketbox (bao gồm tính năng “Tặng vé” trên ứng dụng). Ticketbox không chịu trách nhiệm và có quyền từ chối giải quyết các tranh chấp liên quan đến việc trao tặng, chuyển nhượng giữa các bên ngoài hệ thống Ticketbox.

●      Mỗi tài khoản được mua tối đa mười (10) Vé. Một (1) Mã Vé có giá trị sử dụng cho một (1) người và một (1) lần duy nhất.

●      Quy định về độ tuổi:

- Khu vực đứng (các hạng vé SUPERFAN, FANZONE, GA) dành cho Người Tham Dự từ đủ 14 tuổi.

- Khu vực khán đài ngồi (các hạng vé SKY LOUNGE, SVIP, VIP, CAT) dành cho Người Tham Dự từ đủ 08 tuổi.

- Người Tham Dự từ 08 đến dưới 18 tuổi phải mang giấy tờ tùy thân (căn cước công dân, khai sinh,...bản photocopy hoặc hình ảnh) và có người thân (trên 21 tuổi) đi cùng hạng vé  bảo lãnh trong suốt thời gian diễn ra chương trình. Một người thân được phép bảo lãnh tối đa 2 người.

- Người bảo lãnh cam kết chịu hoàn toàn trách nhiệm về việc:

+      Đảm bảo phòng ngừa, ngăn chặn người được bảo lãnh sử dụng các chất kích thích, rượu bia, thuốc lá, chất cháy nổ và các sản phẩm bị cấm theo Quy định tham gia chương trình;

+      Chăm sóc, bảo vệ quyền, lợi ích hợp pháp của Người được bảo lãnh; chịu trách nhiệm chăm sóc y tế hoặc chi trả chi phí chăm sóc y tế cho Người được bảo lãnh hoặc người bị tổn hại sức khỏe do Người được bảo lãnh gây ra trong suốt thời gian bảo lãnh.

- Người Tham Dự đi cùng người từ đủ 8 tuổi đến dưới 18 tuổi vui lòng tải và điền đầy đủ thông tin vào Đơn Bảo Lãnh trước khi đến check-in tại sự kiện. Ban Tổ Chức sẽ kiểm tra và xác nhận đơn tại quầy Thông tin BTC.

https://drive.google.com/file/d/1UFXz2bt4SdKemgw-JqSzjoiDHiYJZDHC/view?usp=sharing

- Trong khu vực SKY LOUNGE, Người bảo lãnh chịu hoàn toàn trách nhiệm đảm bảo người được bảo lãnh không sử dụng thức uống có cồn hoặc bất cứ hành động nào không phù hợp lứa tuổi.

●      Vé đã mua KHÔNG đổi, trả, nâng cấp, hủy hay hoàn tiền trong bất kì trường hợp nào. Vé bị mất KHÔNG được xuất lại.

●      Phụ nữ mang thai và người khuyết tật chỉ được mua vé Khu khán đài ngồi.

●      Người Tham Dự cân nhắc và tự chịu trách nhiệm về sức khỏe khi tham gia Chương Trình.

●      Ban Tổ Chức có quyền điều chỉnh, bổ sung nội dung Quy định tham gia chương trình, Điều Kiện và Điều Khoản nếu xét thấy cần thiết, đảm bảo không trái với nội dung mà Người Tham Dự đã đọc và đồng ý. Khi mua vé Người Tham Dự được hiểu là đã đọc, hiểu và đồng ý với Quy định tham gia chương trình, các Điều Kiện và Điều Khoản  cũng như bất kỳ thay đổi nào sau đó. Trường hợp có bất kỳ thay đổi nào đối với Chương trình, Ban Tổ Chức sẽ cung cấp thông tin tại website ticketbox.vn và trên các phương tiện truyền thông của BTC

●      Người Tham Dự có trách nhiệm theo dõi thông báo chính thức từ Ban Tổ Chức/Ticketbox và kiểm tra lại thông tin vé (ngày, giờ, địa điểm, giá) trong trường hợp có thay đổi trước khi sự kiện diễn ra.

●      Vé chỉ được sử dụng để tham gia Chương trình. Không mua vé cho mục đích kinh doanh và không sử dụng vé cho các hoạt động khuyến mãi của hàng hóa, dịch vụ của người mua. Trong trường hợp vi phạm, BTC có quyền thu hồi vé đã mua và không hoàn lại tiền, không cho phép tham dự chương trình bằng những vé này và yêu cầu bồi thường thiệt hại. Quy định này không áp dụng đối với các tổ chức, cá nhân đã đạt được thỏa thuận bằng văn bản với Công ty cổ phần Vie Channel về việc sử dụng vé để khuyến mãi.

●      Trong mọi trường hợp, quyết định của BTC là quyết định cuối cùng.

II. QUY ĐỊNH CHECK IN:

●      Người Tham Dự làm thủ tục check-in đúng khu vực do BTC quy định.

●      Chỉ chấp nhận cho phép người đầu tiên quét mã Vé Sự Kiện được tham dự Chương trình và không giải quyết trường hợp có nhiều hơn một (1) Người Tham Dự check-in cùng một (1) mã vé.

●      Người Tham Dự chịu trách nhiệm bảo mật thông tin mã vé. Người Tham Dự check-in đúng mã vé của mình. BTC không chấp nhận cho Người Tham Dự check-in hộ người thân đi cùng.

●      Khi làm thủ tục check-in, Người Tham Dự sau khi quét mã QR code thành công sẽ nhận được vòng đeo tay và quà tặng tương ứng hạng vé đã mua.

●      Điều kiện hợp lệ tham gia Chương trình: (1) Đeo đúng vòng tay theo khu vực trong suốt Chương trình (còn nguyên vẹn) và (2) Xuất trình Vé Sự Kiện khi được BTC yêu cầu bất kỳ lúc nào. Người Tham Dự không được phép vào khu vực sự kiện nếu không thực hiện đủ hai điều kiện đã đề cập trên.

●      BTC chỉ cấp một (1) vòng tay duy nhất cho một (1) vé, Người Tham Dự chịu trách nhiệm bảo quản cẩn thận.

●      Người Tham Dự không được phép chuyển nhượng Vé Điện Tử hoặc Mã Vé Điện Tử ngoài tính năng “Tặng vé” chính thức trên Ticketbox. Vòng Đeo Tay được cấp phát tại sự kiện sau khi quét mã hợp lệ, không được phép chuyển nhượng cho người khác sử dụng để ra/vào sự kiện. Trường hợp BTC phát hiện, Người Tham Dự không được phép tiếp tục tham gia Chương Trình.

●      BTC có quyền từ chối và không hoàn lại tiền vé trong trường hợp Người Tham Dự check-in chưa đủ tuổi, say xỉn, hoặc trong trạng thái mất kiểm soát hay vi phạm bất kỳ quy định nào trong Quy định tham gia Chương trình này.

Các mốc thời gian check-in:

·       Từ 11:30 -  Bắt đầu xếp hàng vào line check-in

·       Từ 12:00 - 19:00 - Thời gian check-in

·       19:00 - CHƯƠNG TRÌNH BẮT ĐẦU

·       Từ 19:01 đến 19:59 - Làm thủ tục check-in bổ sung, Ban Tổ Chức được quyền thay đổi / sắp xếp lại chỗ đứng / ngồi của Người Tham Dự.

·       Từ 20:00 - Đóng cổng check-in và không hoàn trả lại tiền vé

III. QUY ĐỊNH THAM GIA CHƯƠNG TRÌNH

+ Chương Trình: là chương trình ANH TRAI “SAY HI” 2025 CONCERT

+ Người Tham Dự: là người sở hữu Vé Điện Tử, Mã Vé Điện Tử và đủ điều kiện tham gia Chương Trình

A.  QUY ĐỊNH CHUNG

●      Quy định về độ tuổi:

- Khu vực đứng (các hạng vé SUPERFAN, FANZONE, GA) dành cho Người Tham Dự từ đủ 14 tuổi.

- Khu vực khán đài ngồi (các hạng vé SKY LOUNGE, SVIP, VIP, CAT) dành cho Người Tham Dự từ đủ 08 tuổi.

- Người Tham Dự từ 08 đến dưới 18 tuổi phải mang giấy tờ tùy thân (căn cước công dân, khai sinh,...bản photocopy hoặc hình ảnh) và có người thân (trên 21 tuổi) đi cùng hạng vé  bảo lãnh trong suốt thời gian diễn ra chương trình. Một người thân được phép bảo lãnh tối đa 2 người

- Người bảo lãnh cam kết chịu hoàn toàn trách nhiệm về việc:

+      Đảm bảo phòng ngừa, ngăn chặn người được bảo lãnh sử dụng các chất kích thích, rượu bia, thuốc lá, chất cháy nổ và các sản phẩm bị cấm theo Quy định tham gia chương trình;

+      Chăm sóc, bảo vệ quyền, lợi ích hợp pháp của Người được bảo lãnh; chịu trách nhiệm chăm sóc y tế hoặc chi trả chi phí chăm sóc y tế cho Người được bảo lãnh hoặc người bị tổn hại sức khỏe do Người được bảo lãnh gây ra trong suốt thời gian bảo lãnh.

- Người Tham Dự đi cùng người từ đủ 8 tuổi đến dưới 18 tuổi vui lòng tải và điền đầy đủ thông tin vào Đơn Bảo Lãnh trước khi đến check-in tại sự kiện. Ban Tổ Chức sẽ kiểm tra và xác nhận đơn tại quầy Thông tin BTC.

https://drive.google.com/file/d/1UFXz2bt4SdKemgw-JqSzjoiDHiYJZDHC/view?usp=sharing

- Trong khu vực SKY LOUNGE, Người bảo lãnh chịu hoàn toàn trách nhiệm đảm bảo người được bảo lãnh không sử dụng thức uống có cồn hoặc bất cứ hành động nào không phù hợp lứa tuổi.

●      Người Tham Dự có trách nhiệm theo dõi thông báo chính thức từ Ban Tổ Chức/Ticketbox và kiểm tra lại thông tin vé (ngày, giờ, địa điểm, giá) trong trường hợp có thay đổi trước khi sự kiện diễn ra.

●      Phụ nữ mang thai và người khuyết tật chỉ được mua vé Khu khán đài ngồi.

●      Người Tham Dự tự cân nhắc và chịu trách nhiệm về sức khỏe khi tham gia Chương Trình.

●      Mỗi tài khoản được mua tối đa mười (10) Vé. Một (1) Mã Vé có giá trị sử dụng cho một (1) người và một (1) lần duy nhất.

●      Vui lòng đứng/ngồi đúng khu vực và đúng vị trí số ghế ghi trên vé.

●      Nghiêm cấm quay phim/ chụp hình/ live stream bằng các thiết bị quay chụp chuyên nghiệp các tiết mục biểu diễn dưới mọi hình thức trong khu vực của Chương Trình. Ban Tổ Chức của Chương trình (sau đây gọi tắt là “BTC”) có quyền yêu cầu người vi phạm ra khỏi khu vực biểu diễn và không hoàn trả lại tiền vé.

●      Khi tham gia sự kiện, Người Tham Dự đã đồng ý hình ảnh của mình được sử dụng khai thác cho sản phẩm ghi hình, thu âm.

●      Vé chỉ được sử dụng để tham gia Chương trình. Không mua vé cho mục đích kinh doanh và không sử dụng vé cho các hoạt động khuyến mãi của hàng hóa, dịch vụ của người mua. Trong trường hợp vi phạm, BTC được quyền thu hồi vé đã mua và không hoàn lại tiền, không cho phép tham dự chương trình bằng những vé này và yêu cầu bồi thường thiệt hại. Quy định này không áp dụng đối với các tổ chức, cá nhân đã đạt được thỏa thuận bằng văn bản với Công ty cổ phần Vie Channel về việc sử dụng vé để khuyến mãi.

●      Mọi khiếu nại về vé và quyền lợi kèm vé phải được thực hiện trước thời điểm đóng cửa Check-in. Ban Tổ Chức không giải quyết đối với bất kỳ khiếu nại nào được đưa ra sau thời điểm đóng cửa Check-in.

●      Tuyệt đối tuân thủ quy định của BTC và hướng dẫn của đội ngũ an ninh. Trong trường hợp Người Tham Dự có hành động quá khích, kích động đám đông, tự ý di chuyển vào khu vực sân khấu, khu vực cấm, gây mất trật tự, sử dụng chất kích thích, chất cấm, trong trạng thái mất kiểm soát hành vi … BTC có quyền yêu cầu người vi phạm ra khỏi khu vực biểu diễn hoặc nhờ cơ quan chức năng can thiệp và không hoàn trả lại tiền vé.

●      Người Tham Dự đồng ý ủy quyền cho BTC/Nhân viên y tế/ An ninh/ Người đại diện/ Nhà thầu trợ giúp vận chuyển Người Tham Dự đến các cơ sở y tế để chữa trị (có thể bao gồm việc sơ tán, nhập viện, truyền máu, phẫu thuật và cấp thuốc). Người Tham Dự đồng ý chi trả toàn bộ chi phí liên quan đến việc chăm sóc, vận chuyển và điều trị của Cơ sở y tế (nếu có).

●      Không phá hoại, gây thiệt hại hay trộm cắp bất kì tài sản nào trong khuôn viên sự kiện.

●      Trong mọi trường hợp, quyết định của BTC là quyết định cuối cùng.

●      Người Tham Dự chịu trách nhiệm theo dõi thông tin cập nhật về Chương trình tại website ticketbox.vn và các phương tiện truyền thông của BTC.

B. QUYỀN HẠN CỦA BAN TỔ CHỨC

BTC có quyền:

●      Từ chối giải quyết các Vé Điện Tử và Mã Vé Điện Tử, Vòng Đeo Tay không do BTC trực tiếp phát hành.

●      Chỉ chấp nhận cho phép người đầu tiên quét mã Vé Điện Tử được tham dự sự kiện. BTC từ chối giải quyết trường hợp có nhiều hơn một (1) Người Tham Dự check-in cùng một (1) mã vé. Người Tham Dự tự bảo mật Mã Vé.

●      Tạm ngưng/ ngưng không cho Người Tham Dự tiếp tục tham gia Chương Trình nếu Người Tham Dự không tuân thủ những quy định của BTC.

●      Không giải quyết bất kỳ tranh chấp nào liên quan đến việc trao tặng, chuyển nhượng Vé Điện Tử, bán lại Vé Điện Tử giữa các bên liên quan ngoài hệ thống Ticketbox.

●      Yêu cầu không đem các hàng hóa, vật phẩm giả mạo, không chính thức liên quan đến chương trình buôn bán tại sự kiện.

●      Yêu cầu không mang vật phẩm, quần áo, mũ nón, băng rôn…mang logo, biểu tượng của nhãn hàng hóa để quảng bá tại sự kiện. Ban Tổ Chức được quyền thu hồi các vật phẩm được quảng bá, bán tại sự kiện và không cho Người Tham Dự, nhân viên bán hàng, nhân viên tiếp thị có các hành động trên tiếp tục tham dự sự kiện.

●      Kiểm tra Vòng Đeo Tay tại bất kỳ thời điểm nào trong lúc diễn ra sự kiện. BTC có quyền yêu cầu Người Tham Dự rời khỏi khu vực diễn ra chương trình nếu thiếu vòng đeo tay hoặc các phương tiện nhận diện khác mà Ban Tổ Chức đã cung cấp khi vào tham gia sự kiện.

●      Từ chối phục vụ và không hoàn trả lại tiền vé bất kỳ trường hợp nào mà BTC đánh giá là Người Tham Dự có hành vi không phù hợp để tham gia Chương Trình.

●      Ban Tổ Chức có quyền điều chỉnh, bổ sung nội dung Quy định tham gia chương trình, Điều Kiện và Điều Khoản nếu xét thấy cần thiết, đảm bảo không trái với nội dung mà Người Tham Dự đã đọc và đồng ý. Khi mua vé Người Tham Dự được hiểu là đã đọc, hiểu và đồng ý với Quy định tham gia chương trình, các Điều Kiện và Điều Khoản  cũng như bất kỳ thay đổi nào sau đó. Trường hợp có bất kỳ thay đổi nào đối với Chương trình, Ban Tổ Chức sẽ cung cấp thông tin tại website ticketbox.vn và trên các phương tiện truyền thông của BTC

C. THỦ TỤC CHECK-IN, RA VÀO CỬA

Người Tham Dự khi làm thủ tục check-in, ra vào cửa phải tuân thủ những quy định sau đây:

●      Chương trình sẽ chính thức bắt đầu lúc 19:00 (thời gian bắt đầu có thể thay đổi tuỳ thuộc vào sự sắp xếp của BTC và sẽ được thông báo tại sự kiện hoặc qua các kênh truyền thông chính thức của BTC, nếu có)

●      Có mặt tại khu vực làm thủ tục check-in từ 12:00 đến 19:00. Từ 19:01 đến 19:59, làm thủ tục check-in bổ sung, Ban Tổ Chức được quyền thay đổi / sắp xếp lại chỗ đứng / ngồi của Người Tham Dự.

●      Cửa check-in sẽ đóng vào 20:00. Đối với trường hợp chưa làm thủ tục sau 20:00 sẽ không được làm thủ tục check-in và sẽ không được phép tham gia Chương trình và không được hoàn trả lại tiền vé.

●      Các quà tặng kèm vé sẽ được phát tại cổng sau khi check-in tại sự kiện. Người Tham Dự vui lòng kiểm tra trước khi rời khỏi khu vực check-in. BTC sẽ không giải quyết trường hợp khiếu nại phát sinh sau đó.

●      Cung cấp giấy tờ tùy thân có năm sinh để chứng minh Người Tham Dự đủ tuổi tham gia khi BTC yêu cầu.

●      Xuất trình Mã Vé Điện Tử và nhận Vòng Đeo Tay tương ứng với chỗ đứng/chỗ ngồi trên vé.

●      Có đầy đủ Mã Vé Điện Tử, Vòng Đeo Tay, Dấu Mộc di chuyển mới được phép ra/vào khu vực biểu diễn.

●      Tự bảo quản Vé Điện Tử, Mã Vé Điện Tử và Vòng Đeo Tay trong suốt quá trình tham gia Chương Trình.

●      Người Tham Dự không được phép chuyển nhượng Vé Điện Tử hoặc Mã Vé Điện Tử ngoài tính năng “Tặng vé” chính thức trên Ticketbox. Vòng Đeo Tay được cấp phát tại sự kiện sau khi quét mã hợp lệ, không được phép chuyển nhượng cho người khác sử dụng để ra/vào sự kiện. Trường hợp BTC phát hiện, Người Tham Dự không được phép tiếp tục tham gia Chương Trình.

●      Người Tham Dự phải tuân thủ quy định về vật dụng bị cấm tại Mục D.

●      Làm thủ tục vào cửa đúng khu vực do BTC quy định.

●      BTC có quyền từ chối và không hoàn lại tiền vé trong trường hợp Người Tham Dự check-in chưa đủ tuổi, say xỉn, hoặc trong trạng thái mất kiểm soát hay vi phạm bất kỳ quy định nào trong Quy định tham gia Chương trình này.

D. CÁC VẬT DỤNG CẤM TẠI BUỔI DIỄN ANH TRAI “SAY HI” 2025 CONCERT

●      Balo/túi xách có kích thước lớn hơn 25cm x 35cm x 15cm.

●      Nghiêm cấm sử dụng thuốc lá trong khu vực sự kiện.

●      Cấm không được mang các chất cấm (chất kích thích), nước uống có cồn, thuốc lá, thuốc lá điện tử vào khu vực sự kiện.

●      Vũ khí dưới bất kỳ hình thức nào: đèn pin/ đèn laser/ các vật nhọn/ viết/ ô dù/ chân máy chụp ảnh monopod/ gậy selfie.

●      Áp phích/ băng cổ vũ/ bảng chỉ dẫn mang tính chất chính trị, kích động, ngôn từ không phù hợp thuần phong mỹ tục và banner lớn hơn 15cm x 40cm.

●      Các loại động vật/ thú nuôi.

●      Máy tính bảng/ ipad/ go-pro/ ống kính chuyên nghiệp/ thiết bị chụp ảnh chuyên nghiệp hay máy ảnh có ống kính có thể tháo rời/ thiết bị ghi hình và thu âm chuyên nghiệp.

●      Bật lửa/ nến/ pháo bông và các chất phát nổ.

●      Chai thủy tinh/ chai nhựa/ chai nhôm/ lọ thiếc hay các vật chứa nhựa cứng.

●      Thức ăn/ đồ uống/ ghế ngồi cá nhân từ bên ngoài vào khuôn viên sự kiện.

●      Bất kỳ vật dụng dễ bốc cháy như rượu / nước hoa/ chai xịt khử mùi cơ thể/ xăng dầu…

E. MIỄN TRỪ TRÁCH NHIỆM

BTC cam kết nỗ lực tối đa và sử dụng tất cả các biện pháp cần thiết hợp lý để đảm bảo an toàn, an ninh chung của Sự kiện và đảm bảo tuân thủ pháp luật; tuy nhiên, trong phạm vi tối đa mà pháp luật cho phép, BTC sẽ được miễn trừ mọi trách nhiệm đối với:

●      Các tai nạn, thương tích hoặc tổn thất tinh thần khác xảy ra tại Sự kiện do Người Tham Dự không tuân theo các quy định và hướng dẫn của BTC.

●      Các tổn hại về sức khỏe, tinh thần hay nhân mạng xảy ra đối với Người Tham Dự trong thời gian và không gian tổ chức Sự kiện do (i) các bệnh lý nền, bệnh tật, rối loạn tâm thần, dịch bệnh, chấn thương tái phát hoặc trở nặng hơn, hay (ii) bất kì tổn thương nào khác hoàn toàn do Người Tham Dự tự gây ra trong quá trình tham dự.

●      Sự an toàn của tài sản cá nhân tại Sự kiện: BTC không chịu trách nhiệm cho bất cứ sự mất mát nào khi xảy ra các sự kiện bất khả kháng, sự cố về thời tiết... ảnh hưởng đến buổi biểu diễn và chất lượng của buổi biểu diễn.

●      Các trường hợp miễn trừ trách nhiệm khác phù hợp theo quy định pháp luật của Việt Nam.

F. ĐỔI, TRẢ, HỦY VÉ

●      Chương trình chỉ bán vé qua một hệ thống duy nhất là ticketbox.vn. Vé đã mua không được đổi, trả, nâng cấp, hủy hay hoàn tiền trong bất kỳ trường hợp nào. Vé bị mất không được xuất lại.

●      Trường hợp Chương trình bị dời ngày do các sự kiện bất khả kháng:

-          Sự kiện bất khả kháng là sự kiện xảy ra một cách khách quan không thể lường trước được và không thể khắc phục được mặc dù đã áp dụng mọi biện pháp cần thiết và khả năng cho phép, nằm ngoài khả năng kiểm soát của con người, bao gồm nhưng không giới hạn các trường hợp: thiên tai, dịch bệnh, hỏa hoạn, lũ lụt, cháy nổ, động đất, phá hoại, nổi dậy, bạo động, chiến tranh hoặc thảm họa tương tự khác, quốc tang, các trường hợp khẩn cấp quốc gia, lệnh cấm của cơ quan chức năng có thẩm quyền ngăn cấm việc tổ chức Chương trình.

-          Sự kiện bất khả kháng bao gồm việc xảy ra hoặc tái bùng phát dịch bệnh SARS-CoV-2 hoặc các dịch bệnh có mức độ lây lan tương tự và cơ quan có thẩm quyền ban bố lệnh cấm tụ tập đông người, thực hiện giãn cách xã hội dẫn đến việc không thể tổ chức Chương trình mặc dù Các Bên đã áp dụng mọi biện pháp có thể.

-          Trong trường hợp Chương trình bị dời ngày do các sự kiện bất khả kháng nói trên, đơn vị tổ chức Chương trình sẽ thông báo đến Người mua thông qua phương tiện truyền thông của BTC về lịch tổ chức mới và không hoàn trả tiền vé.

-          Trường hợp Chương trình bị hủy do các sự kiện bất khả kháng đã đề cập tại Quy định này, Đơn vị tổ chức Chương trình và Đơn vị bán vé sẽ thông báo đến Người mua thông qua phương tiện truyền thông của BTC và sẽ hoàn trả lại tiền trong vòng 2 tuần qua chuyển khoản ngân hàng hoặc trả bằng tiền mặt phù hợp với sự sắp xếp của Ban Tổ Chức.

Người sở hữu Vé Điện Tử và Mã Vé Điện Tử được mặc định đã đọc, hiểu và đồng ý đối với các quy định này và cam kết tuân thủ các quy định tại đây và các quy định khác được niêm yết, thông báo tại buổi biểu diễn.

Người sở hữu Vé Điện Tử, Mã Vé Điện Tử đồng ý rằng BTC có toàn quyền áp dụng mọi biện pháp cần thiết khác không được quy định tại đây nhằm đảm bảo an ninh, an toàn và chất lượng của buổi biểu diễn',
'Khu đô thị Vạn Phúc, Phường Hiệp Bình Phước, Quận Thủ Đức, Thành Phố Hồ Chí Minh', 16, 'DHFI', 'IWP', '2025-12-27 12:00:00', '2025-12-27 23:00:00'),
('EM XINH "SAY HI" 2025', 'Sở hữu vé sớm để hưởng các đặc quyền đặc biệt', 'HIDW', 16, 'JBUWF', '2026-01-27 12:00:00', '2026-01-27 23:00:00');

CREATE TABLE layout (
    layout_id SERIAL PRIMARY KEY,
    layout_json JSONB,
    event_id INT NOT NULL,
    CONSTRAINT fk_event
        FOREIGN KEY (event_id)
        REFERENCES events(event_id)
)

INSERT INTO layout (layout_json) VALUES 
('
    {
        "canvas": {
            "width": 1200,
            "height": 700,
            "background": "#000000"
        },
        "zones": [
            {
            "id": "STAGE",
            "name": "STAGE",
            "type": "Sân khấu",
            "shape": "rect",
            "x": 300,
            "y": 30,
            "width": 600,
            "height": 70,
            "color": "#555555",
            "status": false
            },
            {
            "id": "SUPER_FAN",
            "name": "SUPER FAN",
            "type": "Đứng",
            "shape": "polygon",
            "points": [[500,120],[700,120],[760,200],[600,260],[440,200]],
            "color": "#FF2D2D",
            "price": 3500000,
            "total_quantity": 300
            },

            {
            "id": "FANZONE_A",
            "name": "FANZONE A",
            "type": "Đứng",
            "shape": "rect",
            "x": 200,
            "y": 150,
            "width": 250,
            "height": 260,
            "color": "#00C7D9",
            "price": 2000000,
            "total_quantity": 800,
            },
            {
            "id": "FANZONE_B",
            "name": "FANZONE B",
            "type": "Đứng",
            "shape": "rect",
            "x": 750,
            "y": 150,
            "width": 250,
            "height": 260,
            "color": "#00C7D9",
            "price": 2000000,
            "total_quantity": 800,
            },

            {
            "id": "GA_1A",
            "name": "GA 1A",
            "type": "Đứng",
            "shape": "rect",
            "x": 80,
            "y": 150,
            "width": 100,
            "height": 260,
            "color": "#00838F",
            "price": 1500000,
            "total_quantity": 600,
            },
            {
            "id": "GA_1B",
            "name": "GA 1B",
            "type": "Đứng",
            "shape": "rect",
            "x": 1020,
            "y": 150,
            "width": 100,
            "height": 260,
            "color": "#00838F",
            "price": 1500000,
            "total_quantity": 600,
            },

            {
            "id": "CAT_3A",
            "name": "CAT 3A",
            "type": "Ngồi",
            "shape": "rect",
            "x": 20,
            "y": 80,
            "width": 80,
            "height": 60,
            "color": "#2E7D8A",
            "price": 500000,
            "total_quantity": 100,
            },
            {
            "id": "CAT_3B",
            "name": "CAT 3B",
            "type": "Ngồi",
            "shape": "rect",
            "x": 1100,
            "y": 80,
            "width": 80,
            "height": 60,
            "color": "#2E7D8A",
            "price": 500000,
            "total_quantity": 100,
            },

            {
            "id": "CAT_2A",
            "name": "CAT 2A",
            "type": "Ngồi",
            "shape": "rect",
            "x": 20,
            "y": 160,
            "width": 80,
            "height": 200,
            "color": "#0D47A1",
            "price": 700000,
            "total_quantity": 600,
            },
            {
            "id": "CAT_2B",
            "name": "CAT 2B",
            "type": "Ngồi",
            "shape": "rect",
            "x": 1100,
            "y": 160,
            "width": 80,
            "height": 200,
            "color": "#0D47A1",
            "price": 700000,
            "total_quantity": 600,
            },

            {
            "id": "VIP_A",
            "name": "VIP A",
            "type": "Ngồi",
            "shape": "rect",
            "x": 260,
            "y": 440,
            "width": 120,
            "height": 90,
            "color": "#FFB74D",
            "price": 2500000,
            "total_quantity": 100,
            },
            {
            "id": "VIP_B",
            "name": "VIP B",
            "type": "Ngồi",
            "shape": "rect",
            "x": 820,
            "y": 440,
            "width": 120,
            "height": 90,
            "color": "#FFB74D",
            "price": 2500000,
            "total_quantity": 100,
            },
            {
            "id": "SVIP_A",
            "name": "SVIP A",
            "type": "Ngồi",
            "shape": "rect",
            "x": 400,
            "y": 440,
            "width": 120,
            "height": 90,
            "color": "#FF5A4F",
            "price": 3000000,
            "total_quantity": 150,
            },
            {
            "id": "SVIP_B",
            "name": "SVIP B",
            "type": "Ngồi",
            "shape": "rect",
            "x": 680,
            "y": 440,
            "width": 120,
            "height": 90,
            "color": "#FF5A4F",
            "price": 3000000,
            "total_quantity": 150,
            },
            {
            "id": "SKY_LOUNGE",
            "name": "SKY LOUNGE",
            "type": "Ngồi",
            "shape": "rect",
            "x": 540,
            "y": 440,
            "width": 120,
            "height": 90,
            "color": "#FF3B7F",
            "price": 4000000,
            "total_quantity": 80,
            },
            {
            "id": "CAT_1A",
            "name": "CAT 1A",
            "type": "Ngồi",
            "shape": "rect",
            "x": 200,
            "y": 560,
            "width": 360,
            "height": 90,
            "color": "#1E88E5",
            "price": 1000000,
            "total_quantity": 500,
            },
            {
            "id": "CAT_1B",
            "name": "CAT 1B",
            "type": "Ngồi",
            "shape": "rect",
            "x": 640,
            "y": 560,
            "width": 360,
            "height": 90,
            "color": "#1E88E5",
            "price": 1000000,
            "total_quantity": 500,
            },
            {
            "id": "FOH",
            "name": "FOH",
            "type": "Quản lý",
            "shape": "rect",
            "x": 560,
            "y": 570,
            "width": 80,
            "height": 50,
            "color": "#888888",
            "status": false
            }
        ]
    }
')

CREATE TABLE zones (
  zone_id SERIAL PRIMARY KEY,
  event_id INT NOT NULL,
  zone_code VARCHAR(50) UNIQUE,
  zone_name VARCHAR(100),
  zone_description TEXT,
  zone_quantity INT NOT NULL,
  sold_quantity INT DEFAULT 0,
  zone_price INT NOT NULL,
  status BOOLEAN DEFAULT 1
);

INSERT INTO zones 
(event_id, zone_code, zone_name, zone_description, zone_quantity, sold_quantity, zone_price)
VALUES
-- SUPER FAN
(1, 'SUPER_FAN', 'Super Fan', 'Khu đứng trung tâm sát sân khấu', 300, 0, 3500000),

-- FANZONE
(1, 'FANZONE_A', 'Fanzone A', 'Khu đứng bên trái sân khấu', 800, 0, 2000000),
(1, 'FANZONE_B', 'Fanzone B', 'Khu đứng bên phải sân khấu', 800, 0, 2000000),

-- GA
(1, 'GA_1A', 'GA 1A', 'Khu đứng ngoài cùng bên trái', 600, 0, 1500000),
(1, 'GA_1B', 'GA 1B', 'Khu đứng ngoài cùng bên phải', 600, 0, 1500000),

-- CAT 3
(1, 'CAT_3A', 'CAT 3A', 'Khán đài xa sân khấu bên trái', 100, 0, 500000),
(1, 'CAT_3B', 'CAT 3B', 'Khán đài xa sân khấu bên phải', 100, 0, 500000),

-- CAT 2
(1, 'CAT_2A', 'CAT 2A', 'Khán đài trung bình bên trái', 600, 0, 700000),
(1, 'CAT_2B', 'CAT 2B', 'Khán đài trung bình bên phải', 600, 0, 700000),

-- CAT 1
(1, 'CAT_1A', 'CAT 1A', 'Khán đài gần sân khấu bên trái', 500, 0, 1000000),
(1, 'CAT_1B', 'CAT 1B', 'Khán đài gần sân khấu bên phải', 500, 0, 1000000),

-- VIP
(1, 'VIP_A', 'VIP A', 'Ghế VIP bên trái', 100, 0, 2500000),
(1, 'VIP_B', 'VIP B', 'Ghế VIP bên phải', 100, 0, 2500000),

-- SVIP
(1, 'SVIP_A', 'SVIP A', 'Ghế SVIP bên trái trung tâm', 150, 0, 3000000),
(1, 'SVIP_B', 'SVIP B', 'Ghế SVIP bên phải trung tâm', 150, 0, 3000000),

-- SKY LOUNGE
(1, 'SKY_LOUNGE', 'Sky Lounge', 'Khu ghế cao cấp trung tâm', 80, 0, 4000000);

CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_ref VARCHAR(150) NOT NULL,
    CONSTRAINT fk_users 
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
)

INSERT INTO payments (user_id, method, payment_status, payment_ref)
VALUES
(1, 'VNPAY', 'Thành công', 'VNPAY_20251227_0001'),
(1, 'MOMO', 'Thất bại', 'MOMO_20251227_0002');


CREATE TABLE payment_detail (
    payment_detail_id SERIAL PRIMARY KEY,
    payment_id INT NOT NULL,
    event_id INT NOT NULL,
    zone_id INT NOT NULL,
    ticket_quantity INT NOT NULL,
    ticket_qr VARCHAR(255) NOT NULL,
    CONSTRAINT fk_events 
        FOREIGN KEY (event_id)
        REFERENCES events(event_id),
    CONSTRAINT fk_zones 
        FOREIGN KEY (zone_id)
        REFERENCES zones(zone_id),
    CONSTRAINT fk_payments 
        FOREIGN KEY (payment_id)
        REFERENCES payments(payment_id)
)

INSERT INTO payment_detail 
(payment_id, event_id, zone_id, ticket_quantity, ticket_qr)
VALUES
(
  1,
  1,
  10,
  1,
  'QR_1_EVENT1_VIPA_20251227_0001'
);


CREATE TABLE chat_ai (
    chat_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT,
    sender VARCHAR(100),
    intent VARCHAR(255) NOT NULL,
    ticket_quantity INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    event_id INT NOT NULL,
    meta_json JSONB,
    CONSTRAINT fk_events
        FOREIGN KEY (event_id)
        REFERENCES events(event_id)
)

INSERT INTO chat_ai 
(user_id, message, intent, ticket_quantity, event_id, meta_json, sender)
VALUES
(
  1,
  'Vé VIP A còn không?',
  'Kiểm tra số lượng còn lại',
  0,
  1,
  '{
    "zone_code": "VIP_A",
    "available": 5,
    "confidence": 0.95
  }',
  'Người dùng'
),
(
  1,
  'Bạn có muốn mua 1 vé VIP A không?',
  'Gợi ý mua vé',
  1,
  1,
  '{
    "zone_code": "VIP_A",
    "price": 3000000
  }',
  'AI'
);

CREATE TABLE user_behavior_log (
    log_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(255),
    object_id VARCHAR(255),
    value JSONB,
    ip_address VARCHAR(255),
    device_info VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

INSERT INTO user_behavior_log
(user_id, action, object_id, value, ip_address, device_info, user_agent)
VALUES
(
  1,
  'VIEW_LAYOUT',
  'EVENT_1',
  '{"screen":"desktop","zoom":1.2}',
  '113.161.45.22',
  'Windows 11',
  'Chrome 143.0'
);

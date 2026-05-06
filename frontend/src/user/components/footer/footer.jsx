import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BrainCircuit,
  Mail,
  MapPin,
  ShieldCheck,
  Ticket,
  Users,
  Zap,
} from "lucide-react";
import "./footer.css";

const quickLinks = [
  { to: "/", label: "Trang chủ" },
  { to: "/search", label: "Khám phá sự kiện" },
  { to: "/my-tickets", label: "Vé của tôi" },
  { to: "/profile", label: "Tài khoản" },
];

const highlightItems = [
  {
    icon: BrainCircuit,
    title: "AI Agentic RAG",
    description: "Tư vấn sự kiện, gợi ý hợp gu và trả lời nhanh theo dữ liệu thật.",
  },
  {
    icon: Zap,
    title: "Realtime ticketing",
    description: "Cập nhật vé, đơn hàng và trạng thái thanh toán theo thời gian thực.",
  },
  {
    icon: ShieldCheck,
    title: "Thanh toán linh hoạt",
    description: "Tối ưu trải nghiệm đặt vé với MoMo, VNPay và xác nhận qua email.",
  },
];

const feedbackGuide = [
  "Sự kiện hoặc trang bạn đã xem",
  "Thiết bị, trình duyệt và kích thước màn hình",
  "Điểm bạn thấy ổn và điểm cần cải thiện",
];

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const supportEmail = "ticketconcert-cskh@gmail.com";
  const feedbackSubject = "Đánh giá chi tiết trải nghiệm Ticket Concert";
  const feedbackBody = [
    "Xin chào Ticket Concert Team,",
    "",
    "Mình muốn gửi đánh giá chi tiết về trải nghiệm sử dụng:",
    "- Sự kiện / tính năng đã dùng:",
    "- Thiết bị / trình duyệt:",
    "- Điều mình thấy hài lòng:",
    "- Vấn đề gặp phải:",
    "- Đề xuất cải thiện:",
    "",
    "Cảm ơn team!",
  ].join("\n");
  const feedbackHref = `mailto:${supportEmail}?subject=${encodeURIComponent(feedbackSubject)}&body=${encodeURIComponent(feedbackBody)}`;

  return (
    <div className="tc-footer">
      <div className="tc-footer-hero">
        <div className="tc-footer-brand">
          <div className="tc-footer-logo-wrap">
            <img src="/Logo.png" alt="Ticket Concert" className="tc-footer-logo" />
          </div>

          <div className="tc-footer-brand-copy">
            <h2 className="tc-footer-title">Ticket Concert</h2>
            <p className="tc-footer-desc">
              Hệ thống bán vé concert thông minh tích hợp AI Agentic RAG, gợi ý cá nhân hóa
              và cập nhật vé realtime để hành trình tìm sự kiện, đặt vé và theo dõi đơn hàng
              trở nên mượt hơn.
            </p>

            <div className="tc-footer-pills">
              <span>AI tư vấn</span>
              <span>Gợi ý cá nhân hóa</span>
              <span>MoMo &amp; VNPay</span>
              <span>Email xác nhận</span>
            </div>
          </div>
        </div>

        <a className="tc-feedback-card" href={feedbackHref}>
          <div className="tc-feedback-icon">
            <Mail size={18} />
          </div>
          <div className="tc-feedback-copy">
            <p className="tc-feedback-eyebrow">Phản hồi chi tiết</p>
            <h3>Gửi email đánh giá cho team</h3>
            <p>
              Mở sẵn mẫu email với chủ đề và gợi ý nội dung để team đọc, tổng hợp và cải
              thiện nhanh hơn.
            </p>
          </div>
          <ArrowUpRight size={18} className="tc-feedback-arrow" />
        </a>
      </div>

      <div className="tc-footer-grid">
        <section className="tc-footer-panel tc-footer-panel--wide">
          <div className="tc-footer-panel-head">
            <Ticket size={18} />
            <h3>Năng lực nổi bật</h3>
          </div>

          <div className="tc-highlight-list">
            {highlightItems.map(({ icon: Icon, title, description }) => (
              <article key={title} className="tc-highlight-item">
                <div className="tc-highlight-icon">
                  <Icon size={18} />
                </div>
                <div>
                  <h4>{title}</h4>
                  <p>{description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="tc-footer-panel">
          <div className="tc-footer-panel-head">
            <ArrowUpRight size={18} />
            <h3>Đi nhanh</h3>
          </div>

          <nav className="tc-footer-links" aria-label="Liên kết nhanh">
            {quickLinks.map((link) => (
              <Link key={link.to} to={link.to} className="tc-footer-link">
                {link.label}
              </Link>
            ))}
          </nav>
        </section>

        <section className="tc-footer-panel">
          <div className="tc-footer-panel-head">
            <Users size={18} />
            <h3>Thông tin team</h3>
          </div>

          <div className="tc-footer-contact">
            <a href={`mailto:${supportEmail}`} className="tc-contact-row">
              <Mail size={16} />
              <span>{supportEmail}</span>
            </a>

            <div className="tc-contact-row">
              <MapPin size={16} />
              <span>TP. Hồ Chí Minh, Việt Nam</span>
            </div>

            <p className="tc-team-copy">
              Xây dựng bởi Nguyễn Hoàng Huynh, Trần Diệp Anh Kiệt và Phùng Minh Vũ.
            </p>
          </div>
        </section>
      </div>

      <div className="tc-footer-bottom">
        <p>
          © {currentYear} Ticket Concert. Nền tảng đặt vé concert thông minh hướng tới trải
          nghiệm hiện đại, rõ ràng và dễ sử dụng hơn trên mọi thiết bị.
        </p>
        <div className="tc-footer-bottom-tags">
          <span>Realtime</span>
          <span>Agentic RAG</span>
          <span>Responsive first</span>
        </div>
      </div>
    </div>
  );
}

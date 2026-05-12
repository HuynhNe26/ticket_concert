import { Resend } from "resend";

const resend = new Resend("re_Eh2W2Q6w_4SryA6wi8uVsxQ3HfZwBArYk");

export async function sendTicketEmail({ toEmail, userName, payment, items }) {
  const itemRows = items
    .map(
      (it) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${it.event_name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${it.event_date}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${it.event_location}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${it.zone_name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${it.ticket_quantity}</td>
        </tr>`
    )
    .join("");

  await resend.emails.send({
    from: "no-reply@ticketconcert.online",
    to: toEmail,
    subject: `Xác nhận thông tin mua vé`,
    html: `
      <div style="font-family:sans-serif;max-width:1000px;margin:auto">
        <h2 style="color: linear-gradient(155deg, #494a4a 0%, #6e8794 48%, #788e9d 100%)">Đặt vé thành công!</h2>
        <p>Xin chào <strong>${userName}</strong>,</p>
        <p>Cảm ơn bạn đã đặt vé. Dưới đây là thông tin đơn hàng của bạn:</p>

        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="background:radial-gradient(circle at top left, rgba(56, 189, 248, 0.24), transparent 32%),
    radial-gradient(circle at bottom right, rgba(74, 222, 128, 0.2), transparent 28%),
    linear-gradient(155deg, #494a4a 0%, #6e8794 48%, #788e9d 100%);color:#fff">
              <th style="padding:10px 12px;text-align:left">Sự kiện</th>
              <th style="padding:10px 12px;text-align:left">Ngày diễn</th>
              <th style="padding:10px 12px;text-align:left">Địa điểm</th>
              <th style="padding:10px 12px;text-align:left">Khu vực</th>
              <th style="padding:10px 12px;text-align:center">Số lượng</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>

        <p style="margin-top:24px;font-size:13px;color:#888">
          Vui lòng xuất trình mã QR khi vào cổng sự kiện <a href="https://ticketconcert.online/my-tickets" target="_blank">Tại đây</a>.<br/>
          Nếu cần hỗ trợ, liên hệ chúng mình qua email ticketconcert-cskh@gmail.com
        </p>
      </div>
    `,
  });
}
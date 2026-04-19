export function buildTicketEmailHtml(ticket) {
  const fmt = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const formatVND = (n) => {
    if (!n && n !== 0) return "—";
    return Number(n).toLocaleString("vi-VN") + " đ";
  };

  const bannerSection = ticket.banner_url
    ? `<img src="${ticket.banner_url}" width="600" style="display:block;width:100%;max-height:220px;object-fit:cover;object-position:center top;" alt="${ticket.event_name}" />`
    : `<div style="background:linear-gradient(135deg,#4c1d95 0%,#1e1b4b 60%,#0d1526 100%);height:160px;display:flex;align-items:center;justify-content:center;font-size:48px;">🎫</div>`;

  const qrSection = ticket.ticket_qr
    ? `<img src="${ticket.ticket_qr}" width="150" height="150" style="display:block;border-radius:12px;border:3px solid #ffffff;" alt="QR Check-in" />`
    : `<div style="width:150px;height:150px;background:rgba(255,255,255,0.05);border:1px dashed rgba(255,255,255,0.15);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#475569;">Không có QR</div>`;

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Vé của bạn — ${ticket.event_name}</title>
</head>
<body style="margin:0;padding:0;background-color:#060a14;font-family:'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#060a14;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- LOGO -->
  <tr>
    <td style="padding-bottom:22px;text-align:center;">
      <span style="display:inline-block;background:#7c3aed;border-radius:10px;padding:8px 22px;font-family:'Arial Black',Arial,sans-serif;font-size:20px;letter-spacing:4px;color:#ffffff;font-weight:900;">TICKET CONCERT</span>
    </td>
  </tr>

  <!-- MAIN CARD -->
  <tr>
    <td style="background:#0d1526;border-radius:20px;border:1px solid rgba(255,255,255,0.07);overflow:hidden;">

      <!-- BANNER -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="position:relative;overflow:hidden;border-radius:20px 20px 0 0;line-height:0;font-size:0;">
            ${bannerSection}
          </td>
        </tr>
      </table>

      <!-- EVENT TITLE BAR -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:linear-gradient(180deg,rgba(13,21,38,0) 0%,#0d1526 100%);padding:20px 28px 0;margin-top:-40px;">
            <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:5px;color:#a78bfa;text-transform:uppercase;">Xác nhận đặt vé thành công</p>
            <h1 style="margin:0;font-family:'Arial Black',Arial,sans-serif;font-size:clamp(20px,3vw,28px);letter-spacing:2px;color:#f1f5f9;font-weight:900;line-height:1.2;">${ticket.event_name}</h1>
          </td>
        </tr>
      </table>

      <!-- ORDER CODE -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:20px 28px 0;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:rgba(124,58,237,0.12);border:1px solid rgba(124,58,237,0.35);border-radius:10px;padding:12px 18px;">
                  <span style="font-size:10px;font-weight:700;letter-spacing:5px;color:#7c3aed;text-transform:uppercase;margin-right:14px;">Mã đơn hàng</span>
                  <span style="font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:700;letter-spacing:6px;color:#c4b5fd;">#${ticket.payment_ref || "—"}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- DASHED DIVIDER TOP -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:20px 28px 0;">
            <div style="border-top:1px dashed rgba(255,255,255,0.08);"></div>
          </td>
        </tr>
      </table>

      <!-- BODY: INFO LEFT + QR RIGHT -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr valign="top">

          <!-- LEFT: ticket details -->
          <td width="340" style="padding:20px 16px 24px 28px;">

            <!-- meta items -->
            <table width="100%" cellpadding="0" cellspacing="0">

              <!-- Ngày thanh toán -->
              <tr>
                <td style="padding-bottom:8px;">
                  <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:10px 14px;">
                    <p style="margin:0 0 3px;font-size:9px;font-weight:700;letter-spacing:4px;color:#475569;text-transform:uppercase;">Ngày thanh toán</p>
                    <p style="margin:0;font-size:13px;color:#e2e8f0;font-weight:500;">${fmt(ticket.created_at)}</p>
                  </div>
                </td>
              </tr>

              <!-- Ngày diễn ra -->
              <tr>
                <td style="padding-bottom:8px;">
                  <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:10px 14px;">
                    <p style="margin:0 0 3px;font-size:9px;font-weight:700;letter-spacing:4px;color:#475569;text-transform:uppercase;">Ngày diễn ra</p>
                    <p style="margin:0;font-size:13px;color:#e2e8f0;font-weight:500;">${fmt(ticket.event_end)}</p>
                  </div>
                </td>
              </tr>

              <!-- Địa điểm -->
              <tr>
                <td style="padding-bottom:8px;">
                  <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:10px 14px;">
                    <p style="margin:0 0 3px;font-size:9px;font-weight:700;letter-spacing:4px;color:#475569;text-transform:uppercase;">Địa điểm</p>
                    <p style="margin:0;font-size:13px;color:#e2e8f0;font-weight:500;">${ticket.event_location || "—"}</p>
                  </div>
                </td>
              </tr>

              <!-- Khu vực + Số lượng (2 cột) -->
              <tr>
                <td style="padding-bottom:8px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="48%" style="padding-right:6px;">
                        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:10px 14px;">
                          <p style="margin:0 0 3px;font-size:9px;font-weight:700;letter-spacing:4px;color:#475569;text-transform:uppercase;">Khu vực</p>
                          <p style="margin:0;font-size:13px;color:#e2e8f0;font-weight:500;">${ticket.zone_name || "—"}</p>
                        </div>
                      </td>
                      <td width="52%" style="padding-left:6px;">
                        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:10px 14px;">
                          <p style="margin:0 0 3px;font-size:9px;font-weight:700;letter-spacing:4px;color:#475569;text-transform:uppercase;">Số lượng</p>
                          <p style="margin:0;font-size:16px;color:#4ade80;font-weight:700;font-family:'Arial Black',Arial;">${ticket.ticket_quantity} vé</p>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Đơn giá + Phương thức (2 cột) -->
              <tr>
                <td style="padding-bottom:8px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="48%" style="padding-right:6px;">
                        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:10px 14px;">
                          <p style="margin:0 0 3px;font-size:9px;font-weight:700;letter-spacing:4px;color:#475569;text-transform:uppercase;">Đơn giá</p>
                          <p style="margin:0;font-size:13px;color:#e2e8f0;font-weight:500;">${formatVND(ticket.price)}</p>
                        </div>
                      </td>
                      <td width="52%" style="padding-left:6px;">
                        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:10px 14px;">
                          <p style="margin:0 0 3px;font-size:9px;font-weight:700;letter-spacing:4px;color:#475569;text-transform:uppercase;">Thanh toán</p>
                          <p style="margin:0;font-size:13px;color:#e2e8f0;font-weight:500;">${ticket.method || "—"}</p>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Total -->
              <tr>
                <td>
                  <div style="background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.2);border-radius:10px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:4px;color:#7c3aed;text-transform:uppercase;">Tổng đơn hàng</p>
                        </td>
                        <td align="right">
                          <p style="margin:0;font-family:'Arial Black',Arial,sans-serif;font-size:20px;color:#a78bfa;font-weight:900;letter-spacing:1px;">${formatVND(ticket.total_price)}</p>
                        </td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>

            </table>
          </td>

          <!-- DASHED VERTICAL DIVIDER -->
          <td width="1" style="padding:0;">
            <div style="width:1px;background:repeating-linear-gradient(to bottom,transparent,transparent 6px,rgba(255,255,255,0.1) 6px,rgba(255,255,255,0.1) 12px);min-height:360px;"></div>
          </td>

          <!-- RIGHT: QR + status -->
          <td style="padding:20px 28px 24px 20px;" align="center" valign="top">

            <p style="margin:0 0 10px;font-size:9px;font-weight:700;letter-spacing:5px;color:#475569;text-transform:uppercase;text-align:center;">Quét để check-in</p>

            ${qrSection}

            <div style="margin-top:16px;width:100%;">
              <p style="margin:0 0 8px;font-size:9px;font-weight:700;letter-spacing:5px;color:#475569;text-transform:uppercase;text-align:center;">Trạng thái</p>

              <!-- payment badge -->
              <div style="background:rgba(74,222,128,0.12);border:1px solid rgba(74,222,128,0.25);border-radius:8px;padding:8px 12px;text-align:center;margin-bottom:6px;">
                <span style="font-size:12px;font-weight:700;color:#4ade80;">Đã thanh toán</span>
              </div>

              <!-- usage badge -->
              <div style="background:rgba(96,165,250,0.12);border:1px solid rgba(96,165,250,0.25);border-radius:8px;padding:8px 12px;text-align:center;margin-bottom:6px;">
                <span style="font-size:12px;font-weight:700;color:#60a5fa;">Chưa sử dụng</span>
              </div>

              <!-- zone badge -->
              ${ticket.zone_name ? `
              <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:7px 12px;text-align:center;">
                <span style="font-size:11px;font-weight:600;color:#94a3b8;">Khu vực: ${ticket.zone_name}</span>
              </div>` : ""}
            </div>

          </td>
        </tr>
      </table>

      <!-- DASHED DIVIDER BOTTOM -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:0 28px;">
            <div style="border-top:1px dashed rgba(255,255,255,0.08);"></div>
          </td>
        </tr>
      </table>

      <!-- CARD FOOTER -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:20px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr valign="middle">
                <td>
                  <p style="margin:0 0 2px;font-size:12px;font-weight:700;letter-spacing:2px;color:#c4b5fd;text-transform:uppercase;">Ticket Concert Team</p>
                  <p style="margin:0;font-size:11px;color:#475569;">ticketconcert.online</p>
                </td>
                <td align="right">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-right:10px;">
                        <img src="https://res.cloudinary.com/dzfqqipsx/image/upload/v1776499227/xmcn7vabeqm6lgnvl0pm.png"
                          width="44" height="44"
                          style="display:block;border-radius:8px;object-fit:contain;" alt="Logo" />
                      </td>
                      <td>
                        <img src="https://res.cloudinary.com/dzfqqipsx/image/upload/v1776498643/yuzokosxfjqor1g0twvm.jpg"
                          width="44" height="44"
                          style="display:block;border-radius:8px;object-fit:contain;" alt="Logo" />
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

    </td>
  </tr>

  <!-- BOTTOM NOTE -->
  <tr>
    <td style="padding:20px 0 0;text-align:center;">
      <p style="margin:0 0 4px;font-size:11px;color:#334155;line-height:1.6;">
        Email này được gửi tự động sau khi đặt vé thành công.<br/>
        Vui lòng không trả lời email này.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>

</body>
</html>
  `.trim();
}

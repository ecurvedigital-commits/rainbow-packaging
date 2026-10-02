/**
 * HTML and plain text email template generator for daily digest.
 * (docs/routes/audit-and-digest.md)
 */

export function renderDailyDigest({ date, counts, oldest_pending_hours, deep_link }) {
  const subject = `[Rainbow Packages] Daily Activity Digest - ${date}`;

  const text = `Rainbow Packages Daily Activity Digest - ${date}
==================================================

Daily Activity Summary:
- Reels Created: ${counts?.created ?? 0}
- Usage Entries Logged: ${counts?.usage ?? 0}
- Entries Confirmed: ${counts?.confirmed ?? 0}
- Entries Declined & Reverted: ${counts?.declined ?? 0}
- Admin Corrections: ${counts?.admin_corrected ?? 0}

Pending Approvals:
- Still Pending: ${counts?.still_pending ?? 0}
- Oldest Pending: ${oldest_pending_hours ?? 0} hour(s)

View and review the audit log for ${date}:
${deep_link}
`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #0f172a; color: #ffffff; padding: 24px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
    .header p { margin: 4px 0 0 0; font-size: 14px; color: #94a3b8; }
    .content { padding: 24px; }
    .section-title { font-size: 14px; font-weight: 600; text-transform: uppercase; color: #64748b; margin-top: 0; margin-bottom: 12px; letter-spacing: 0.05em; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px; }
    .stat-card { background: #f1f5f9; padding: 12px 16px; border-radius: 6px; }
    .stat-value { font-size: 20px; font-weight: 700; color: #0f172a; }
    .stat-label { font-size: 12px; color: #64748b; margin-top: 2px; }
    .pending-box { background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; padding: 16px; margin-bottom: 24px; }
    .pending-box strong { color: #92400e; }
    .cta-container { text-align: center; margin: 32px 0 16px 0; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 12px 24px; font-weight: 600; text-decoration: none; border-radius: 6px; }
    .footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Rainbow Packages Activity Digest</h1>
      <p>Report Date: ${date}</p>
    </div>
    <div class="content">
      <div class="section-title">Daily Activity</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${counts?.created ?? 0}</div>
          <div class="stat-label">Reels Created</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${counts?.usage ?? 0}</div>
          <div class="stat-label">Usage Logged</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${counts?.confirmed ?? 0}</div>
          <div class="stat-label">Approvals Confirmed</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${counts?.declined ?? 0}</div>
          <div class="stat-label">Declined & Reverted</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${counts?.admin_corrected ?? 0}</div>
          <div class="stat-label">Admin Corrections</div>
        </div>
      </div>

      <div class="pending-box">
        <strong>Pending Actions:</strong> ${counts?.still_pending ?? 0} item(s) currently awaiting supervisor/admin confirmation.<br />
        <small>Oldest pending item waiting for ${oldest_pending_hours ?? 0} hour(s).</small>
      </div>

      <div class="cta-container">
        <a href="${deep_link}" class="btn" target="_blank" rel="noopener noreferrer">View Audit Log</a>
      </div>
    </div>
    <div class="footer">
      Automated daily notification from Rainbow Packages Inventory System.
    </div>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

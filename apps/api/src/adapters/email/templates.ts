import type { EmailMessage } from "../../ports";

const BRAND = "#0891B2";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F1F5F9;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(15,23,42,.08);">
<tr><td style="background:${BRAND};padding:20px 28px;color:#FFFFFF;font-size:22px;font-weight:700;letter-spacing:.3px;">FlatMe</td></tr>
<tr><td style="padding:28px;">${bodyHtml}</td></tr>
<tr><td style="padding:16px 28px 24px;color:#64748B;font-size:12px;line-height:18px;border-top:1px solid #E2E8F0;">
FlatMe · Verified flat sharing for working professionals in Hyderabad.<br>You received this email because it was entered in the FlatMe app.
</td></tr>
</table></td></tr></table></body></html>`;
}

export function otpEmail(to: string, code: string, ttlMinutes: number): EmailMessage {
  const html = layout(
    "Your FlatMe sign-in code",
    `<p style="margin:0 0 12px;font-size:16px;">Here's your sign-in code:</p>
<p style="margin:0 0 20px;font-size:34px;font-weight:700;letter-spacing:10px;color:${BRAND};font-family:'SFMono-Regular',Consolas,monospace;">${escapeHtml(code)}</p>
<p style="margin:0 0 8px;font-size:14px;color:#334155;">It expires in ${ttlMinutes} minutes. Don't share it with anyone — FlatMe will never ask for it.</p>
<p style="margin:0;font-size:13px;color:#64748B;">Didn't try to sign in? You can safely ignore this email.</p>`,
  );
  return {
    to,
    subject: `${code} is your FlatMe sign-in code`,
    html,
    text: `Your FlatMe sign-in code is ${code}. It expires in ${ttlMinutes} minutes. If you didn't request it, ignore this email.`,
  };
}

export function inquiryEmail(args: {
  to: string;
  ownerFirstName: string;
  fromName: string;
  fromCompany: string;
  fromEmail: string;
  listingTitle: string;
  message: string;
}): EmailMessage {
  const html = layout(
    "New enquiry on your FlatMe listing",
    `<p style="margin:0 0 12px;font-size:16px;">Hi ${escapeHtml(args.ownerFirstName)},</p>
<p style="margin:0 0 16px;font-size:15px;color:#334155;"><strong>${escapeHtml(args.fromName)}</strong> (${escapeHtml(args.fromCompany)}, verified) is interested in your listing <strong>${escapeHtml(args.listingTitle)}</strong>:</p>
<blockquote style="margin:0 0 20px;padding:12px 16px;background:#ECFEFF;border-left:4px solid ${BRAND};border-radius:6px;font-size:15px;color:#0F172A;white-space:pre-wrap;">${escapeHtml(args.message)}</blockquote>
<p style="margin:0;font-size:14px;color:#334155;">Reply directly to <a style="color:${BRAND};" href="mailto:${escapeHtml(args.fromEmail)}">${escapeHtml(args.fromEmail)}</a>.</p>`,
  );
  return {
    to: args.to,
    subject: `New enquiry for ${args.listingTitle}`,
    html,
    text: `Hi ${args.ownerFirstName},\n\n${args.fromName} (${args.fromCompany}) is interested in ${args.listingTitle}:\n\n${args.message}\n\nReply to ${args.fromEmail}.`,
  };
}

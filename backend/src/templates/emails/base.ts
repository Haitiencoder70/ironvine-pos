/**
 * Wraps any email body HTML in a consistent, mobile-responsive shell.
 * Uses only inline CSS for maximum email-client compatibility.
 */
export function baseTemplate(opts: {
  title: string;
  previewText?: string;
  body: string;
  orgName?: string;
  orgLogoUrl?: string;
  accentColor?: string;
}): string {
  const accent = opts.accentColor ?? '#2563eb';
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${opts.title}</title>
  ${opts.previewText ? `<span style="display:none;font-size:0;line-height:0;max-height:0;mso-hide:all;">${opts.previewText}</span>` : ''}
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="background-color:${accent};border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
              ${opts.orgLogoUrl
                ? `<img src="${opts.orgLogoUrl}" alt="${opts.orgName ?? 'YourApp'}" style="height:40px;max-width:180px;object-fit:contain;" />`
                : `<span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">${opts.orgName ?? 'YourApp'}</span>`
              }
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:36px 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
              ${opts.body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f1f5f9;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;padding:20px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                © ${year} ${opts.orgName ?? 'YourApp'} · All rights reserved<br />
                <a href="{{{unsubscribe_url}}}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
                &nbsp;·&nbsp;
                <a href="mailto:${`support@yourapp.com`}" style="color:#94a3b8;text-decoration:underline;">Contact Support</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Reusable CTA button block */
export function ctaButton(text: string, url: string, color = '#2563eb'): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="border-radius:10px;background-color:${color};">
      <a href="${url}" target="_blank"
         style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;min-width:160px;text-align:center;">
        ${text}
      </a>
    </td>
  </tr>
</table>`;
}

/** Horizontal divider */
export const divider = `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />`;

/** Heading */
export function h1(text: string): string {
  return `<h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#0f172a;line-height:1.3;">${text}</h1>`;
}

/** Paragraph */
export function p(text: string, small = false): string {
  return `<p style="margin:0 0 16px;font-size:${small ? '13px' : '15px'};color:${small ? '#64748b' : '#334155'};line-height:1.7;">${text}</p>`;
}

/** Feature/bullet list */
export function featureList(items: string[]): string {
  const lis = items.map((i) => `
    <tr>
      <td style="padding:4px 0;font-size:14px;color:#334155;line-height:1.6;">
        <span style="color:#22c55e;font-weight:700;margin-right:8px;">✓</span>${i}
      </td>
    </tr>`).join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;">${lis}</table>`;
}

/** Highlighted info box */
export function infoBox(content: string, color = '#eff6ff', border = '#bfdbfe'): string {
  return `<div style="background-color:${color};border-left:4px solid ${border};border-radius:6px;padding:16px 20px;margin:20px 0;font-size:14px;color:#334155;line-height:1.6;">${content}</div>`;
}

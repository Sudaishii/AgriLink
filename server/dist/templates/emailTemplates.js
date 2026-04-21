"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmailVerificationTemplate = void 0;
const getEmailVerificationTemplate = (confirmationURL, logoUrl) => `
<div style="margin:0; padding:0; background-color:#f9fafb; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937;">
  <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:20px auto; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
    
    <!-- Branding Header -->
    <tr>
      <td style="background-color:#ffffff; padding:40px 0 20px; text-align:center;">
       <img src="${logoUrl}" 
          alt="AgriLink" 
          style="width:160px; height:auto; display:inline-block;">
      </td>
    </tr>

    <!-- Main Content -->
    <tr>
      <td style="padding:0 40px 40px;">
        <div style="text-align:center;">
          <h1 style="margin:0 0 16px; color:#065f46; font-size:24px; font-weight:700; letter-spacing:-0.025em;">Verify your email address</h1>
          <p style="margin:0 0 24px; font-size:16px; line-height:1.6; color:#4b5563;">
            Welcome to AgriLink! We're excited to have you join our community. To get started, please confirm your email address by clicking the button below.
          </p>

          <!-- Action Button -->
          <div style="margin:32px 0;">
            <a href="${confirmationURL}" 
               style="background-color:#10b981; 
                      color:#ffffff; 
                      padding:14px 32px; 
                      text-decoration:none; 
                      border-radius:12px; 
                      font-size:16px; 
                      font-weight: 600;
                      display:inline-block;
                      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
              Confirm Email Address
            </a>
          </div>

          <!-- Important Note -->
          <div style="background-color: #ecfdf5; padding: 16px; border-radius: 12px; border: 1px solid #d1fae5; display: inline-block; width: 100%; box-sizing: border-box;">
            <p style="margin: 0; font-size: 14px; color: #065f46;">
              <strong>Note:</strong> This verification link will expire in <strong>10 minutes</strong>.
            </p>
          </div>
        </div>

        <div style="margin-top:40px; border-top: 1px solid #f3f4f6; padding-top:24px;">
          <p style="margin:0; font-size:14px; line-height:1.5; color:#6b7280;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="margin:8px 0 0; font-size:13px; color:#10b981; word-break: break-all;">
            ${confirmationURL}
          </p>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color:#f9fafb; padding:32px 40px; text-align:center;">
        <p style="margin:0; font-size:12px; color:#9ca3af; line-height:1.5;">
          © 2026 AgriLink. Connecting Farmers & Buyers. <br>
          Cebu City, Philippines
        </p>
        <div style="margin-top:16px;">
          <p style="margin:0; font-size:12px; color:#d1d5db;">
            You received this email because you signed up for an AgriLink account.
          </p>
        </div>
      </td>
    </tr>

  </table>
</div>
`;
exports.getEmailVerificationTemplate = getEmailVerificationTemplate;

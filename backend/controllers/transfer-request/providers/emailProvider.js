const nodemailer = require("nodemailer");
const { BANK_NAME, BANK_CODE } = require("../../../config/bankConfig");

const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT);

// Configure mailer
const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    })
  : nodemailer.createTransport({
      jsonTransport: true,
    });

// Verify transporter connection (skip during tests to avoid noisy logs)
if (process.env.NODE_ENV !== "test") {
  if (!smtpConfigured) {
    console.log(
      "SMTP not configured. Emails will be logged via jsonTransport in development.",
    );
  } else {
    transporter.verify((error) => {
      if (error) {
        console.log("SMTP connection error:", error);
      } else {
        console.log("SMTP server is ready");
      }
    });
  }
}

exports.sendWelcomeEmail = async (user) => {
  await transporter.sendMail({
    from: {
      name: `${BANK_NAME}`,
      address: process.env.SMTP_FROM,
    },
    to: user.email,
    subject: `Welcome to ${BANK_NAME}!`,
    text: `Hello ${user.name},\n\nWelcome to ${BANK_NAME}! Your account has been successfully created.`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1565c0; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .footer { font-size: 12px; color: #777; text-align: center; padding: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ${BANK_NAME}</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${user.name}</strong>,</p>
              <p>Thank you for choosing ${BANK_NAME}. your account has been successfully created and is now active.</p>
              <p>You can now sign in to your dashboard to manage your accounts, make transfers, and more.</p>
              <br>
              <p>Best regards,</p>
              <p>The ${BANK_NAME} Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
};

exports.sendAccountRequestEmail = async (user, accountType) => {
  await transporter.sendMail({
    from: {
      name: `${BANK_NAME}`,
      address: process.env.SMTP_FROM,
    },
    to: user.email,
    subject: `Account Opening Request Received - ${BANK_NAME}`,
    text: `Hello ${user.name},\n\nWe have received your request to open a new ${accountType} account. Our team is currently reviewing your application.\n\nBank Code: ${BANK_CODE}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1565c0; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .footer { font-size: 12px; color: #777; text-align: center; padding: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Account Request Received</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${user.name}</strong>,</p>
              <p>We have received your request to open a new <strong>${accountType}</strong> account at ${BANK_NAME}.</p>
              <p>Our administration team is currently reviewing your application. You will receive another email once your account has been approved and activated.</p>
              <p><strong>Bank Identifier:</strong> ${BANK_CODE}</p>
              <br>
              <p>Best regards,</p>
              <p>The ${BANK_NAME} Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
};

exports.sendAccountApprovalEmail = async (user, account) => {
  await transporter.sendMail({
    from: {
      name: `${BANK_NAME}`,
      address: process.env.SMTP_FROM,
    },
    to: user.email,
    subject: `Your Account has been Approved! - ${BANK_NAME}`,
    text: `Hello ${user.name},\n\nCongratulations! Your new ${account.type} account has been approved and is now active.\n\nAccount Number: ${account.accountNumber}\nBank Code: ${BANK_CODE}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2e7d32; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .details { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { font-size: 12px; color: #777; text-align: center; padding: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Account Approved</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${user.name}</strong>,</p>
              <p>Great news! Your application for a new account at ${BANK_NAME} has been approved.</p>
              <div class="details">
                <p><strong>Account Type:</strong> ${account.type}</p>
                <p><strong>Account Number:</strong> ${account.accountNumber}</p>
                <p><strong>Bank Code:</strong> ${BANK_CODE}</p>
              </div>
              <p>You can now log in to your dashboard to start using your new account.</p>
              <br>
              <p>Best regards,</p>
              <p>The ${BANK_NAME} Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
};

exports.sendVerificationEmail = async (userEmail, transferRequest) => {
  await transporter.sendMail({
    from: {
      name: `${BANK_NAME} Transfers`,
      address: process.env.SMTP_FROM,
    },
    to: userEmail,
    subject: `[${BANK_CODE}] Transfer Verification Code`,
    text: `Your verification code for ${BANK_NAME} is ${transferRequest.code}. It expires in 10 minutes.`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1565c0; color: white; padding: 20px; text-align: center; }
            .code { font-size: 32px; font-weight: bold; color: #1565c0; text-align: center; padding: 20px; }
            .details { background-color: #f5f5f5; padding: 20px; border-radius: 5px; }
            .warning { color: #d32f2f; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${BANK_NAME} - Verification Code</h1>
            </div>
            <p>Please use the following code to verify your transfer. This code will expire in 10 minutes.</p>
            <div class="code">${transferRequest.code}</div>
            <div class="details">
              <h3>Transfer Details:</h3>
              <ul>
                <li>Amount: $${transferRequest.amount.toFixed(2)}</li>
                <li>To Account: ${transferRequest.toAccount}</li>
                <li>Bank Code: ${BANK_CODE}</li>
                <li>Description: ${transferRequest.description || "N/A"}</li>
              </ul>
            </div>
            <p class="warning">If you did not request this transfer from ${BANK_NAME}, please contact our support team immediately.</p>
          </div>
        </body>
      </html>
    `,
  });
};

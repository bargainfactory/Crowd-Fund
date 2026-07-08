const nodemailer = require('nodemailer');
const sgMail = process.env.SENDGRID_API_KEY ? require('@sendgrid/mail') : null;

if (sgMail && process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Create SMTP transporter as fallback
const createSMTPTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const FROM = `"${process.env.EMAIL_FROM_NAME || 'CrowdfundAfrica'}" <${process.env.EMAIL_FROM || 'noreply@crowdfundafrica.com'}>`;

// Core send function
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    if (sgMail && process.env.SENDGRID_API_KEY) {
      await sgMail.send({ to, from: FROM, subject, html, text });
    } else {
      const transporter = createSMTPTransporter();
      await transporter.sendMail({ from: FROM, to, subject, html, text });
    }
    console.log(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error('Email send failed:', error.message);
    return false;
  }
};

// Email templates
const sendWelcomeEmail = async ({ email, firstName, verificationUrl }) => {
  return sendEmail({
    to: email,
    subject: 'Welcome to CrowdfundAfrica!',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#16a34a;padding:30px;text-align:center">
          <h1 style="color:white;margin:0">CrowdfundAfrica</h1>
        </div>
        <div style="padding:30px;background:#f9fafb">
          <h2>Welcome, ${firstName}!</h2>
          <p>Thank you for joining CrowdfundAfrica. Together, we can make a difference in communities across Africa and beyond.</p>
          <p>Please verify your email address to get started:</p>
          <a href="${verificationUrl}" style="display:inline-block;background:#16a34a;color:white;padding:12px 30px;border-radius:6px;text-decoration:none;margin:20px 0">
            Verify Email Address
          </a>
          <p style="color:#6b7280;font-size:14px">This link expires in 24 hours. If you didn't create an account, please ignore this email.</p>
        </div>
      </div>
    `
  });
};

const sendPasswordResetEmail = async ({ email, firstName, resetUrl }) => {
  return sendEmail({
    to: email,
    subject: 'Password Reset - CrowdfundAfrica',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#16a34a;padding:30px;text-align:center">
          <h1 style="color:white;margin:0">CrowdfundAfrica</h1>
        </div>
        <div style="padding:30px">
          <h2>Password Reset Request</h2>
          <p>Hi ${firstName}, you requested a password reset.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#dc2626;color:white;padding:12px 30px;border-radius:6px;text-decoration:none;margin:20px 0">
            Reset Password
          </a>
          <p style="color:#6b7280;font-size:14px">This link expires in 10 minutes. If you didn't request this, ignore this email.</p>
        </div>
      </div>
    `
  });
};

const sendDonationConfirmationEmail = async ({ email, donorName, campaignTitle, amount, currency, txHash, receiptUrl }) => {
  return sendEmail({
    to: email,
    subject: `Donation Confirmed - ${campaignTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#16a34a;padding:30px;text-align:center">
          <h1 style="color:white;margin:0">CrowdfundAfrica</h1>
        </div>
        <div style="padding:30px">
          <h2>Thank you for your donation!</h2>
          <p>Dear ${donorName || 'Donor'},</p>
          <p>Your donation of <strong>${currency} ${amount.toLocaleString()}</strong> to <strong>${campaignTitle}</strong> has been confirmed.</p>
          ${txHash ? `<p style="background:#f0fdf4;padding:12px;border-radius:6px;word-break:break-all">
            <strong>Blockchain Tx:</strong> ${txHash}
          </p>` : ''}
          ${receiptUrl ? `<a href="${receiptUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 30px;border-radius:6px;text-decoration:none;margin:20px 0">
            Download Tax Receipt
          </a>` : ''}
          <p>Your generosity helps build stronger communities.</p>
        </div>
      </div>
    `
  });
};

const sendCampaignApprovedEmail = async ({ email, firstName, campaignTitle, campaignUrl }) => {
  return sendEmail({
    to: email,
    subject: `Campaign Approved - ${campaignTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#16a34a;padding:30px;text-align:center">
          <h1 style="color:white;margin:0">CrowdfundAfrica</h1>
        </div>
        <div style="padding:30px">
          <h2>Your campaign is live!</h2>
          <p>Hi ${firstName}, great news! Your campaign "<strong>${campaignTitle}</strong>" has been approved and is now live.</p>
          <a href="${campaignUrl}" style="display:inline-block;background:#16a34a;color:white;padding:12px 30px;border-radius:6px;text-decoration:none;margin:20px 0">
            View Your Campaign
          </a>
          <p>Start sharing your campaign link to reach your goal!</p>
        </div>
      </div>
    `
  });
};

const sendMilestoneNotificationEmail = async ({ email, firstName, campaignTitle, milestoneTitle, amount, campaignUrl }) => {
  return sendEmail({
    to: email,
    subject: `Milestone Reached! - ${campaignTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#f59e0b;padding:30px;text-align:center">
          <h1 style="color:white;margin:0">Milestone Reached!</h1>
        </div>
        <div style="padding:30px">
          <h2>Congratulations, ${firstName}!</h2>
          <p>Your campaign "<strong>${campaignTitle}</strong>" has reached the milestone: <strong>${milestoneTitle}</strong> (${amount}).</p>
          <a href="${campaignUrl}" style="display:inline-block;background:#f59e0b;color:white;padding:12px 30px;border-radius:6px;text-decoration:none;margin:20px 0">
            View Campaign Progress
          </a>
        </div>
      </div>
    `
  });
};

const sendGoalReachedEmail = async ({ email, firstName, campaignTitle, totalRaised, currency }) => {
  return sendEmail({
    to: email,
    subject: `Goal Reached! - ${campaignTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#16a34a;padding:30px;text-align:center">
          <h1 style="color:white;margin:0">Goal Achieved!</h1>
        </div>
        <div style="padding:30px">
          <h2>Amazing, ${firstName}!</h2>
          <p>Your campaign "<strong>${campaignTitle}</strong>" has reached its funding goal!</p>
          <p>Total raised: <strong>${currency} ${totalRaised.toLocaleString()}</strong></p>
          <p>The CrowdfundAfrica team will process your payout shortly. Thank you for making a difference!</p>
        </div>
      </div>
    `
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendDonationConfirmationEmail,
  sendCampaignApprovedEmail,
  sendMilestoneNotificationEmail,
  sendGoalReachedEmail
};

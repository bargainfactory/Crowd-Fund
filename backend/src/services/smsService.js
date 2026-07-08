let twilioClient;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  const twilio = require('twilio');
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

const sendSMS = async ({ to, message }) => {
  if (!twilioClient) {
    console.log(`[SMS Mock] To: ${to}, Message: ${message}`);
    return { success: true, mock: true };
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to
    });
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('SMS send failed:', error.message);
    return { success: false, error: error.message };
  }
};

const sendVerificationCode = async ({ phone, code }) => {
  return sendSMS({
    to: phone,
    message: `Your CrowdfundAfrica verification code is: ${code}. Valid for 10 minutes.`
  });
};

const sendDonationSMS = async ({ phone, amount, currency, campaignTitle }) => {
  return sendSMS({
    to: phone,
    message: `CrowdfundAfrica: Your donation of ${currency} ${amount} to "${campaignTitle}" was successful. Thank you!`
  });
};

const sendCampaignUpdateSMS = async ({ phone, campaignTitle, update }) => {
  return sendSMS({
    to: phone,
    message: `CrowdfundAfrica Update: "${campaignTitle}" - ${update.substring(0, 100)}`
  });
};

const sendTwoFactorCode = async ({ phone, code }) => {
  return sendSMS({
    to: phone,
    message: `Your CrowdfundAfrica 2FA code is: ${code}. Do not share this with anyone.`
  });
};

module.exports = {
  sendSMS,
  sendVerificationCode,
  sendDonationSMS,
  sendCampaignUpdateSMS,
  sendTwoFactorCode
};

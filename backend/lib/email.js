// Sends email through Resend. Without RESEND_API_KEY nothing is sent and the subject is logged instead, so bookings still
// work in development. A failed email is logged and never fails the request that caused it.
const FROM = process.env.BOOKING_FROM_EMAIL || 'Venture-Pro <bookings@venture-pro.io>';

const sendEmail = async ({ to, subject, text, attachments = [] }) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`Email not sent (RESEND_API_KEY is not set). Subject: ${subject}`);
    return false;
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to, subject, text, attachments }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      console.error('Email failed:', response.status, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error('Email failed:', error.message);
    return false;
  }
};

module.exports = { sendEmail };

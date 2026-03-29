const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

// .env 로드
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testMail() {
  console.log('Testing SMTP with:', process.env.SMTP_USER);
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.SMTP_USER, // 자기 자신에게 테스트
      subject: 'SMTP Test',
      text: 'SMTP is working!',
    });
    console.log('Success:', info.response);
  } catch (error) {
    console.error('Failure:', error);
  }
}

testMail();

process.env.COOKIE_NAME = process.env.COOKIE_NAME || 'bp_session';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3055';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.EMAIL_PROVIDER = 'console';
process.env.EMAIL_CAPTURE = '1'; // emails go to /__dev/outbox instead of being printed

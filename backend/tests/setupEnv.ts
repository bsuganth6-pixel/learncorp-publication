// Test env — deliberately no MONGODB_URI: these tests never connect to a database
// (see tests/README.md for what that does and doesn't cover).
process.env.JWT_SECRET = 'test-secret-not-for-production';
process.env.JWT_EXPIRES_IN = '7d';
process.env.COOKIE_NAME = 'bp_session';
process.env.NODE_ENV = 'test';
process.env.CLIENT_URL = 'http://localhost:3000';

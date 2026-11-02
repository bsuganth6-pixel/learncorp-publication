// Test env. Unit tests never connect to a database; the *.int.test.ts suites do, through
// MONGODB_TEST_URI (see tests/README.md). Email never leaves the process: the console provider
// collects messages in an in-memory outbox that tests read.
process.env.COOKIE_NAME = 'bp_session';
process.env.NODE_ENV = 'test';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.EMAIL_PROVIDER = 'console';

if (process.env.RUN_FLIGHT_INTEGRATION !== '1' || new URL(process.env.DATABASE_URL).searchParams.get('schema') !== 'flight_platform_test') throw new Error('Transport fixture requires isolated test schema');
const app = require('../../dist/src/app').default;
const server = app.listen(0, '127.0.0.1', () => process.send({ port: server.address().port }));

import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
    },
  }),
  base: { service: 'smarted-backend', env: process.env.NODE_ENV },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

export const info = (...args) => logger.info(args.join(' '));
export const warn = (...args) => logger.warn(args.join(' '));
export const error = (...args) => logger.error(args.join(' '));
export const debug = (...args) => logger.debug(args.join(' '));

export default logger;

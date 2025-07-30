import pino from 'pino'

const isProduction = process.env.NODE_ENV === 'production'

export const logger = pino(
  isProduction
    ? {
        level: 'info',
        formatters: {
          level: (label: string) => ({ level: label })
        }
      }
    : {
        level: 'debug',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
            messageFormat: '{msg}',
            customColors: 'trace:gray,debug:blue,info:green,warn:yellow,error:red,fatal:magenta'
          }
        }
      }
)

export default logger

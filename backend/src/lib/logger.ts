const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  info: (message: string, meta?: object) => {
    console.log(JSON.stringify({ level: 'info', message, ...meta }));
  },
  
  warn: (message: string, meta?: object) => {
    console.warn(JSON.stringify({ level: 'warn', message, ...meta }));
  },
  
  error: (message: string, meta?: object) => {
    if (isDev) {
      console.error(JSON.stringify({ level: 'error', message, ...meta }));
    } else {
      console.error(JSON.stringify({ level: 'error', message, ...meta }));
    }
  },

  debug: (message: string, meta?: object) => {
    if (isDev) {
      console.log(JSON.stringify({ level: 'debug', message, ...meta }));
    }
  }
};

export default logger;
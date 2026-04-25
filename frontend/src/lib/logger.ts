const isDev = import.meta.env.DEV;

export const logger = {
  debug: isDev ? console.debug.bind(console) : () => {},
  info:  isDev ? console.info.bind(console)  : () => {},
  warn:  console.warn.bind(console),
  error: console.error.bind(console),
};

const args=process.argv.slice(2),portIndex=args.indexOf('--port');
if(portIndex>=0&&args[portIndex+1])process.env.PORT=args[portIndex+1];
process.env.NODE_ENV='development';
await import('../src/server.js');

// Start on the server, from this directory:
//   pm2 start ecosystem.config.cjs && pm2 save
//
// Do not add `-H 127.0.0.1`. Next.js then sends locale rewrites to
// https://localhost:3000 and Nginx returns 500.
module.exports = {
  apps: [
    {
      name: "gharkoswad",
      cwd: __dirname,
      script: "npm",
      args: "start",
      interpreter: "none",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "700M",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};

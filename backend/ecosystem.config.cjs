/**
 * PM2 production config — run from backend/ after `npm run build`.
 *
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 */
module.exports = {
  apps: [
    {
      name: "cms-api",
      cwd: __dirname,
      script: "./dist/index.mjs",
      interpreter: "node",
      node_args: "--env-file=.env --enable-source-maps",
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};

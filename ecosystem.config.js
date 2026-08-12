module.exports = {
  apps: [
    {
      name: "jsw-backend",
      script: "src/index.js",
      cwd: __dirname,
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
      env_file: ".env",
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};

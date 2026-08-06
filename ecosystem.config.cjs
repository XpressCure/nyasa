module.exports = {
  apps: [
    {
      name: "nyasa-api",
      cwd: "./apps/api",
      script: "src/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 4100
      }
    }
  ]
};

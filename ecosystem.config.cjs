module.exports = {
  apps: [
    {
      name: 'rfp-simulator',
      script: 'node',
      args: '--import tsx/esm src/index.tsx',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false, // Disable PM2 file monitoring  
      instances: 1, // Development mode uses only one instance
      exec_mode: 'fork'
    }
  ]
}
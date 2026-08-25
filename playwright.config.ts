import{defineConfig,devices}from'@playwright/test';

const viewports=[
  {name:'mobile-360',width:360,height:800},
  {name:'mobile-390',width:390,height:844},
  {name:'tablet-768',width:768,height:1024},
  {name:'tablet-1024',width:1024,height:768},
  {name:'desktop-1280',width:1280,height:800},
  {name:'desktop-1440',width:1440,height:900},
];

export default defineConfig({
  testDir:'./tests/e2e',
  fullyParallel:true,
  forbidOnly:Boolean(process.env.CI),
  retries:process.env.CI?2:0,
  workers:process.env.CI?2:6,
  reporter:process.env.CI?'github':'list',
  use:{baseURL:'http://127.0.0.1:4173',trace:'retain-on-failure'},
  projects:viewports.map(({name,width,height})=>({
    name,
    use:{...devices['Desktop Chrome'],viewport:{width,height}},
  })),
  webServer:{
    command:'pnpm exec vite preview --config vite.config.ts --host 127.0.0.1 --port 4173',
    url:'http://127.0.0.1:4173',
    reuseExistingServer:!process.env.CI,
    timeout:60_000,
  },
});

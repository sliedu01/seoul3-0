const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'), // 필요한 경우 preload 설정
    },
    title: "서울3.0 - 데스크톱",
    autoHideMenuBar: true, // 메뉴바 자동 숨김
  });

  // 개발 모드에서는 로컬 서버(3000) 로드, 운영 모드에서는 빌드된 파일 로드
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '.next/server/app/index.html')}`; // Next.js 빌드 구조에 맞게 조정 필요

  win.loadURL(startUrl);

  if (isDev) {
    win.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

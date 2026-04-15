const { contextBridge, ipcRenderer } = require('electron');

// 웹 페이지에서 사용할 수 있는 PC 전용 API 노출
contextBridge.exposeInMainWorld('electronAPI', {
  // 예: 창 닫기, 최소화 등 제어 기능 추가 가능
  closeWindow: () => ipcRenderer.send('window-close'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
});

console.log('서울3.0 Desktop Preload Script Loaded');

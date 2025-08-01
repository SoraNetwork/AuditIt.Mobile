import { onMounted, onBeforeUnmount, ref } from 'vue';
import { Html5Qrcode, type CameraDevice, type Html5QrcodeFullConfig } from 'html5-qrcode';
import type { Html5QrcodeResult } from 'html5-qrcode/core';

type Qrbox = (viewfinderWidth: number, viewfinderHeight: number) => { width: number; height: number; };

interface ScannerOptions {
  readerId: string;
  qrbox: Qrbox | { width: number; height: number };
  fps?: number;
  onSuccess: (decodedText: string, result: Html5QrcodeResult) => void;
  onError?: (errorMessage: string) => void;
}

export function useScanner(options: ScannerOptions) {
  const { readerId, qrbox, fps = 10, onSuccess, onError } = options;
  const scanner = ref<Html5Qrcode | null>(null);
  const error = ref<string | null>(null);
  const cameras = ref<CameraDevice[]>([]);
  const currentCameraId = ref<string | null>(null);

  const stopAndClear = async () => {
    if (scanner.value) {
      if (scanner.value.isScanning) {
        try {
          await scanner.value.stop();
        } catch (err) {
          console.warn("停止扫描器时发生预期内的错误:", err);
        }
      }
      try {
        await scanner.value.clear();
      } catch (err) {
        console.warn("清理扫描器时发生预期内的错误:", err);
      }
      scanner.value = null;
    }
  };

  const start = async (deviceId: string) => {
    await stopAndClear();
    
    currentCameraId.value = deviceId;
    const element = document.getElementById(readerId);
    if (!element) {
      error.value = `扫描器DOM元素未找到: #${readerId}`;
      return;
    }
    element.innerHTML = '';

    const config: Html5QrcodeFullConfig = {
      verbose: false,
      experimentalFeatures: { useBarCodeDetectorIfSupported: true }
    };
    scanner.value = new Html5Qrcode(readerId, config);
    
    const scanConfig = { fps, qrbox };

    try {
      await scanner.value.start(
        deviceId,
        scanConfig,
        onSuccess,
        onError
      );
    } catch (err) {
      error.value = `无法使用ID ${deviceId} 启动扫描器: ${err}`;
      console.error(error.value);
    }
  };

  const changeCamera = (deviceId: string) => {
    if (deviceId !== currentCameraId.value) {
      start(deviceId);
    }
  };

  onMounted(async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length) {
        cameras.value = devices;
        
        // **核心逻辑：优先选择后置摄像头**
        // 1. 查找标签中包含 'back' 或 'rear' 的摄像头
        let preferredCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear'));
        
        // 2. 如果找不到，则选择第一个设备作为备用
        const defaultCameraId = preferredCamera ? preferredCamera.id : devices[0].id;
        
        start(defaultCameraId);
      } else {
        error.value = "未找到摄像头设备";
      }
    } catch (err) {
      error.value = `获取摄像头失败: ${err}`;
    }
  });

  onBeforeUnmount(() => {
    stopAndClear();
  });

  return {
    error,
    cameras,
    currentCameraId,
    changeCamera,
  };
}
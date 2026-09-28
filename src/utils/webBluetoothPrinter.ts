/**
 * Web Bluetooth Thermal Printer Manager.
 * Communicates directly with Bluetooth Thermal Receipt / KOT Printers (58mm & 80mm) via Web Bluetooth API (GATT).
 * Bypasses OS spoolers and print dialogs for instant hardware printing.
 */

export interface BluetoothPrinterDevice {
  id: string;
  name: string;
  device: any;
  server?: any;
  characteristic?: any;
  serviceUuid?: string;
  characteristicUuid?: string;
}

// Well-known BLE GATT Service UUIDs used by standard ESC/POS Bluetooth Thermal Printers
// (GOOJPRT, PT-210, MPT-II, POS-5802, Netum, Xprinter, Epson, Zebra, MUNBYN, and generic POS printers)
export const KNOWN_PRINTER_SERVICES = [
  // Generic / Standard Serial Port Profile over BLE
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb',
  '0000fff0-0000-1000-8000-00805f9b34fb',
  '0000af30-0000-1000-8000-00805f9b34fb',
  '0000ae30-0000-1000-8000-00805f9b34fb',
  '0000ae00-0000-1000-8000-00805f9b34fb',
  '0000ff12-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent Service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Nordic UART Service (NUS)
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART v2
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / CC2541 common BLE
];

let activeBluetoothDevice: any = null;
let activeGattServer: any = null;
let activeWriteCharacteristic: any = null;
let activeDeviceName: string = '';

/**
 * Checks if the current browser environment supports the Web Bluetooth API.
 */
export function isBluetoothPrintingSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/**
 * Gets the current active Bluetooth printer status and name.
 */
export function getActiveBluetoothPrinter(): { connected: boolean; name: string } {
  const isConnected = Boolean(
    activeBluetoothDevice &&
    activeBluetoothDevice.gatt &&
    activeBluetoothDevice.gatt.connected &&
    activeWriteCharacteristic
  );
  return {
    connected: isConnected,
    name: activeDeviceName || (activeBluetoothDevice?.name ?? 'Bluetooth Printer'),
  };
}

/**
 * Finds a writable characteristic across available GATT services of the printer.
 */
async function discoverWritableCharacteristic(server: any): Promise<any> {
  // Try known services first
  for (const serviceUuid of KNOWN_PRINTER_SERVICES) {
    try {
      const service = await server.getPrimaryService(serviceUuid);
      if (service) {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            return char;
          }
        }
      }
    } catch {
      // Continue searching next service
    }
  }

  // Fallback: iterate over all primary services discovered on the device
  try {
    const services = await server.getPrimaryServices();
    for (const service of services) {
      try {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            return char;
          }
        }
      } catch {}
    }
  } catch {}

  return null;
}

/**
 * Prompts the user to pair and connect a Bluetooth Thermal Printer.
 */
export async function requestWebBluetoothPrinter(): Promise<BluetoothPrinterDevice | null> {
  if (!isBluetoothPrintingSupported()) {
    throw new Error('Web Bluetooth is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Opera.');
  }

  try {
    const nav = navigator as any;
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: KNOWN_PRINTER_SERVICES,
    });

    if (!device) {
      throw new Error('No Bluetooth printer selected.');
    }

    // Add disconnection listener
    device.addEventListener('gattserverdisconnected', () => {
      console.warn(`[Bluetooth Printer] Device "${device.name || 'Printer'}" disconnected.`);
      activeWriteCharacteristic = null;
      activeGattServer = null;
    });

    console.log(`[Bluetooth Printer] Connecting to GATT server of ${device.name}...`);
    const server = await device.gatt.connect();

    const characteristic = await discoverWritableCharacteristic(server);
    if (!characteristic) {
      throw new Error(`Connected to "${device.name || 'Printer'}", but could not find a writable ESC/POS print characteristic. Please ensure the printer is turned on and ready.`);
    }

    activeBluetoothDevice = device;
    activeGattServer = server;
    activeWriteCharacteristic = characteristic;
    activeDeviceName = device.name || 'Bluetooth Thermal Printer';

    // Store in localStorage for reference
    try {
      localStorage.setItem('menukit_paired_bt_printer_name', activeDeviceName);
      localStorage.setItem('menukit_paired_bt_printer_id', device.id);
    } catch {}

    return {
      id: device.id,
      name: activeDeviceName,
      device,
      server,
      characteristic,
      serviceUuid: characteristic.service?.uuid,
      characteristicUuid: characteristic.uuid,
    };
  } catch (err: any) {
    // User cancelled the picker — treat as silent no-op
    if (err.name === 'NotFoundError' || err.message?.includes('cancelled') || err.message?.includes('User cancelled')) {
      return null;
    }
    // Permission denied / Bluetooth blocked — rethrow so caller can show UI guidance
    if (err.name === 'NotAllowedError' || err.message?.toLowerCase().includes('blocked') || err.message?.toLowerCase().includes('permission')) {
      console.warn('[Bluetooth Printer] Permission blocked:', err.message);
      throw err;
    }
    console.error('Bluetooth printer pairing error:', err);
    throw err;
  }
}

/**
 * Ensures active GATT connection to the Bluetooth printer before writing.
 */
async function ensureBluetoothConnected(): Promise<any> {
  if (
    activeBluetoothDevice &&
    activeBluetoothDevice.gatt &&
    activeBluetoothDevice.gatt.connected &&
    activeWriteCharacteristic
  ) {
    return activeWriteCharacteristic;
  }

  if (activeBluetoothDevice && activeBluetoothDevice.gatt) {
    try {
      console.log('[Bluetooth Printer] Re-connecting GATT server...');
      const server = await activeBluetoothDevice.gatt.connect();
      const characteristic = await discoverWritableCharacteristic(server);
      if (characteristic) {
        activeGattServer = server;
        activeWriteCharacteristic = characteristic;
        return characteristic;
      }
    } catch (e) {
      console.warn('[Bluetooth Printer] Reconnection attempt failed:', e);
    }
  }

  // If no active device in memory, prompt user to pair
  const paired = await requestWebBluetoothPrinter();
  if (paired && paired.characteristic) {
    return paired.characteristic;
  }

  throw new Error('Bluetooth printer is not connected. Please pair your Bluetooth printer in Settings or the print dialog.');
}

/**
 * Sends raw ESC/POS binary data to the connected Bluetooth thermal printer.
 * Chunks data into small MTU packets (100 bytes) with a micro-delay to prevent buffer overruns.
 */
export async function sendEscPosToBluetooth(data: Uint8Array): Promise<boolean> {
  const characteristic = await ensureBluetoothConnected();
  if (!characteristic) {
    throw new Error('No writable Bluetooth characteristic available.');
  }

  // Typical BLE MTU payload size for reliable thermal printing is 100-128 bytes
  const CHUNK_SIZE = 100;
  const totalLength = data.length;

  for (let offset = 0; offset < totalLength; offset += CHUNK_SIZE) {
    const chunk = data.slice(offset, Math.min(offset + CHUNK_SIZE, totalLength));
    
    if (characteristic.writeValueWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk);
    } else if (characteristic.writeValue) {
      await characteristic.writeValue(chunk);
    } else {
      await (characteristic as any).writeValueWithResponse(chunk);
    }

    // Small micro-delay (15ms) between BLE packets to ensure printer MCU processes cleanly
    if (offset + CHUNK_SIZE < totalLength) {
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
  }

  return true;
}

/**
 * Disconnects the active Bluetooth printer.
 */
export function disconnectBluetoothPrinter(): void {
  try {
    if (activeBluetoothDevice && activeBluetoothDevice.gatt && activeBluetoothDevice.gatt.connected) {
      activeBluetoothDevice.gatt.disconnect();
    }
  } catch (e) {
    console.error('Error disconnecting Bluetooth printer:', e);
  } finally {
    activeBluetoothDevice = null;
    activeGattServer = null;
    activeWriteCharacteristic = null;
    activeDeviceName = '';
  }
}

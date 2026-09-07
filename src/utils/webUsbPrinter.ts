/**
 * WebUSB and WebSerial Manager for Direct Hardware Thermal Printing in Browser.
 * Bypasses OS print spooler and dialogs, streaming raw ESC/POS bytes directly.
 */

export interface UsbPrinterDevice {
  type: 'webusb' | 'webserial';
  name: string;
  vendorId?: number;
  productId?: number;
  device?: any;
}

let activeUsbDevice: any = null;
let activeSerialPort: any = null;

/**
 * Checks if the current browser environment supports direct USB/Serial access.
 */
export function isHardwarePrintingSupported(): { usb: boolean; serial: boolean } {
  const usb = typeof navigator !== 'undefined' && 'usb' in navigator;
  const serial = typeof navigator !== 'undefined' && 'serial' in navigator;
  return { usb, serial };
}

/**
 * Requests the user to pair a USB Thermal Printer via WebUSB.
 */
export async function requestWebUsbPrinter(): Promise<UsbPrinterDevice | null> {
  if (!('usb' in navigator)) {
    throw new Error('WebUSB is not supported in this browser. Please use Chrome, Edge, or Opera.');
  }

  try {
    const device = await (navigator as any).usb.requestDevice({
      filters: [] // Let user select any connected thermal printer
    });

    await device.open();
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }
    await device.claimInterface(0);

    activeUsbDevice = device;
    return {
      type: 'webusb',
      name: device.productName || `USB Thermal Printer (${device.vendorId}:${device.productId})`,
      vendorId: device.vendorId,
      productId: device.productId,
      device,
    };
  } catch (err: any) {
    console.error('WebUSB pairing failed:', err);
    throw err;
  }
}

/**
 * Requests the user to pair a Serial/COM/Virtual COM printer.
 */
export async function requestWebSerialPrinter(): Promise<UsbPrinterDevice | null> {
  if (!('serial' in navigator)) {
    throw new Error('WebSerial is not supported in this browser. Please use Chrome or Edge.');
  }

  try {
    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate: 9600 });
    activeSerialPort = port;
    const info = port.getInfo ? port.getInfo() : {};
    return {
      type: 'webserial',
      name: 'Serial / COM Thermal Printer',
      vendorId: info.usbVendorId,
      productId: info.usbProductId,
      device: port,
    };
  } catch (err: any) {
    console.error('WebSerial pairing failed:', err);
    throw err;
  }
}

/**
 * Sends raw ESC/POS binary data to the active paired USB / Serial printer.
 */
export async function sendEscPosToDevice(data: Uint8Array, preferredType?: 'webusb' | 'webserial'): Promise<boolean> {
  // Try WebUSB first
  if (activeUsbDevice && preferredType !== 'webserial') {
    try {
      if (!activeUsbDevice.opened) {
        await activeUsbDevice.open();
        if (activeUsbDevice.configuration === null) {
          await activeUsbDevice.selectConfiguration(1);
        }
        await activeUsbDevice.claimInterface(0);
      }

      // Transfer data to OUT endpoint
      const endpoint = activeUsbDevice.configuration?.interfaces?.[0]?.alternate?.endpoints?.find(
        (ep: any) => ep.direction === 'out'
      );
      const endpointNumber = endpoint ? endpoint.endpointNumber : 1;

      await activeUsbDevice.transferOut(endpointNumber, data);
      return true;
    } catch (usbErr) {
      console.warn('Direct WebUSB send failed, falling back to WebSerial:', usbErr);
    }
  }

  // Try WebSerial
  if (activeSerialPort) {
    try {
      if (!activeSerialPort.readable && !activeSerialPort.writable) {
        await activeSerialPort.open({ baudRate: 9600 });
      }
      const writer = activeSerialPort.writable.getWriter();
      await writer.write(data);
      writer.releaseLock();
      return true;
    } catch (serialErr) {
      console.error('Direct WebSerial send failed:', serialErr);
    }
  }

  return false;
}

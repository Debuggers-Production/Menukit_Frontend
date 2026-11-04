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
 * Requests the user to pair a USB Thermal Printer via WebUSB or WebSerial.
 * Gracefully handles user cancellation and Windows OS driver locks.
 */
export async function requestWebUsbPrinter(): Promise<UsbPrinterDevice | null> {
  const nav = navigator as any;

  // 1. Try WebSerial first if available (Windows COM, USB-Serial, virtual Bluetooth COM ports like KPC307)
  if ('serial' in nav) {
    try {
      const port = await nav.serial.requestPort();
      if (!port) return null;

      // Close if previously open
      if (port.readable || port.writable) {
        try {
          await port.close();
        } catch {}
      }

      await port.open({ baudRate: 9600 });
      activeSerialPort = port;
      const info = port.getInfo ? port.getInfo() : {};
      const devName = info.usbVendorId
        ? `USB Serial (VID: ${info.usbVendorId.toString(16).padStart(4, '0')}, PID: ${(info.usbProductId || 0).toString(16).padStart(4, '0')})`
        : 'Serial / COM Thermal Printer (9600 baud)';

      try {
        localStorage.setItem('menukit_paired_usb_type', 'webserial');
        localStorage.setItem('menukit_paired_usb_name', devName);
      } catch {}

      return {
        type: 'webserial',
        name: devName,
        vendorId: info.usbVendorId,
        productId: info.usbProductId,
        device: port,
      };
    } catch (err: any) {
      // User cancelled dialog
      if (err.name === 'NotFoundError' || err.message?.includes('cancelled') || err.message?.includes('canceled')) {
        return null;
      }
      console.warn('[WebSerial] Port request failed, attempting WebUSB fallback:', err);
    }
  }

  // 2. Try WebUSB (direct raw USB thermal printers)
  if ('usb' in nav) {
    try {
      const device = await nav.usb.requestDevice({
        filters: [] // Let user select any connected thermal printer
      });
      if (!device) return null;

      await device.open();
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }
      await device.claimInterface(0);

      activeUsbDevice = device;
      const devName = device.productName || `USB Thermal Printer (${device.vendorId.toString(16)}:${device.productId.toString(16)})`;

      try {
        localStorage.setItem('menukit_paired_usb_type', 'webusb');
        localStorage.setItem('menukit_paired_usb_name', devName);
      } catch {}

      return {
        type: 'webusb',
        name: devName,
        vendorId: device.vendorId,
        productId: device.productId,
        device,
      };
    } catch (err: any) {
      if (err.name === 'NotFoundError' || err.message?.includes('cancelled') || err.message?.includes('canceled')) {
        return null;
      }
      console.error('[WebUSB] Pairing failed:', err);
      throw new Error(err.message || 'Failed to connect to USB printer. If using Windows, try connecting via Serial/COM port.');
    }
  }

  throw new Error('WebUSB / WebSerial is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
}

/**
 * Requests the user to pair a Serial/COM/Virtual COM printer.
 */
export async function requestWebSerialPrinter(): Promise<UsbPrinterDevice | null> {
  const nav = navigator as any;
  if (!('serial' in nav)) {
    throw new Error('WebSerial is not supported in this browser. Please use Chrome or Edge.');
  }

  try {
    const port = await nav.serial.requestPort();
    if (!port) return null;

    if (port.readable || port.writable) {
      try {
        await port.close();
      } catch {}
    }

    await port.open({ baudRate: 9600 });
    activeSerialPort = port;
    const info = port.getInfo ? port.getInfo() : {};
    const devName = info.usbVendorId
      ? `USB Serial (VID: ${info.usbVendorId.toString(16).padStart(4, '0')}, PID: ${(info.usbProductId || 0).toString(16).padStart(4, '0')})`
      : 'Serial / COM Thermal Printer';

    try {
      localStorage.setItem('menukit_paired_usb_type', 'webserial');
      localStorage.setItem('menukit_paired_usb_name', devName);
    } catch {}

    return {
      type: 'webserial',
      name: devName,
      vendorId: info.usbVendorId,
      productId: info.usbProductId,
      device: port,
    };
  } catch (err: any) {
    if (err.name === 'NotFoundError' || err.message?.includes('cancelled') || err.message?.includes('canceled')) {
      return null;
    }
    console.error('WebSerial pairing failed:', err);
    throw err;
  }
}

/**
 * Sends raw ESC/POS binary data to the active paired USB / Serial printer.
 * Supports auto-reconnect to previously authorized USB and Serial devices.
 */
export async function sendEscPosToDevice(data: Uint8Array, preferredType?: 'webusb' | 'webserial'): Promise<boolean> {
  const nav = navigator as any;

  // 1. Auto-reconnect to already authorized WebUSB device if memory handle is missing
  if (!activeUsbDevice && typeof nav !== 'undefined' && 'usb' in nav && preferredType !== 'webserial') {
    try {
      const devices = await nav.usb.getDevices();
      if (devices.length > 0) {
        const dev = devices[0];
        await dev.open();
        if (dev.configuration === null) await dev.selectConfiguration(1);
        await dev.claimInterface(0);
        activeUsbDevice = dev;
      }
    } catch {}
  }

  // 2. Auto-reconnect to already authorized WebSerial port if memory handle is missing
  if (!activeSerialPort && typeof nav !== 'undefined' && 'serial' in nav) {
    try {
      const ports = await nav.serial.getPorts();
      if (ports.length > 0) {
        const p = ports[0];
        if (!p.readable && !p.writable) {
          await p.open({ baudRate: 9600 });
        }
        activeSerialPort = p;
      }
    } catch {}
  }

  // Try WebUSB
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

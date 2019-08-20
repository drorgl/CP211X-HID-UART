# CP2110 and CP2114
The Silicon Laboratories CP2110 and CP2114 are USB HID to UART bridges

#### This is an incomplete project, it was started as a POC but was abandoned.

The project is based on [node-hid](https://www.npmjs.com/package/node-hid):
```typescript
import HID from 'node-hid';
```
We then look for devices from SILAB, note that some of them are virtual com ports, so there is no need to use this project for them, [SerialPort](https://www.npmjs.com/package/serialport) will do.
```typescript
let devices = HID.devices().filter(v=>v.vendorId == 0x10C4);
console.log('SILAB devices:', devices);
```

If we find what we need, we can create a new HID instance:
```typescript
let device = new HID.HID( devices[0].path );
```

Once we have HID instance, we can pass it to HidUart:
```typescript
let hiduart = new HidUart(device);
```

And then retrieve its configuration/status:
```typescript
let hidconfig = hiduart.get_config();
let isEnabled = hiduart.is_enabled();
console.log(hidconfig,isEnabled);
```

Its also possible to set configuration:
```typescript
hidconfig.baud_rate = 115200;
hidconfig.data_bits = DataBits.Bits8;
hidconfig.flow_control = FlowControl.None;
hidconfig.parity = Parity.None;
hidconfig.stop_bits = StopBits.Short;

hiduart.set_config(hidconfig);
hiduart.enable();
```

It's possible to send data, but node-hid uses an array of numbers and not buffers, so this is how it might look:
```typescript
hiduart.write([1,2,3]);
```

It is also possible to retrieve raw data, but the CP21XX encodes the first byte with the length of the message, otherwise you'll get many nulls.
```typescript
device.on('data', function(data) {
    console.log("got data:", data.toString('hex') );
});
```

This is as far as I got.


#### References
- https://www.silabs.com/documents/public/application-notes/AN434-CP2110-4-Interface-Specification.pdf
- https://www.silabs.com/products/interface/usb-bridges/classic-usb-bridges/device.cp2110-f01-gm



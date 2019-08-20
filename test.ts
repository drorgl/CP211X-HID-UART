import HID from 'node-hid';
import { HidUart, DataBits, FlowControl, Parity, StopBits } from './cp211x_uart';
let devices = HID.devices().filter(v=>v.vendorId == 0x10C4);
console.log('SILAB devices:', devices);

let device = new HID.HID( devices[0].path );

let hiduart = new HidUart(device);
hiduart.enable();

let hidconfig = hiduart.get_config();
let isEnabled = hiduart.is_enabled();
console.log(hidconfig,isEnabled);

hidconfig.baud_rate = 115200;
hidconfig.data_bits = DataBits.Bits8;
hidconfig.flow_control = FlowControl.None;
hidconfig.parity = Parity.None;
hidconfig.stop_bits = StopBits.Short;

hiduart.set_config(hidconfig);
hiduart.enable();

console.log("Attaching receive 'data' handler");
device.on('data', function(data) {
    console.log("got data:", data.toString('hex') );
});
device.on('error', function(err) {
    console.log("error:",err);
});

hiduart.write([1,2,3]);
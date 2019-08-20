// HID-UART driver for CP2110/CP2114 chipset.
// 
// Reference:
// https://www.silabs.com/documents/public/application-notes/AN434-CP2110-4-Interface-Specification.pdf
import nodehid, { HID } from "node-hid";
import bitwise from "bitwise";

const FEATURE_REPORT_LENGTH = 64;
const INTERRUPT_REPORT_LENGTH = 64;

//Device Configuration Section
const SET_RESET_DEVICE = 0x40; //Set Reset Device
const GET_SET_UART_ENABLE = 0x41; // Get Set Receive Status
const GET_UART_STATUS = 0x42; //Get UART Status
const PURGE_FIFOS        = 0x43; // Set Purge FIFOs
const GET_GPIO_VALUES = 0x44; // Get GPIO Values
const SET_GPIO_VALUES = 0x45; // Set GPIO Values
const GET_VERSION_INFORMATION = 0x46; // Get Version Information
const GET_SET_LOCK_BYTE = 0x47; // Get Set Lock Byte

//UART Configuration (Control Transfer) Section
const GETSET_UART_CONFIG = 0x50; // Get Set UART Config
const SET_TRANSMIT_LINE_BREAK = 0x51; //Set Transmit Line Break
const SET_STOP_LINE_BREAK = 0x52; //Set Stop Line Break;

//USB Customization (Control Transfer) Section
const GET_SET_USB_CONFIGURATION = 0x60; //Get Set USB Configuration
const GET_SET_MANUFACTURING_STRING_1 = 0x61; //Get Set Manufacturing String 1
const GET_SET_MANUFACTURING_STRING_2 = 0x62; //Get Set Manufacturing String 2
const GET_SET_PRODUCT_STRING_1 = 0x63; //Get Set Product String 1
const GET_SET_PRODUCT_STRING_2 = 0x64; //Get Set Product String 2
const GET_SET_SERIAL_STRING = 0x65; //Get Set Serial String
const GET_SET_PIN_CONFIGURATION = 0x66; //Get Set Pin Configuration

// CP2114 Customization and Configuration (Control Transfer) Section
const GET_DEVICE_STATUS = 0x70; //Get Device Status
const GET_DEVICE_CAPABILITIES = 0x71; //Get Device Capabilities
const GET_RAM_CONFIGURATION = 0x72; //Get RAM Configuration
const SET_RAM_CONFIGURATION = 0x73; //Set RAM Configuration
const SET_DAC_REGISTERS = 0x74; //Set DAC Registers
const GET_DAC_REGISTERS = 0x75; //Get DAC Registers
const GET_OTP_CONFIGURATION = 0x76; //Get OTP Configuration
const GET_DEVICE_VERSION = 0x77; //Get Device Version
const CREATE_OTP_CONFIGURATION = 0x78; // Create OTP Configuration
const SET_BOOT_CONFIGURATION = 0x79; // Set Boot Configuration
const SET_PARAMETERS_FOR_NEXT_GET = 0x7A; // Set Parameters For Next Get
const GET_OTP_ALL_CONFIGURATIONS = 0x7B; // Get OTP All Configurations
const SET_OTP_ALL_CONFIGURATIONS = 0x7C; // Set OTP All Configurations
const I2C_WRITE_DATA = 0x7D; // I2C Write Data
const I2C_READ_DATA = 0x7E; // I2C Read Data


const PURGE_TRANSMIT_MASK = 0x01;
const PURGE_RECEIVE_MASK  = 0x02;

/// The number of data bits
export enum DataBits {
    /// 5 data bits
    Bits5,
    /// 6 data bits
    Bits6,
    /// 7 data bits
    Bits7,
    /// 8 data bits
    Bits8,
}

/// The parity
export enum Parity {
    /// No parity.
    None,
    /// Odd parity (sum of data bits is odd).
    Odd,
    /// Even parity (sum of data bits is even).
    Even,
    /// Mark parity (always 1).
    Mark,
    /// Space parity (always 0).
    Space,
}

/// The number of stop bits
export enum StopBits {
    /// 1 stop bit.
    Short,
    /// 5 data bits: 1.5 stop bits, 6-8 data bits: 2 stop bits.
    Long,
}

/// The type of flow control
export enum FlowControl {
    /// No flow control.
    None,
    /// RTS/CTS hardware flow control.
    RtsCts,
}

/// UART configuration.
export interface IUartConfig{
     baud_rate: number,
     data_bits: DataBits,
     parity: Parity,
     stop_bits: StopBits,
     flow_control: FlowControl,
}

/// Wrapper around `hid::Handle` to provide UART control.
export interface IHidUart{
    handle: nodehid.HID,
    read_timeout : number;
    write_timeout:number;
}
/**
 * Get UART Enable returns the Enable status of the UART. The UART is disabled by default.
 * Set UART Enable checks the FlushBuffers programmed parameter and purges the FIFOs depending on the parameter Enable or Disable, which are treated as Open and Close respectively.
 *
 * @param {nodehid.HID} handle
 * @param {boolean} enable
 */
function set_uart_enable(handle:nodehid.HID, enable:boolean){
    let buf : number[] = [];
    buf[0] = GET_SET_UART_ENABLE;
    if (enable){
        buf[1] = 0x01;
    }else{
        buf[1] = 0x00;
    }
    handle.sendFeatureReport(buf);
}

export class HidUart{
    private handle: nodehid.HID;
    public read_timeout: number;
    public write_timeout : number;
    constructor(handle: nodehid.HID){
        this.handle = handle;
        this.read_timeout = 1000;
        this.write_timeout = 1000;
        this.enable();
    }

    /**
     * Set Reset Device
     * 
     * Set Reset Device is used to restart the device from the USB host. The device will re-enumerate on the USB bus and all UART configuration settings are reset to their default values.
     * For certain operating systems such as Windows, initiating a device reset and re-enumerating will make the device's handle stale. The
     * user application is responsible for handling this "surprise disconnect" event. See AN433: CP2110/4 HID-to-UART API Specification for
     * more information regarding surprise disconnects.
     *
     * @memberof HidUart
     */
    public reset(){
        let buf : number[] = [];
        buf[0] = SET_RESET_DEVICE;
        this.handle.sendFeatureReport(buf);
    }

    
    /**
     * Set UART Enable 
     * 
     * checks the FlushBuffers programmed parameter and purges the FIFOs depending on the parameter Enable or Disable, which are treated as Open and Close respectively.
     *
     * @memberof HidUart
     */
    public enable(){
        set_uart_enable(this.handle,true);
    }

    /**
     * Set UART Disable
     *
     * checks the FlushBuffers programmed parameter and purges the FIFOs depending on the parameter Enable or Disable, which are treated as Open and Close respectively. 
     *
     * @memberof HidUart
     */
    public disable(){
        set_uart_enable(this.handle,false);
    }

    /**
     * Get UART Enable
     *
     * Get UART Enable returns the Enable status of the UART. The UART is disabled by default
     * @returns
     * @memberof HidUart
     */
    public is_enabled(){
        let buf :number[]= [];
        buf[0] = GET_SET_UART_ENABLE;
        let result = this.handle.getFeatureReport(GET_SET_UART_ENABLE,FEATURE_REPORT_LENGTH);
        if (buf[1] == 0x00){
            return false;
        }else{
            return true;
        }
    }

    /**
     * Get UART Status
     * 
     * TX FIFO is the number of bytes left for the device transfer to the UART-based device. The transmit FIFO buffer can hold up to 480
     * bytes. The value returned is a two-byte, unsigned integer.
     * RX FIFO is the number of bytes left for the device to transfer to the USB host. The receive FIFO buffer can hold up to 480 bytes. The
     * value returned is a two-byte, unsigned integer.
     * Error Status indicates if a Parity error (bit 0) or Overrun error (bit 1) has occurred since the last time Error Status was read by the
     * user. Reading Error Status clears the errors.
     * Break Status indicates if a line break is currently in progress.
     *
     * @returns
     * @memberof HidUart
     */
    public get_uart_status(){
        let buf :number[]= [];
        buf[0] = GET_UART_STATUS;
        let result = this.handle.getFeatureReport(GET_UART_STATUS,FEATURE_REPORT_LENGTH);

        let tx_fifo :number= buf[1] << 8 | buf[2];
        let rx_fifo :number= buf[3] << 8 | buf[4];
        let parity_error : boolean = (buf[5] & 0b00000001) != 0;
        let overrun_error : boolean = (buf[5] & 0b00000010) != 0;
        let line_break_status : boolean = (buf[6] == 0);
        return {
            tx_fifo,
            rx_fifo,
            parity_error,
            overrun_error,
            line_break_status
        };
    }

   

    
    
    /**
     * Set Purge FIFOs
     * 
     * This report is used to empty the transmit and receive FIFO buffers on the CP2110/4 device. The host application is responsible for
     * purging any host-side buffer.
     * If Purge Type is set to 0x01, the device will clear all data from the transmit buffer.
     * If Purge Type is set to 0x02, the device will clear all data from the receive buffer.
     * If Purge Type is set to 0x03, the device will clear the data from both the transmit and receive buffers
     *
     * @param {boolean} rx
     * @param {boolean} tx
     * @memberof HidUart
     */
    public flush_fifos(rx:boolean, tx:boolean){
        let buf : number[] = [0,0,0,0];
        buf[0] = PURGE_FIFOS;
        if (rx){
            buf[1] |= PURGE_RECEIVE_MASK;
        }
        if (tx){
            buf[1] |= PURGE_TRANSMIT_MASK;
        }

        this.handle.sendFeatureReport(buf);
    }

    /**
     * Get GPIO Values
     * 
     * If a pin is configured as a GPIO input pin or a flow control pin that is an input, the corresponding Latch Value bit represents the input
     * value.
     * If a pin is configured as a GPIO output pin or a flow control pin that is an output, the corresponding Latch Value bit represents the logic
     * level driven on the pin.
     *
     * @memberof HidUart
     */
    public get_gpio_values(){
        let buf :number[]= [];
        buf[0] = GET_GPIO_VALUES;
        let result = this.handle.getFeatureReport(GET_GPIO_VALUES,FEATURE_REPORT_LENGTH);
        let part1 = bitwise.byte.read(buf[1] as any);
        let part2 = bitwise.byte.read(buf[2] as any);

        return part1.concat(part2);
    }

    /**
     * Set GPIO Values
     * 
     * Set GPIO Values sets the values for GPIO pins or Flow Control pins that are configured as outputs.
     * The desired value for the pin is configured in Latch Value. To drive a 1 on an output pin, the corresponding bit should be set to 1. To
     * drive a 0 on an output pin, the corresponding bit should be set to 0.
     * The Report will set new values only for output pins that have a 1 in the corresponding bit position in Latch Mask. If the corresponding
     * bit in Latch Mask is set to 0, a new pin value will not be set, even if the pin is configured as an output pin.
     * The Report does not affect any pins that are not configured as outputs. This Report is only valid for the GPIO/Flow control pins. Pins
     * TX, RX, Suspend, and /Suspend cannot be configured using this Report. The unused Latch Value and Latch Mask bits can be set to 1
     * or 0.
     *
     * @param {number} bit
     * @param {boolean} value
     * @memberof HidUart
     */
    public set_gpio_value(bit:number, value:boolean){
        // let buf :number[]= [];
        // buf[0] = SET_GPIO_VALUES;
        // buf[1] = ..;//values
        // buf[2] = ..;//values
        // buf[3] = ..;//mask
        // buf[4] = ..;//mask
        // let result = this.handle.getFeatureReport(SET_GPIO_VALUES,FEATURE_REPORT_LENGTH);
        throw new Error("not implemented");
    }

    /**
     *  Get Version Information
     * 
     * Part Number indicates the device part number. The CP2110 returns 0x0A.
     * Device Version is the version of the device. This value is not programmable over the HID interface.
     *
     * @returns
     * @memberof HidUart
     */
    public get_version_information(){
        let buf :number[]= [];
        buf[0] = GET_VERSION_INFORMATION;
        let result = this.handle.getFeatureReport(GET_VERSION_INFORMATION,FEATURE_REPORT_LENGTH);
        return {
            part_number: buf[1],
            device_version : buf[2]
        };
    }

    /**
     * Get Lock Byte
     * The device has a 2-byte field which indicates which of the customizable fields have been programmed. The following table shows the
     * values of the bits:
     * Bit Position MSB – address[1] LSB – address[2]
     * Bit 0 VID String 2–Part 1
     * Bit 1 PID String 2–Part 2
     * Bit 2 Max Power String 3
     * Bit 3 Power Mode Pin Config
     * Bit 4 Release Version (unused)
     * Bit 5 Flush Buffers (unused)
     * Bit 6 String 1–Part 1 (unused)
     * Bit 7 String 1–Part 2 (unused)
     * If the bit value is set to 1, the corresponding field has not been customized. If the bit value is set to 0, the field has been customized and
     * can no longer be changed for this device.
     * Using the Set Lock Byte Report, any bit value set to 0 will lock the corresponding field. Send 0x00F0 to lock all parameters and
     * prevent future customization.
     *
     * @memberof HidUart
     */
    public get_lock_byte(){
        // let buf :number[]= [];
        // buf[0] = GET_SET_LOCK_BYTE;
        // let result = this.handle.getFeatureReport(GET_SET_LOCK_BYTE,FEATURE_REPORT_LENGTH);
        throw new Error("not implemented");
    }

    /**
     * Set Lock Byte
     * The device has a 2-byte field which indicates which of the customizable fields have been programmed. The following table shows the
     * values of the bits:
     * Bit Position MSB – address[1] LSB – address[2]
     * Bit 0 VID String 2–Part 1
     * Bit 1 PID String 2–Part 2
     * Bit 2 Max Power String 3
     * Bit 3 Power Mode Pin Config
     * Bit 4 Release Version (unused)
     * Bit 5 Flush Buffers (unused)
     * Bit 6 String 1–Part 1 (unused)
     * Bit 7 String 1–Part 2 (unused)
     * If the bit value is set to 1, the corresponding field has not been customized. If the bit value is set to 0, the field has been customized and
     * can no longer be changed for this device.
     * Using the Set Lock Byte Report, any bit value set to 0 will lock the corresponding field. Send 0x00F0 to lock all parameters and
     * prevent future customization.
     *
     * @memberof HidUart
     */
    public set_lock_byte(){
        // let buf :number[]= [];
        // buf[0] = GET_SET_LOCK_BYTE;
        //buf[1] = ..;
        // let result = this.handle.setFeatureReport(GET_SET_LOCK_BYTE,FEATURE_REPORT_LENGTH);
        throw new Error("not implemented");
    }

    /// Transmit `data`.
    public write(data: number[]){
        let buf : number[] = [];
        for (let i = 0; i < INTERRUPT_REPORT_LENGTH;i++){
            buf.push(0);
        }

        buf[0] = data.length;
        for (let i = 0; i < data.length;i++){
            buf[i+1] = data[i];
        }
        //console.log("writing",data.length);;
        this.handle.write(buf);
    }

    public read(){
        //once an incoming message comes in, the buf[1] is the length of the message
    }


     /**
     *  Set UART Config
     * 
     * Note: Values from the Set Report are not stored in PROM. These parameters must be initialized after every power-on or device reset.
     * Baud Rate is the speed in bits per second (bps) at which data is transferred over the UART. It is stored as a 4-byte unsigned number
     * and must be sent with the MSB first (big endian). The minimum baud rate is 300 bps for the CP2110 and 375 bps for the CP2114. The
     * maximum baud rate for the CP2110 and CP2114 is 1 Mbps (1,000,000 bps) when using 7 or 8 data bits, and 500 kbps (500,000 bps)
     * when using 5 or 6 data bits.
     * The CP2114 maximum usable baud rate and average UART data transfer throughput are highly dependent on the following conditions
     * (see the CP2114 data sheet for details):
     * • Flow control mechanism (Hardware/None)
     * • Communication mode (Simplex/Duplex)
     * • Audio play and/or record streaming (Active/Inactive)
     * Parity is the type of parity bit that is appended to each data byte. The five types of parity available are none, even, odd, mark, and
     * space parity. If No Parity is configured, no extra bit is appended to each data byte.
     * Flow Control is the type of handshaking used for the UART communication. The available types of flow control are No Flow Control
     * and Hardware Flow Control. Hardware Flow Control uses the RTS and CTS pins.
     * Data Bits is the number of data bits per UART transfer. The UART can operate at 5, 6, 7, or 8 data bits.
     * Stop Bits is the number of stop bits used after each data byte. If Data Bits is set to 5, a Short Stop Bit is equivalent to 1 bit time, and
     * Long Stop Bit is equivalent to 1.5 bit times. If Data Bits is set to 6, 7, or 8, a Short Stop Bit is equivalent to 1 bit time, and Long Stop Bit
     * is equivalent to 2 bit times.
     *
     * @returns
     * @memberof HidUart
     */     public set_config(config : IUartConfig){
        let buf : number[] = [];
        buf[0] = GETSET_UART_CONFIG;
        buf[1] = ((config.baud_rate >> 24) & 0xFF) ;
        buf[2] = ((config.baud_rate >> 16) & 0xFF);
        buf[3] = ((config.baud_rate >> 8) & 0xFF) ;
        buf[4] = (config.baud_rate & 0xFF);
        switch (config.parity){
                case Parity.None:
                buf[5] = 0x00;
                break;
                case Parity.Odd:
                buf[5] = 0x01;
                break;
                case Parity.Even:
                buf[5] = 0x02;
                break;
                case Parity.Mark:
                buf[5] = 0x03;
                break;
                case Parity.Space:
                buf[5] = 0x04;
                break;
        }
        switch (config.flow_control){
            case FlowControl.None:
            buf[6] = 0x00;
            break;
            case FlowControl.RtsCts:
            buf[6] = 0x01;
            break;
        }
        switch (config.data_bits){
            case DataBits.Bits5:
                buf[7] = 0x00;
                break;
            case DataBits.Bits6: 
                buf[7]= 0x01;
                break;
            case DataBits.Bits7:
                buf[7] = 0x02;
                break;
            case DataBits.Bits8: 
                buf[7]= 0x03;
                break;
        }
        switch (config.stop_bits){
            case StopBits.Short:
                buf[8] = 0x00;
                break;
            case StopBits.Long:
                buf[8] =0x01;
                break;
        }
        this.handle.sendFeatureReport(buf);
    }

    
    /**
     *  Get UART Config
     * 
     * Note: Values from the Set Report are not stored in PROM. These parameters must be initialized after every power-on or device reset.
     * Baud Rate is the speed in bits per second (bps) at which data is transferred over the UART. It is stored as a 4-byte unsigned number
     * and must be sent with the MSB first (big endian). The minimum baud rate is 300 bps for the CP2110 and 375 bps for the CP2114. The
     * maximum baud rate for the CP2110 and CP2114 is 1 Mbps (1,000,000 bps) when using 7 or 8 data bits, and 500 kbps (500,000 bps)
     * when using 5 or 6 data bits.
     * The CP2114 maximum usable baud rate and average UART data transfer throughput are highly dependent on the following conditions
     * (see the CP2114 data sheet for details):
     * • Flow control mechanism (Hardware/None)
     * • Communication mode (Simplex/Duplex)
     * • Audio play and/or record streaming (Active/Inactive)
     * Parity is the type of parity bit that is appended to each data byte. The five types of parity available are none, even, odd, mark, and
     * space parity. If No Parity is configured, no extra bit is appended to each data byte.
     * Flow Control is the type of handshaking used for the UART communication. The available types of flow control are No Flow Control
     * and Hardware Flow Control. Hardware Flow Control uses the RTS and CTS pins.
     * Data Bits is the number of data bits per UART transfer. The UART can operate at 5, 6, 7, or 8 data bits.
     * Stop Bits is the number of stop bits used after each data byte. If Data Bits is set to 5, a Short Stop Bit is equivalent to 1 bit time, and
     * Long Stop Bit is equivalent to 1.5 bit times. If Data Bits is set to 6, 7, or 8, a Short Stop Bit is equivalent to 1 bit time, and Long Stop Bit
     * is equivalent to 2 bit times.
     *
     * @returns
     * @memberof HidUart
     */
    public get_config(){
        let buf : number[] = [];
        buf[0]  = GETSET_UART_CONFIG;
        buf = this.handle.getFeatureReport(GETSET_UART_CONFIG,FEATURE_REPORT_LENGTH);
        let vbaud_rate :number= buf[1] << 24 | buf[2] << 16 | buf[3] << 8 | buf[4];
        let vparity : Parity;
        switch (buf[5]){
            case 0x00:
                vparity = Parity.None;
                break;
            case 0x01:
                vparity = Parity.Odd;
                break;
            case 0x02:
                vparity = Parity.Even;
                break;
            case 0x03:
                vparity =Parity.Mark;
                break;
            case 0x04:
                vparity =Parity.Space;
                break;
            default:
                throw new Error("Unknown parity mode");
        }
           
        let vflow_control : FlowControl;
        switch (buf[6]){
            case 0x00:
                vflow_control = FlowControl.None;
                break;
            case 0x01:
                vflow_control = FlowControl.RtsCts;
                break;
            default:
                throw new Error("Unknown flow control mode");
        }
         
        let vdata_bits : DataBits;
        switch (buf[7]){
            case 0x00:
                vdata_bits = DataBits.Bits5;
                break;
            case 0x01: 
                vdata_bits = DataBits.Bits6;
                break;
            case 0x02:
                vdata_bits =DataBits.Bits7;
                break;
            case 0x03: 
                vdata_bits =DataBits.Bits8;
                break;
            default:
                throw new Error("Unknown data bits mode");
        }
        let vstop_bits : StopBits;
        switch (buf[8]){
            case 0x00:
                vstop_bits =StopBits.Short;
                break;
            case 0x01:
                vstop_bits = StopBits.Long;
                break;
            default:
                throw new Error("Unknown stop bits mode");
        }
        
        return {
            baud_rate: vbaud_rate,
            data_bits: vdata_bits,
            flow_control: vflow_control,
            parity: vparity,
            stop_bits: vstop_bits
        } as IUartConfig;
    }
    
    /**
     * Set Transmit Line Break
     * 
     * Set Transmit Line Break is used to transmit a line break on the TX pin. The line break will last for the amount of time specified in
     * Line Break Time. The valid range for Line Break Time is 0 to 125 ms. The TX FIFO buffer is also purged when a line break is started.
     * If a value of 0 is set for Line Break Time, the device will transmit a line break until it receives a Set Stop Line Break Report.
     *
     * @param {number} break_time
     * @memberof HidUart
     */
    public set_transmit_line_break(break_time:number){
        let buf : number[] = [];
        buf[0] = SET_TRANSMIT_LINE_BREAK;
        buf[1] = break_time;
        this.handle.sendFeatureReport(buf);
    }

    /**
     * Set Stop Line Break
     * 
     * Set Stop Line Break is used to stop a line break if it is in progress. If no line break is currently in progress, this report is ignored.
     * Set Report ID to the report ID of Set Stop Line Break. There are no data bytes in the payload other than the Report ID.
     *
     * @memberof HidUart
     */
    public set_stop_line_break(){
        let buf : number[] = [];
        buf[0] = SET_STOP_LINE_BREAK;
        this.handle.sendFeatureReport(buf);
    }


    /**
     * Get USB Configuration
     * VID Low Byte 1 1 — VID Low Byte
     * VID High Byte 2 1 — VID High Byte
     * PID Low Byte 3 1 — PID Low Byte
     * PID High Byte 4 1 — PID High Byte
     * Power 5 1 — Power requested in mA/2
     * Power Mode 6 1 — Regulator Configuration
     * Release Major 7 1 — Release Version Major Value
     * Release Minor 8 1 — Release Version Minor Value
     * Flush Buffers 9 1 — Which buffers to flush on open/close
     * Mask 10 1 — Mask for what fields to program
     *
     * Get USB Configuration returns the values for the various fields and also the Mask value. The Mask value is equal to the most significant byte value that is returned in Report Get Lock Byte. If the corresponding Mask bit is set to '0', the corresponding field has been
     * programmed and any Set USB Configuration function operating on that field is ignored.
     * Set USB Configuration is used to customize these fields. The corresponding Mask bit should be set to '1' to program the field. If the
     * field has already been programmed once, an attempt to reprogram it is ignored. If a field is being programmed with the current value,
     * the programmed bit will still be set.
     * See 5.8 Get/Set Lock Byte for the definition of Mask.
     *
     * @memberof HidUart
     */
    public get_usb_configuration(){
        throw new Error("not implemented");
    }

    /**
     * Set USB Configuration
     * VID Low Byte 1 1 — VID Low Byte
     * VID High Byte 2 1 — VID High Byte
     * PID Low Byte 3 1 — PID Low Byte
     * PID High Byte 4 1 — PID High Byte
     * Power 5 1 — Power requested in mA/2
     * Power Mode 6 1 — Regulator Configuration
     * Release Major 7 1 — Release Version Major Value
     * Release Minor 8 1 — Release Version Minor Value
     * Flush Buffers 9 1 — Which buffers to flush on open/close
     * Mask 10 1 — Mask for what fields to program
     *
     * Get USB Configuration returns the values for the various fields and also the Mask value. The Mask value is equal to the most significant byte value that is returned in Report Get Lock Byte. If the corresponding Mask bit is set to '0', the corresponding field has been
     * programmed and any Set USB Configuration function operating on that field is ignored.
     * Set USB Configuration is used to customize these fields. The corresponding Mask bit should be set to '1' to program the field. If the
     * field has already been programmed once, an attempt to reprogram it is ignored. If a field is being programmed with the current value,
     * the programmed bit will still be set.
     * See 5.8 Get/Set Lock Byte for the definition of Mask.
     *
     * @memberof HidUart
     */
    public set_usb_configuration(){
        throw new Error("not implemented");
    }

    /**
     * Get Manufacturing String 1
     * 
     * The Set Manufacturing String 1 Report can only be used once to set the Manufacturing String. Any subsequent calls to Set Manuf
     * acturing String 1 are ignored.
     * The maximum value for String Length is 126. The first two bytes are allocated for String Length and the value 0x03, meaning the
     * actual length of the pstring is 124 bytes. The device will ignore the report if String Length is too long. The string must be in Unicode
     * format.
     *
     * @memberof HidUart
     */
    public get_manufacturing_string_1(){
        throw new Error("not implemented");
    }

    /**
     * Set Manufacturing String 1
     * 
     * The Set Manufacturing String 1 Report can only be used once to set the Manufacturing String. Any subsequent calls to Set Manuf
     * acturing String 1 are ignored.
     * The maximum value for String Length is 126. The first two bytes are allocated for String Length and the value 0x03, meaning the
     * actual length of the pstring is 124 bytes. The device will ignore the report if String Length is too long. The string must be in Unicode
     * format.
     *
     * @memberof HidUart
     */
    public set_manufacturing_string_1(){
        throw new Error("not implemented");
    }

    public get_manufacturing_string_2(){
        throw new Error("not implemented");
    }

    public set_manufacturing_string_2(){
        throw new Error("not implemented");
    }

    public get_product_string_1(){
        throw new Error("not implemented");
    }

    public set_product_string_1(){
        throw new Error("not implemented");
    }

    public get_product_string_2(){
        throw new Error("not implemented");
    }

    public set_product_string_2(){
        throw new Error("not implemented");
    }

    public get_serial_string(){
        throw new Error("not implemented");
    }

    public set_serial_string(){
        throw new Error("not implemented");
    }

    public get_pin_configuration(){
        throw new Error("not implemented");
    }

    public set_pin_configuration(){
        throw new Error("not implemented");
    }

    public get_device_status(){
        throw new Error("not implemented");
    }

    public get_device_capabilities(){
        throw new Error("not implemented");
    }

    public get_ram_configuration(){
        throw new Error("not implemented");
    }

    public set_ram_configuration(){
        throw new Error("not implemented");
    }

    public set_dac_registers(){
        throw new Error("not implemented");
    }

    public get_dac_registers(){
        throw new Error("not implemented");
    }

    public get_otp_configuration(){
        throw new Error("not implemented");
    }

    public get_device_version(){
        throw new Error("not implemented");
    }

    public create_otp_configuration(){
        throw new Error("not implemented");
    }

    public set_boot_configuration(){
        throw new Error("not implemented");
    }

    public set_parameters_for_next_get(){
        throw new Error("not implemented");
    }

    public get_otp_all_configurations(){
        throw new Error("not implemented");
    }

    public set_otp_all_configurations(){
        throw new Error("not implemented");
    }

    public i2c_write_data(){
        throw new Error("not implemented");
    }

    public i2c_read_data(){
        throw new Error("not implemented");
    }
}
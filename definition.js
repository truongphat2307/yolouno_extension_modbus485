const MODBUS_COLOUR = "#cb2026";

Blockly.Blocks['modbus_init'] = {
  init: function () {
    this.jsonInit({
      type: "modbus_init",
      message0: "khởi tạo Modbus RX %1 TX %2 Baudrate %3",
      previousStatement: null,
      nextStatement: null,
      args0: [
        { type: "field_dropdown", name: "RX", options: digitalPins },
        { type: "field_dropdown", name: "TX", options: digitalPins },
        {
          type: "field_dropdown",
          name: "BAUD",
          options: [
            ["9600", "9600"],
            ["4800", "4800"],
            ["2400", "2400"],
            ["19200", "19200"],
            ["38400", "38400"],
            ["57600", "57600"],
            ["115200", "115200"]
          ]
        }
      ],
      colour: MODBUS_COLOUR,
      tooltip: "Khởi tạo kết nối Modbus RTU qua module RS485 (8N1)",
      helpUrl: ""
    });
  }
};

Blockly.Blocks['modbus_read_input_registers'] = {
  init: function () {
    this.jsonInit({
      message0: "đọc input register thiết bị %4 %1 địa chỉ %5 %2 số lượng %6 %3",
      args0: [
        { type: "input_value", name: "SLAVE_ID", check: "Number" },
        { type: "input_value", name: "ADDRESS", check: "Number" },
        { type: "input_value", name: "QUANTITY", check: "Number" },
        { type: "input_dummy" },
        { type: "input_dummy" },
        { type: "input_dummy" }
      ],
      output: "Array",
      colour: MODBUS_COLOUR,
      tooltip: "Đọc input register (function code 0x04). Trả về danh sách giá trị 16-bit, hoặc None nếu lỗi",
      helpUrl: ""
    });
  }
};

Blockly.Blocks['modbus_read_holding_registers'] = {
  init: function () {
    this.jsonInit({
      message0: "đọc holding register thiết bị %4 %1 function code %7 %8 địa chỉ %5 %2 số lượng %6 %3",
      args0: [
        { type: "input_value", name: "SLAVE_ID", check: "Number" },
        { type: "input_value", name: "ADDRESS", check: "Number" },
        { type: "input_value", name: "QUANTITY", check: "Number" },
        { type: "input_dummy" },
        { type: "input_dummy" },
        { type: "input_dummy" },
        { type: "input_dummy" },
        { type: "input_value", name: "FUNC_CODE", check: "Number" }
      ],
      output: "Array",
      colour: MODBUS_COLOUR,
      tooltip: "Đọc thanh ghi (0x03: holding, 0x04: input). Trả về danh sách giá trị 16-bit, hoặc None nếu lỗi",
      helpUrl: ""
    });
  }
};

Blockly.Blocks['modbus_write_single_register'] = {
  init: function () {
    this.jsonInit({
      message0: "ghi giá trị %4 %3 vào register thiết bị %5 %1 địa chỉ %6 %2",
      args0: [
        { type: "input_value", name: "SLAVE_ID", check: "Number" },
        { type: "input_value", name: "ADDRESS", check: "Number" },
        { type: "input_value", name: "VALUE", check: "Number" },
        { type: "input_dummy" },
        { type: "input_dummy" },
        { type: "input_dummy" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: MODBUS_COLOUR,
      tooltip: "Ghi 1 holding register (function code 0x06), giá trị từ -32768 đến 65535",
      helpUrl: ""
    });
  }
};

Blockly.Blocks['modbus_read_float'] = {
  init: function () {
    this.jsonInit({
      type: "modbus_read_float",
      message0: "đọc float từ thiết bị %4 %1 function code %6 %7 địa chỉ %5 %2 thứ tự byte %3",
      args0: [
        { type: "input_value", name: "SLAVE_ID", check: "Number" },
        { type: "input_value", name: "REGISTER_ADDR", check: "Number" },
        {
          type: "field_dropdown",
          name: "BYTE_ORDER",
          options: [
            ["Big-endian (ABCD)", "big"],
            ["Little-endian / đảo word (CDAB)", "little"]
          ]
        },
        { type: "input_dummy" },
        { type: "input_dummy" },
        { type: "input_dummy" },
        { type: "input_value", name: "FUNC_CODE", check: "Number" }
      ],
      output: "Number",
      colour: MODBUS_COLOUR,
      tooltip: "Đọc 2 thanh ghi liên tiếp và ghép thành số thực 32-bit. Trả về None nếu lỗi. Nếu giá trị đọc ra vô lý, hãy thử đổi thứ tự byte",
      helpUrl: ""
    });
  }
};

Blockly.Blocks['modbus_read_raw_bytes'] = {
  init: function () {
    this.jsonInit({
      type: "modbus_read_raw_bytes",
      message0: "đọc dữ liệu RAW (dạng byte) thiết bị %4 %1 function code %7 %8 địa chỉ %5 %2 số thanh ghi %6 %3",
      args0: [
        { type: "input_value", name: "SLAVE_ID", check: "Number" },
        { type: "input_value", name: "REGISTER_ADDR", check: "Number" },
        { type: "input_value", name: "REGISTER_COUNT", check: "Number" },
        { type: "input_dummy" },
        { type: "input_dummy" },
        { type: "input_dummy" },
        { type: "input_dummy" },
        { type: "input_value", name: "FUNC_CODE", check: "Number" }
      ],
      output: "Array",
      colour: MODBUS_COLOUR,
      tooltip: "Đọc dữ liệu dạng byte thô (mỗi thanh ghi = 2 byte). Trả về danh sách byte, hoặc None nếu lỗi",
      helpUrl: ""
    });
  }
};


Blockly.Python['modbus_init'] = function (block) {
  const rx = block.getFieldValue('RX');
  const tx = block.getFieldValue('TX');
  const baud = block.getFieldValue('BAUD');

  Blockly.Python.definitions_['import_modbus_master'] = 'from modbus_master import ModbusRTU';
  Blockly.Python.definitions_['create_modbus_master'] = `modbus = ModbusRTU(rx=${rx}_PIN, tx=${tx}_PIN, baudrate=${baud})`;
  return '';
};

Blockly.Python['modbus_read_input_registers'] = function (block) {
  const slave = Blockly.Python.valueToCode(block, 'SLAVE_ID', Blockly.Python.ORDER_NONE) || '1';
  const addr = Blockly.Python.valueToCode(block, 'ADDRESS', Blockly.Python.ORDER_NONE) || '0';
  const qty = Blockly.Python.valueToCode(block, 'QUANTITY', Blockly.Python.ORDER_NONE) || '1';
  const code = `modbus.read_input_registers(${slave}, ${addr}, ${qty})`;
  return [code, Blockly.Python.ORDER_FUNCTION_CALL];
};

Blockly.Python['modbus_read_holding_registers'] = function (block) {
  const slave = Blockly.Python.valueToCode(block, 'SLAVE_ID', Blockly.Python.ORDER_NONE) || '1';
  const func_code = Blockly.Python.valueToCode(block, 'FUNC_CODE', Blockly.Python.ORDER_NONE) || '3';
  const addr = Blockly.Python.valueToCode(block, 'ADDRESS', Blockly.Python.ORDER_NONE) || '0';
  const qty = Blockly.Python.valueToCode(block, 'QUANTITY', Blockly.Python.ORDER_NONE) || '1';
  const code = `modbus.read_holding_registers(${slave}, ${func_code}, ${addr}, ${qty})`;
  return [code, Blockly.Python.ORDER_FUNCTION_CALL];
};

Blockly.Python['modbus_write_single_register'] = function (block) {
  const slave = Blockly.Python.valueToCode(block, 'SLAVE_ID', Blockly.Python.ORDER_NONE) || '1';
  const addr = Blockly.Python.valueToCode(block, 'ADDRESS', Blockly.Python.ORDER_NONE) || '0';
  const value = Blockly.Python.valueToCode(block, 'VALUE', Blockly.Python.ORDER_NONE) || '0';
  return `modbus.write_single_register(${slave}, ${addr}, ${value})\n`;
};

Blockly.Python['modbus_read_float'] = function (block) {
  const slave = Blockly.Python.valueToCode(block, 'SLAVE_ID', Blockly.Python.ORDER_NONE) || '1';
  const func_code = Blockly.Python.valueToCode(block, 'FUNC_CODE', Blockly.Python.ORDER_NONE) || '3';
  const reg_addr = Blockly.Python.valueToCode(block, 'REGISTER_ADDR', Blockly.Python.ORDER_NONE) || '0';
  const byte_order = block.getFieldValue('BYTE_ORDER');
  const code = `modbus.read_float(${slave}, ${func_code}, ${reg_addr}, byte_order="${byte_order}")`;
  return [code, Blockly.Python.ORDER_FUNCTION_CALL];
};

Blockly.Python['modbus_read_raw_bytes'] = function (block) {
  const slave = Blockly.Python.valueToCode(block, 'SLAVE_ID', Blockly.Python.ORDER_NONE) || '1';
  const func_code = Blockly.Python.valueToCode(block, 'FUNC_CODE', Blockly.Python.ORDER_NONE) || '3';
  const reg_addr = Blockly.Python.valueToCode(block, 'REGISTER_ADDR', Blockly.Python.ORDER_NONE) || '0';
  const count = Blockly.Python.valueToCode(block, 'REGISTER_COUNT', Blockly.Python.ORDER_NONE) || '1';
  const code = `modbus.read_raw_bytes(${slave}, ${func_code}, ${reg_addr}, ${count})`;
  return [code, Blockly.Python.ORDER_FUNCTION_CALL];
};

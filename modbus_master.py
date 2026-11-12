from machine import UART, Pin
import struct
import time

# Mã lỗi Modbus (exception code) khi slave phản hồi lỗi
_EXCEPTIONS = {
    1: "function code không được hỗ trợ",
    2: "địa chỉ thanh ghi không hợp lệ",
    3: "giá trị dữ liệu không hợp lệ",
    4: "lỗi thiết bị slave",
    5: "slave đang xử lý (ACK)",
    6: "slave đang bận",
}


class ModbusRTU:
    def __init__(self, uart_id=1, tx=6, rx=7, baudrate=9600, timeout=500, de_pin=None):
        """
        :param uart_id: số UART của ESP32 (mặc định 1)
        :param tx, rx: chân TX / RX nối với module RS485
        :param baudrate: tốc độ baud của thiết bị (thường 4800 hoặc 9600)
        :param timeout: thời gian chờ phản hồi tối đa (ms)
        :param de_pin: chân DE/RE nếu module RS485 KHÔNG tự đảo chiều (None nếu module tự đảo chiều)
        """
        self.uart = UART(uart_id, baudrate=baudrate, bits=8, parity=None, stop=1, tx=tx, rx=rx)
        self.baudrate = baudrate
        self.timeout = timeout
        self.de = None
        if de_pin is not None:
            self.de = Pin(de_pin, Pin.OUT)
            self.de.value(0)
        # Thời gian 1 ký tự (10 bit) tính bằng micro giây
        self._char_us = 10 * 1000000 // baudrate
        # Khoảng nghỉ tối thiểu giữa 2 frame Modbus (3.5 ký tự, tối thiểu 1.75ms)
        self._frame_gap_us = max(self._char_us * 35 // 10, 1750)
        self._last_io = time.ticks_us()

    # ------------------------------------------------------------------
    # Hàm cấp thấp
    # ------------------------------------------------------------------
    def calculate_crc(self, data):
        crc = 0xFFFF
        for byte in data:
            crc ^= byte
            for _ in range(8):
                if crc & 0x0001:
                    crc = (crc >> 1) ^ 0xA001
                else:
                    crc >>= 1
        return bytes([crc & 0xFF, (crc >> 8) & 0xFF])  # CRC little-endian

    def _send(self, frame):
        # Đảm bảo khoảng nghỉ giữa 2 frame
        elapsed = time.ticks_diff(time.ticks_us(), self._last_io)
        if elapsed < self._frame_gap_us:
            time.sleep_us(self._frame_gap_us - elapsed)

        # Xoá dữ liệu rác còn sót trong buffer nhận
        while self.uart.any():
            self.uart.read()

        if self.de:
            self.de.value(1)
        self.uart.write(frame)
        if self.de:
            # Chờ gửi hết frame rồi mới chuyển về chế độ nhận
            time.sleep_us(self._char_us * len(frame) + self._char_us)
            self.de.value(0)

    def _receive(self, slave_addr, func_code, expected_length):
        """Đọc phản hồi, kiểm tra slave, function code, CRC. Trả về bytes hoặc None."""
        frame = bytearray()
        start = time.ticks_ms()
        while len(frame) < expected_length:
            n = self.uart.any()
            if n:
                frame += self.uart.read(min(n, expected_length - len(frame)))
                # Phản hồi lỗi (exception) chỉ dài 5 byte
                if len(frame) >= 5 and frame[1] == (func_code | 0x80):
                    break
            elif time.ticks_diff(time.ticks_ms(), start) > self.timeout:
                break
        self._last_io = time.ticks_us()

        if not frame:
            print("Modbus lỗi: thiết bị %d không phản hồi" % slave_addr)
            return None

        if len(frame) >= 5 and frame[1] == (func_code | 0x80):
            if self.calculate_crc(frame[:3]) == bytes(frame[3:5]):
                code = frame[2]
                print("Modbus lỗi: thiết bị %d báo lỗi %d (%s)"
                      % (slave_addr, code, _EXCEPTIONS.get(code, "không rõ")))
            else:
                print("Modbus lỗi: sai CRC")
            return None

        if len(frame) < expected_length:
            print("Modbus lỗi: phản hồi thiếu dữ liệu (%d/%d byte)" % (len(frame), expected_length))
            return None

        if self.calculate_crc(frame[:-2]) != bytes(frame[-2:]):
            print("Modbus lỗi: sai CRC")
            return None

        if frame[0] != slave_addr or frame[1] != func_code:
            print("Modbus lỗi: phản hồi không đúng thiết bị / function code")
            return None

        return frame

    def send_request(self, slave_addr, function_code, register_addr, value):
        frame = bytearray([
            slave_addr & 0xFF,
            function_code & 0xFF,
            (register_addr >> 8) & 0xFF,
            register_addr & 0xFF,
            (value >> 8) & 0xFF,
            value & 0xFF,
        ])
        frame += self.calculate_crc(frame)
        self._send(frame)

    def _read_data(self, slave_addr, func_code, register_addr, register_count):
        """Gửi lệnh đọc và trả về phần dữ liệu (bytes) hoặc None."""
        slave_addr = int(slave_addr)
        func_code = int(func_code)
        register_addr = int(register_addr)
        register_count = int(register_count)
        if not 1 <= register_count <= 125:
            print("Modbus lỗi: số thanh ghi phải từ 1 đến 125")
            return None
        self.send_request(slave_addr, func_code, register_addr, register_count)
        # 1 slave + 1 func + 1 byte count + N*2 data + 2 CRC
        response = self._receive(slave_addr, func_code, 5 + 2 * register_count)
        if response is None:
            return None
        if response[2] != 2 * register_count:
            print("Modbus lỗi: số byte dữ liệu không khớp")
            return None
        return response[3:-2]

    # ------------------------------------------------------------------
    # Hàm dùng cho các khối lệnh
    # ------------------------------------------------------------------
    def read_holding_registers(self, slave_addr, func_code, register_addr, register_count):
        """Đọc thanh ghi (mặc định function code 0x03). Trả về list số nguyên 16-bit hoặc None."""
        data = self._read_data(slave_addr, func_code, register_addr, register_count)
        if data is None:
            return None
        return [(data[i] << 8) | data[i + 1] for i in range(0, len(data), 2)]

    def read_input_registers(self, slave_addr, register_addr, register_count):
        """Đọc input register (function code 0x04)."""
        return self.read_holding_registers(slave_addr, 0x04, register_addr, register_count)

    def write_single_register(self, slave_addr, register_addr, value):
        """Ghi 1 holding register (function code 0x06). Trả về True nếu thành công."""
        slave_addr = int(slave_addr)
        register_addr = int(register_addr)
        value = int(value) & 0xFFFF  # cho phép ghi số âm (int16)
        self.send_request(slave_addr, 0x06, register_addr, value)
        # Slave trả về đúng frame đã gửi (8 byte)
        response = self._receive(slave_addr, 0x06, 8)
        return response is not None

    def read_float(self, slave_addr, func_code, register_addr, byte_order="big"):
        """
        Đọc 2 thanh ghi liên tiếp và ghép thành số thực 32-bit (IEEE 754).
        :param byte_order: 'big'    -> thanh ghi đầu là word cao (ABCD)
                           'little' -> thanh ghi đầu là word thấp (CDAB, đảo word)
        :return: float hoặc None nếu lỗi
        """
        regs = self.read_holding_registers(slave_addr, func_code, register_addr, 2)
        if regs is None:
            return None
        if byte_order == "big":
            hi, lo = regs[0], regs[1]
        else:
            hi, lo = regs[1], regs[0]
        return struct.unpack(">f", struct.pack(">HH", hi, lo))[0]

    def read_raw_bytes(self, slave_addr, func_code, register_addr, register_count):
        """Trả về list các byte dữ liệu thô hoặc None nếu lỗi."""
        data = self._read_data(slave_addr, func_code, register_addr, register_count)
        if data is None:
            return None
        return list(data)

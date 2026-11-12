# MODBUS RS485 – Extension cho Yolo UNO

Thư viện khối lệnh Blockly để đọc/ghi các thiết bị **Modbus RTU qua module RS485** (cảm biến đất, nhiệt độ, độ ẩm, đồng hồ điện, biến tần...) trên ESP32 / Yolo UNO, chạy MicroPython.

## Các khối lệnh

| Khối lệnh | Function code | Kết quả |
|---|---|---|
| Khởi tạo Modbus RX / TX / Baudrate | – | Dùng UART1, cấu hình 8N1 |
| Đọc holding register | 0x03 (hoặc 0x04) | Danh sách giá trị 16-bit |
| Đọc input register | 0x04 | Danh sách giá trị 16-bit |
| Đọc float | 0x03 / 0x04 | Số thực 32-bit ghép từ 2 thanh ghi |
| Đọc dữ liệu RAW | 0x03 / 0x04 | Danh sách byte thô |
| Ghi giá trị vào register | 0x06 | Ghi 1 thanh ghi |

Khi có lỗi (thiết bị không phản hồi, sai CRC, thiết bị báo lỗi), các khối đọc trả về `None` và in nguyên nhân lỗi ra màn hình console.

## Lưu ý khi sử dụng

- **Địa chỉ thiết bị (slave ID)** thường là `1`. Không dùng `0` vì đây là địa chỉ broadcast, thiết bị sẽ không phản hồi.
- **Baudrate** phải trùng với thiết bị. Cảm biến thường dùng 4800 hoặc 9600.
- **Nối dây:** A–A, B–B. Nếu thiết bị không phản hồi, hãy thử đảo A/B.
- **Thứ tự byte của số float:** nếu giá trị đọc ra vô lý (quá lớn, quá nhỏ), hãy đổi giữa *Big-endian (ABCD)* và *Little-endian / đảo word (CDAB)*.
- **Đọc định kỳ:** nên đặt khoảng nghỉ ≥ 100 ms giữa các lần đọc.

## Dùng trực tiếp bằng MicroPython

```python
from modbus_master import ModbusRTU

modbus = ModbusRTU(rx=D3_PIN, tx=D4_PIN, baudrate=9600)
# Module RS485 không tự đảo chiều: thêm de_pin=<chân DE/RE>

print(modbus.read_holding_registers(1, 3, 0, 2))   # slave 1, FC 03, địa chỉ 0, 2 thanh ghi
print(modbus.read_float(1, 3, 0, byte_order="big"))
modbus.write_single_register(1, 0x10, 100)
```

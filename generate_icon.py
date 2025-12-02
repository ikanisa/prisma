import struct
import zlib

def make_png(width, height):
    # PNG signature
    png = b'\x89PNG\r\n\x1a\n'

    # IHDR chunk
    # Color type 6 (Truecolor with alpha)
    ihdr = struct.pack('!I4sIIBBBBB', 13, b'IHDR', width, height, 8, 6, 0, 0, 0)
    ihdr += struct.pack('!I', zlib.crc32(ihdr[4:]))
    png += ihdr

    # IDAT chunk (simple red pixels with full alpha)
    # RGBA triplets
    raw_data = b'\x00' + (b'\xff\x00\x00\xff' * width)
    raw_data = raw_data * height
    compressed = zlib.compress(raw_data)
    idat = struct.pack('!I4s', len(compressed), b'IDAT') + compressed
    idat += struct.pack('!I', zlib.crc32(idat[4:]))
    png += idat

    # IEND chunk
    iend = struct.pack('!I4s', 0, b'IEND')
    iend += struct.pack('!I', zlib.crc32(iend[4:]))
    png += iend

    return png

with open('src-tauri/icons/icon.png', 'wb') as f:
    f.write(make_png(512, 512))

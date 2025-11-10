# xor_firmware.py
with open("/Users/jubayerahmedsojib/Desktop/Lost Signals/firmware.bin", "rb") as f:
    firmware = f.read()

with open("/Users/jubayerahmedsojib/Desktop/Lost Signals/secretkey.gpg", "rb") as f:
    key = f.read()

decrypted = bytearray()
for i, byte in enumerate(firmware):
    decrypted.append(byte ^ key[i % len(key)])  # repeat key if shorter

with open("/Users/jubayerahmedsojib/Desktop/Lost Signals/firmware_decrypted.bin", "wb") as f:
    f.write(decrypted)

print("Decryption done. Check firmware_decrypted.bin for the flag!")

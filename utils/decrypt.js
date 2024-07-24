import crypto from 'crypto'

export default function decrypt(encryptedText, key, iv) {
  // Ensure the key is 32 bytes long
  key = key.padEnd(32, ' ').slice(0, 32);
  const encryptedTextBuffer = Buffer.from(encryptedText, 'base64');

  // Extract the IV from the encrypted text
  const ivBuffer = Buffer.from(iv, 'utf-8');

  // Create a decipher
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'utf-8'), ivBuffer);

  // Update the decipher with the encrypted text
  let decrypted = decipher.update(encryptedTextBuffer.slice(iv.length), 'binary', 'utf8');

  // Finalize the decryption
  decrypted += decipher.final('utf8');

  return decrypted;
}
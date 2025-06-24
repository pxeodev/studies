import crypto from 'crypto';

export default function encrypt(text, key, iv) {
  // Ensure the key is 32 bytes long
  key = key.padEnd(32, ' ').slice(0, 32);
  
  // Create IV buffer
  const ivBuffer = Buffer.from(iv, 'utf-8');
  
  // Create a cipher
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'utf-8'), ivBuffer);
  
  // Update the cipher with the text
  let encrypted = cipher.update(text, 'utf8', 'binary');
  
  // Finalize the encryption
  encrypted += cipher.final('binary');
  
  // Combine IV and encrypted text
  const combined = Buffer.concat([ivBuffer, Buffer.from(encrypted, 'binary')]);
  
  return combined.toString('base64');
}
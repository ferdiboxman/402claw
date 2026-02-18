import { ethers } from 'ethers';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getNetworkConfig } from './config.js';

export function generateWallet() {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic?.phrase,
    createdAt: new Date().toISOString(),
  };
}

export function encryptPrivateKey(privateKey, password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return JSON.stringify({
    encrypted,
    iv: iv.toString('hex'),
    salt: salt.toString('hex'),
    authTag: authTag.toString('hex'),
  });
}

export function decryptPrivateKey(encryptedData, password) {
  const { encrypted, iv, salt, authTag } = JSON.parse(encryptedData);
  const key = crypto.scryptSync(password, Buffer.from(salt, 'hex'), 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function defaultWalletDir() {
  return path.join(process.env.HOME || '.', '.402claw');
}

export function defaultWalletPath() {
  return path.join(defaultWalletDir(), 'wallet.json');
}

export function saveWallet(walletData, filePath, password) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (password) {
    const encrypted = encryptPrivateKey(walletData.privateKey, password);
    const data = { ...JSON.parse(encrypted), address: walletData.address };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), { mode: 0o600 });
  } else {
    fs.writeFileSync(filePath, JSON.stringify(walletData, null, 2), { mode: 0o600 });
  }
}

export function loadWallet(filePath, password) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  if (data.encrypted && password) {
    const privateKey = decryptPrivateKey(raw, password);
    return { address: data.address, privateKey, createdAt: data.createdAt || new Date().toISOString() };
  }
  return data;
}

export function loadOrCreateWallet(walletPath, password) {
  walletPath = walletPath || defaultWalletPath();
  if (fs.existsSync(walletPath)) {
    return { wallet: loadWallet(walletPath, password), created: false, path: walletPath };
  }
  const wallet = generateWallet();
  saveWallet(wallet, walletPath, password);
  return { wallet, created: true, path: walletPath };
}

export function createSigner(privateKey, network = 'mainnet') {
  const config = getNetworkConfig(network);
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  return new ethers.Wallet(privateKey, provider);
}

export function defaultRegistrationPath() {
  return path.join(defaultWalletDir(), 'registration.json');
}

export function saveRegistration(data, filePath) {
  filePath = filePath || defaultRegistrationPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function loadRegistration(filePath) {
  filePath = filePath || defaultRegistrationPath();
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

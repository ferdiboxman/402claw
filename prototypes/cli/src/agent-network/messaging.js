// XMTP messaging support for agent-to-agent communication
// Requires: npm install @xmtp/agent-sdk (optional dependency)

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export class AgentMessaging {
  #privateKey;
  #options;
  #agent = null;
  #walletAddress = '';
  #running = false;
  #messageLog;

  constructor(privateKey, options = {}) {
    this.#privateKey = privateKey;
    this.#options = options;
    const dbDir = options.dbPath || path.join(process.env.HOME || '.', '.402claw', 'xmtp');
    this.#messageLog = path.join(dbDir, 'messages.jsonl');
  }

  async start() {
    let Agent, createUser, createSigner;
    try {
      ({ Agent, createUser, createSigner } = await import('@xmtp/agent-sdk'));
    } catch {
      throw new Error('XMTP Agent SDK not installed. Run: npm install @xmtp/agent-sdk');
    }

    const pk = this.#privateKey.replace(/^0x/, '');
    const user = createUser(`0x${pk}`);
    this.#walletAddress = user.account.address;
    const signer = createSigner(user);

    const dbDir = this.#options.dbPath || path.join(process.env.HOME || '.', '.402claw', 'xmtp');
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

    const keyPath = path.join(dbDir, 'encryption-key');
    let encKeyHex;
    if (this.#options.encryptionKey) {
      encKeyHex = this.#options.encryptionKey.replace(/^0x/, '');
    } else if (fs.existsSync(keyPath)) {
      encKeyHex = fs.readFileSync(keyPath, 'utf8').trim().replace(/^0x/, '');
    } else {
      encKeyHex = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(keyPath, encKeyHex, { mode: 0o600 });
    }

    const dbPath = path.join(dbDir, `xmtp-${user.account.address}.db3`);
    const env = this.#options.env || 'production';

    this.#agent = await Agent.create(signer, {
      env,
      dbPath,
      dbEncryptionKey: `0x${encKeyHex}`,
    });

    this.#running = true;
    return { address: this.#walletAddress, inboxId: this.#agent.client.inboxId, env };
  }

  async sendMessage(recipientAddress, message) {
    if (!this.#agent) throw new Error('Client not started. Call start() first.');

    const addr = recipientAddress.toLowerCase();
    const identifier = { identifier: addr, identifierKind: 0 };
    const canMsg = await this.#agent.client.canMessage([identifier]);
    const reachable = canMsg.get(addr) ?? canMsg.get(recipientAddress) ?? false;

    if (!reachable) {
      return { sent: false, error: `${recipientAddress} is not on XMTP network` };
    }

    const dm = await this.#agent.createDmWithAddress(addr);
    const msgId = await dm.sendText(message);

    this.#logMessage('self', message, `-> ${recipientAddress}`);
    return { sent: true, msgId, to: recipientAddress };
  }

  async getInbox(limit = 20) {
    if (!this.#agent) throw new Error('Client not started. Call start() first.');

    await this.#agent.client.conversations.syncAll();
    let conversations;
    try {
      conversations = await this.#agent.client.conversations.list({ consentStates: [0, 1] });
    } catch {
      conversations = await this.#agent.client.conversations.list();
    }

    const results = [];
    for (const conv of conversations.slice(0, limit)) {
      try {
        await conv.sync();
        const messages = await conv.messages({ limit: 5 });
        results.push({
          id: conv.id,
          peerAddress: conv.peerAddress || 'unknown',
          messages: messages.map(m => ({
            sender: m.senderInboxId,
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
            timestamp: m.sentAt || null,
          })),
        });
      } catch { /* skip */ }
    }

    return results;
  }

  getAddress() {
    return this.#walletAddress;
  }

  isRunning() {
    return this.#running;
  }

  #logMessage(sender, incoming, outgoing) {
    const entry = {
      timestamp: new Date().toISOString(),
      sender,
      incoming: incoming?.substring(0, 500),
      outgoing: outgoing?.substring(0, 500),
    };
    try {
      const dir = path.dirname(this.#messageLog);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(this.#messageLog, JSON.stringify(entry) + '\n');
    } catch { /* non-critical */ }
  }

  async stop() {
    this.#running = false;
    if (this.#agent) {
      try { await this.#agent.stop(); } catch { /* ignore */ }
    }
    this.#agent = null;
  }
}

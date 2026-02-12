import crypto from "node:crypto";

export function json(response, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    ...headers,
  });
  response.end(body);
}

export function b64Encode(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

export function b64Decode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function randomHex(bytes = 8) {
  return `0x${crypto.randomBytes(bytes).toString("hex")}`;
}

export const config = {
  maxDuration: 10,
};

export default async function handler(request) {
  const url = new URL(request.url);
  return {
    ok: true,
    message: "Hello from code function",
    path: url.pathname,
    timestamp: new Date().toISOString(),
  };
}

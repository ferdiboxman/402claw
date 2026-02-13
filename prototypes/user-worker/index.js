export default {
  async fetch(request, env) {
    return new Response(JSON.stringify({
      ok: true,
      message: "Hello from clawr user worker!",
      url: request.url,
      timestamp: new Date().toISOString()
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }
}

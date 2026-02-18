const DATA = [
  {"provider":"Anthropic","model":"claude-opus-4","input_per_1m":15.00,"output_per_1m":75.00,"context_window":200000,"max_output":32000,"features":["vision","tool_use","extended_thinking"],"updated":"2025-02-01"},
  {"provider":"Anthropic","model":"claude-sonnet-4","input_per_1m":3.00,"output_per_1m":15.00,"context_window":200000,"max_output":64000,"features":["vision","tool_use","code_generation"],"updated":"2025-02-01"},
  {"provider":"Anthropic","model":"claude-3.5-haiku","input_per_1m":0.80,"output_per_1m":4.00,"context_window":200000,"max_output":8192,"features":["vision","tool_use","fast_response"],"updated":"2025-02-01"},
  {"provider":"OpenAI","model":"gpt-4o","input_per_1m":2.50,"output_per_1m":10.00,"context_window":128000,"max_output":16384,"features":["vision","tool_use","structured_output"],"updated":"2025-02-01"},
  {"provider":"OpenAI","model":"gpt-4o-mini","input_per_1m":0.15,"output_per_1m":0.60,"context_window":128000,"max_output":16384,"features":["vision","tool_use","structured_output"],"updated":"2025-02-01"},
  {"provider":"OpenAI","model":"o1","input_per_1m":15.00,"output_per_1m":60.00,"context_window":200000,"max_output":100000,"features":["reasoning","extended_thinking"],"updated":"2025-02-01"},
  {"provider":"OpenAI","model":"o3-mini","input_per_1m":1.10,"output_per_1m":4.40,"context_window":200000,"max_output":100000,"features":["reasoning","fast_response"],"updated":"2025-02-01"},
  {"provider":"Google","model":"gemini-2.0-flash","input_per_1m":0.10,"output_per_1m":0.40,"context_window":1000000,"max_output":8192,"features":["vision","tool_use","multimodal"],"updated":"2025-02-01"},
  {"provider":"Google","model":"gemini-1.5-pro","input_per_1m":1.25,"output_per_1m":5.00,"context_window":2000000,"max_output":8192,"features":["vision","tool_use","long_context"],"updated":"2025-02-01"},
  {"provider":"DeepSeek","model":"deepseek-v3","input_per_1m":0.27,"output_per_1m":1.10,"context_window":64000,"max_output":8192,"features":["code_generation","reasoning"],"updated":"2025-02-01"},
  {"provider":"DeepSeek","model":"deepseek-r1","input_per_1m":0.55,"output_per_1m":2.19,"context_window":64000,"max_output":8192,"features":["extended_thinking","reasoning"],"updated":"2025-02-01"},
  {"provider":"Mistral","model":"mistral-large-2","input_per_1m":2.00,"output_per_1m":6.00,"context_window":128000,"max_output":8192,"features":["tool_use","multilingual"],"updated":"2025-02-01"},
  {"provider":"Mistral","model":"codestral","input_per_1m":0.30,"output_per_1m":0.90,"context_window":256000,"max_output":8192,"features":["code_generation","fill_in_middle"],"updated":"2025-02-01"},
  {"provider":"Meta","model":"llama-3.3-70b","input_per_1m":0.60,"output_per_1m":0.60,"context_window":128000,"max_output":4096,"features":["open_source","tool_use"],"updated":"2025-02-01"},
  {"provider":"xAI","model":"grok-2","input_per_1m":2.00,"output_per_1m":10.00,"context_window":131072,"max_output":8192,"features":["vision","real_time_data"],"updated":"2025-02-01"}
];

export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    if (url.pathname.endsWith('/records') || url.pathname.endsWith('/')) {
      return new Response(JSON.stringify({ ok: true, count: DATA.length, records: DATA }), {
        headers: { 'content-type': 'application/json' }
      });
    }
    
    // Filter by provider
    const provider = url.searchParams.get('provider');
    if (provider) {
      const filtered = DATA.filter(m => m.provider.toLowerCase() === provider.toLowerCase());
      return new Response(JSON.stringify({ ok: true, count: filtered.length, records: filtered }), {
        headers: { 'content-type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ ok: true, count: DATA.length, records: DATA }), {
      headers: { 'content-type': 'application/json' }
    });
  }
};

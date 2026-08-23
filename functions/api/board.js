const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json"
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function onRequestGet(context) {
  try {
    const kv = context.env.MASJID_KV;
    if (!kv) {
      return new Response(JSON.stringify({ error: "KV namespace missing" }), { status: 500, headers: corsHeaders });
    }
    
    let data = await kv.get("live_board_data", "json");
    return new Response(JSON.stringify({ data: data || null }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestPost(context) {
  try {
    const secretPassword = context.env.ADMIN_PASSWORD;
    if (!secretPassword) {
      return new Response(JSON.stringify({ success: false, error: "ADMIN_PASSWORD secret missing." }), { status: 500, headers: corsHeaders });
    }

    const body = await context.request.json();
    const { password } = body;

    if (password === secretPassword) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: corsHeaders
      });
    } else {
      return new Response(JSON.stringify({ success: false, error: "Incorrect password." }), {
        status: 401,
        headers: corsHeaders
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestPut(context) {
  try {
    const kv = context.env.MASJID_KV;
    if (!kv) {
      return new Response(JSON.stringify({ error: "KV namespace missing" }), { status: 500, headers: corsHeaders });
    }

    const body = await context.request.json();
    await kv.put("live_board_data", JSON.stringify(body));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
  }
}

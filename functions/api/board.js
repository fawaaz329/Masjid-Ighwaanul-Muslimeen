export async function onRequestGet(context) {
  try {
    const kv = context.env.MASJID_KV;
    if (!kv) return new Response(JSON.stringify({ error: "KV missing" }), { status: 500 });
    
    let data = await kv.get("live_board_data", "json");
    return new Response(JSON.stringify({ data: data || null }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const secretPassword = context.env.ADMIN_PASSWORD;
    if (!secretPassword) return new Response(JSON.stringify({ success: false, error: "ADMIN_PASSWORD secret missing." }), { status: 500 });

    const body = await context.request.json();
    if (body.password === secretPassword) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } else {
      return new Response(JSON.stringify({ success: false, error: "Wrong password" }), { status: 401 });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function onRequestPut(context) {
  try {
    const kv = context.env.MASJID_KV;
    if (!kv) return new Response(JSON.stringify({ error: "KV missing" }), { status: 500 });

    const body = await context.request.json();
    await kv.put("live_board_data", JSON.stringify(body));

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function onRequestGet(context) {
  try {
    const kv = context.env.MASJID_KV;
    if (!kv) {
      return new Response(JSON.stringify({ error: "KV namespace binding 'MASJID_KV' is missing." }), { status: 500 });
    }

    let data = await kv.get("live_board_data", "json");
    if (!data) {
      data = { autoApi: true, iqamaOffset: 10, hijriOffset: 0 };
    }

    return new Response(JSON.stringify({ data }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const secretPassword = context.env.ADMIN_PASSWORD; // Pulls the secret from Cloudflare environment
    if (!secretPassword) {
      return new Response(JSON.stringify({ success: false, error: "ADMIN_PASSWORD secret is not configured in Cloudflare." }), { status: 500 });
    }

    const body = await context.request.json();
    const { password } = body;

    if (password === secretPassword) {
      return new Response(JSON.stringify({ success: true, authenticated: true }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } else {
      return new Response(JSON.stringify({ success: false, authenticated: false, error: "Incorrect password." }), { status: 401 });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function onRequestPut(context) {
  try {
    const kv = context.env.MASJID_KV;
    if (!kv) {
      return new Response(JSON.stringify({ error: "KV namespace missing." }), { status: 500 });
    }

    const body = await context.request.json();
    await kv.put("live_board_data", JSON.stringify(body));

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

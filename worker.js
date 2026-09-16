export default {
  async fetch(request) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ============================
    // /proxy — Video/Audio file proxy
    // ============================
    if (url.pathname === "/proxy") {
      const targetUrl = url.searchParams.get("url");
      const filename = url.searchParams.get("filename") || "download.mp4";

      if (!targetUrl) {
        return new Response(JSON.stringify({ error: "url required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      try {
        const upstream = await fetch(targetUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "*/*",
          }
        });

        if (!upstream.ok) {
          return new Response("Upstream error: " + upstream.status, {
            status: upstream.status,
            headers: corsHeaders
          });
        }

        const headers = new Headers();
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set(
          "Content-Type",
          upstream.headers.get("Content-Type") || "application/octet-stream"
        );
        headers.set(
          "Content-Disposition",
          'attachment; filename="' + encodeURIComponent(filename) + '"'
        );

        const len = upstream.headers.get("Content-Length");
        if (len) headers.set("Content-Length", len);

        return new Response(upstream.body, { status: 200, headers });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // ============================
    // / — YouTube API (type support)
    // ============================
    if (url.pathname === "/" || url.pathname === "") {
      const videoUrl = url.searchParams.get("url");
      const type = url.searchParams.get("type") || "mp4";

      if (!videoUrl) {
        return new Response(JSON.stringify({
          status: "online",
          name: "YT Worker API",
          usage: "?url=https://youtube.com/watch?v=...&type=mp3"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      try {
        // ⭐ type parameter එකත් යවනවා
        const apiUrl = "https://multidl.kcey.workers.dev/?url=" + 
                       encodeURIComponent(videoUrl) + 
                       "&type=" + type;

        const res = await fetch(apiUrl, {
          headers: { "User-Agent": "Mozilla/5.0" }
        });

        const data = await res.text();

        return new Response(data, {
          status: res.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  }
};

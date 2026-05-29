export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Extract the target URL from the path
    let targetUrlString = url.pathname.slice(1) + url.search;

    // Handle root path
    if (!targetUrlString || targetUrlString === "index.html") {
      return new Response(
        "CORS Proxy Active. Append your target URL to the path.",
        { status: 200 }
      );
    }

    // Ensure protocol exists
    if (
      !targetUrlString.startsWith("http://") &&
      !targetUrlString.startsWith("https://")
    ) {
      targetUrlString = "https://" + targetUrlString;
    }

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        request.headers.get("Access-Control-Request-Headers") || "*",
      "Access-Control-Expose-Headers":
        "Content-Length, Content-Range, Accept-Ranges",
      "Access-Control-Allow-Credentials": "true",
    };

    // Handle preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    try {
      // Forward selected headers
      const newHeaders = new Headers();

      const headersToForward = [
        "range",
        "accept",
        "user-agent",
        "content-type",
      ];

      for (const header of headersToForward) {
        if (request.headers.has(header)) {
          newHeaders.set(header, request.headers.get(header));
        }
      }

      // Fetch target
      const response = await fetch(targetUrlString, {
        method: request.method,
        headers: newHeaders,
        redirect: "follow",
      });

      // Merge headers
      const modifiedHeaders = new Headers(response.headers);

      Object.entries(corsHeaders).forEach(([key, value]) => {
        modifiedHeaders.set(key, value);
      });

      // Ensure streaming support
      if (!modifiedHeaders.has("Accept-Ranges")) {
        modifiedHeaders.set("Accept-Ranges", "bytes");
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: modifiedHeaders,
      });
    } catch (error) {
      return new Response(`Proxy Error: ${error.message}`, {
        status: 500,
        headers: corsHeaders,
      });
    }
  },
};
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API route to proxy WordPress requests
  app.post("/api/wp-proxy", async (req, res) => {
    try {
      const { url, method, headers, body } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: "Missing URL in proxy request" });
      }

      const fetchOptions: RequestInit = {
        method: method || "GET",
        headers: headers || {},
      };

      if (body) {
        fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);
      
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        return res.status(response.status).json(data);
      } else {
        const text = await response.text();
        return res.status(response.status).send(text);
      }
    } catch (error: any) {
      console.error("WP Proxy error:", error);
      res.status(500).json({ error: error.message || "Proxy request failed" });
    }
  });

  // Media Proxy endpoint (handles base64 buffer conversion)
  app.post("/api/wp-proxy-media", async (req, res) => {
    try {
      const { url, headers, base64Data } = req.body;

      if (!url || !base64Data) {
        return res.status(400).json({ error: "Missing URL or base64Data" });
      }

      const buffer = Buffer.from(base64Data, 'base64');

      const response = await fetch(url, {
        method: "POST",
        headers: headers || {},
        body: buffer
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        return res.status(response.status).json(data);
      } else {
        const text = await response.text();
        return res.status(response.status).send(text);
      }
    } catch (error: any) {
      console.error("WP Media Proxy error:", error);
      res.status(500).json({ error: error.message || "Media proxy request failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

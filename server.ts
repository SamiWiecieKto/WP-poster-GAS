import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// File-backed store for saved WordPress sites (domains + credentials).
const DATA_DIR = path.join(process.cwd(), "data");
const SITES_FILE = path.join(DATA_DIR, "sites.json");

interface WPSite {
  id: string;
  name: string;
  url: string;
  username: string;
  appPassword: string;
}

function readSites(): WPSite[] {
  try {
    const raw = fs.readFileSync(SITES_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSites(sites: WPSite[]) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  // Write to a temp file then rename so a crash mid-write can't corrupt or lose the store.
  const tmp = `${SITES_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(sites, null, 2), "utf-8");
  fs.renameSync(tmp, SITES_FILE);
}

function sanitizeInput(body: any): Omit<WPSite, "id"> | null {
  if (!body) return null;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const appPassword = typeof body.appPassword === "string" ? body.appPassword : "";
  if (!name || !url || !username || !appPassword) return null;
  return { name, url, username, appPassword };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // --- Saved sites CRUD ---
  app.get("/api/sites", (_req, res) => {
    res.json(readSites());
  });

  app.post("/api/sites", (req, res) => {
    const input = sanitizeInput(req.body);
    if (!input) {
      return res.status(400).json({ error: "Missing required fields: name, url, username, appPassword" });
    }
    const sites = readSites();
    const site: WPSite = { id: crypto.randomUUID(), ...input };
    sites.push(site);
    writeSites(sites);
    res.status(201).json(site);
  });

  app.put("/api/sites/:id", (req, res) => {
    const input = sanitizeInput(req.body);
    if (!input) {
      return res.status(400).json({ error: "Missing required fields: name, url, username, appPassword" });
    }
    const sites = readSites();
    const index = sites.findIndex((s) => s.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: "Site not found" });
    }
    const updated: WPSite = { id: req.params.id, ...input };
    sites[index] = updated;
    writeSites(sites);
    res.json(updated);
  });

  app.delete("/api/sites/:id", (req, res) => {
    const sites = readSites();
    const next = sites.filter((s) => s.id !== req.params.id);
    if (next.length === sites.length) {
      return res.status(404).json({ error: "Site not found" });
    }
    writeSites(next);
    res.json({ ok: true });
  });

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

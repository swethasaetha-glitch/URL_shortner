import "dotenv/config";

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { DbService } from "./server/db.js";
import { parseUserAgent, getGeographicData } from "./server/utils.js";

// Initialize router imports
import authRoutes from "./server/routes/auth.js";
import urlRoutes from "./server/routes/urls.js";
import analyticsRoutes from "./server/routes/analytics.js";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  
  // Standard Middleware
  app.use(express.json());

  // Log request metrics
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });

  // REST API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/urls", urlRoutes);
  app.use("/api/analytics", analyticsRoutes);

  // Health endpoint checks
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", database: process.env.MONGO_URI ? "MongoDB Atlas" : "Local JSON Engine" });
  });

  // @route   GET /:shortCode
  // @desc    Redirect short code to original target URL + track click analytics
  app.get("/:shortCode", async (req, res, next) => {
    try {
      const { shortCode } = req.params;

      // Skip API terms, files, and static assets
      if (
        shortCode.startsWith("api") || 
        shortCode.includes(".") || 
        shortCode === "src" || 
        shortCode === "assets"
      ) {
        return next();
      }

      // Query database for matching short code or custom alias
      const urlRecord = await DbService.Url.findByShortCode(shortCode);
      if (!urlRecord) {
        return next(); // pass control to frontend static asset router, or show elegant 404
      }

      // Check URL status (Active/Expired/Inactive)
      if (urlRecord.status === "expired" || urlRecord.status === "inactive") {
        return res.status(410).send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Link Inactive - LinkPulse AI</title>
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body class="bg-[#0F172A] text-[#F8FAFC] flex flex-col justify-center items-center min-h-screen px-4 font-sans selection:bg-[#6366F1]">
            <div class="max-w-md w-full bg-[#1E293B]/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl text-center space-y-6">
              <div class="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div class="space-y-2">
                <h1 class="text-2xl font-bold tracking-tight">Short Link Inactive</h1>
                <p class="text-sm text-[#94A3B8]">
                  The short link <span class="text-[#6366F1] font-mono">${shortCode}</span> has either expired, exceeded click ceilings, or was manually disabled by its creator.
                </p>
              </div>
              <div class="pt-4 border-t border-white/5 flex flex-col gap-2">
                <a href="${process.env.APP_URL || "/"}" class="w-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white hover:from-[#4F46E5] hover:to-[#7C3AED] py-3 px-4 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/10 transition-all duration-200">
                  Shorten Your Own URLs
                </a>
              </div>
            </div>
            <div class="mt-8 text-center">
              <p class="text-xs text-[#64748B] tracking-wide">POWERED BY LINKPULSE AI</p>
            </div>
          </body>
          </html>
        `);
      }

      // Check static expiry date check
      if (urlRecord.expiryDate && new Date(urlRecord.expiryDate).getTime() < Date.now()) {
        await DbService.Url.update(urlRecord._id, { status: "expired" });
        return res.redirect(req.originalUrl); // Reloading triggers the expired block dynamically
      }

      // Extract User Agent Client Identifiers
      const userAgentStr = req.headers["user-agent"];
      const { browser, os, device } = parseUserAgent(userAgentStr);

      // Extract Client IP Geolocation Coordinates
      const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const ip = typeof rawIp === "string" ? rawIp.split(",")[0].trim() : undefined;
      const { country, city } = getGeographicData(ip);

      // Save click analytics visit item asynchronously
      await DbService.Visit.create({
        urlId: urlRecord._id,
        browser,
        os,
        device,
        country,
        city,
      });

      // Increment click counter in shortener index
      await DbService.Url.updateClicks(urlRecord._id, urlRecord.clicks + 1);

      // Perform Redirection (302 found matches search standard behavior)
      return res.redirect(urlRecord.originalUrl);
    } catch (error) {
      console.error("Redirection routing error:", error);
      return res.status(500).send("Temporary error redirection processing.");
    }
  });

  // Integration of standard UI builder
  if (process.env.NODE_ENV !== "production") {
    // Vite Dev Server middleware inclusion
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static compiled site delivery
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 LinkPulse AI Core started! Listening on port ${PORT}`);
    console.log(`👉 Environment loaded: process.env.NODE_ENV = ${process.env.NODE_ENV || "development"}`);
  });
}

startServer().catch((err) => {
  console.error("🔴 LinkPulse AI Server initialization failed:", err);
});

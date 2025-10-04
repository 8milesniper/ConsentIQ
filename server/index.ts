// Load environment variables from .env file FIRST (before other imports)
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
// Load .env from project root (parent directory) - ES module compatible
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cookieParser from "cookie-parser";

const app = express();

// Environment check endpoint (for debugging deployment issues)
app.get('/api/env-check', (req, res) => {
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET', 
    'STRIPE_SECRET_KEY',
    'STRIPE_PRICE_ID',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const envStatus = requiredEnvVars.reduce((acc, key) => {
    acc[key] = process.env[key] ? '✅ SET' : '❌ MISSING';
    return acc;
  }, {} as Record<string, string>);
  
  res.json({
    environment: process.env.REPLIT_DEPLOYMENT === '1' ? 'PRODUCTION' : 'DEVELOPMENT',
    envVars: envStatus,
    timestamp: new Date().toISOString()
  });
});

// CORS configuration for cookie-based authentication
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Stripe webhook needs RAW body - must come BEFORE express.json()
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  let event;

  try {
    const Stripe = await import('stripe');
    const stripe = new Stripe.default(process.env.STRIPE_SECRET_KEY!);

    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("⚠️ Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const userId = session.metadata?.userId;

    if (userId) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://fvnvmdhvtbvtcfnrobsm.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { error } = await supabase
        .from("users")
        .update({ subscription_status: "active" })
        .eq("id", userId);

      if (error) {
        console.error("❌ Failed to update Supabase user:", error.message);
        return res.status(500).send("Supabase update failed");
      }
      console.log(`✅ User ${userId} marked active in Supabase`);
    }
  }

  res.status(200).send("OK");
});

app.use(express.json({ limit: '10mb' })); // Increase limit for profile pictures
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser()); // Enable cookie parsing for HTTP-only auth cookies

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
    });
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
})();

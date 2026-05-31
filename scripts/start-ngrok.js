const path = require("path");
const dotenv = require("dotenv");
const ngrok = require("@ngrok/ngrok");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const port = Number.parseInt(process.env.PORT, 10) || 5000;
const authtoken = process.env.NGROK_AUTHTOKEN || "";
const domain = process.env.NGROK_DOMAIN || "";

const normalizeBaseUrl = (value) => String(value || "").replace(/\/+$/, "");

const printUrls = (baseUrl) => {
  const normalizedUrl = normalizeBaseUrl(baseUrl);

  console.log(`[ngrok] Public URL: ${normalizedUrl}`);
  console.log(`[ngrok] Paystack webhook URL: ${normalizedUrl}/api/payments/webhook`);
  console.log(`[ngrok] Paystack callback URL: ${normalizedUrl}/api/payments/callback`);
};

const start = async () => {
  try {
    const options = { addr: port };

    if (authtoken) {
      options.authtoken = authtoken;
    }

    if (domain) {
      options.domain = domain;
    }

    const listener = await ngrok.forward(options);
    const publicUrl = listener.url();
    printUrls(publicUrl);

    const shutdown = async () => {
      try {
        await listener.close();
        await ngrok.disconnect();
        await ngrok.kill();
      } finally {
        process.exit(0);
      }
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error(`[ngrok] Failed to start tunnel: ${error.message}`);
    process.exit(1);
  }
};

start();

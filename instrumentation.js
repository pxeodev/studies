import { registerOTel } from '@vercel/otel'
import { LangWatchExporter } from 'langwatch'
import { LangfuseExporter } from "langfuse-vercel";

export function register() {
  // registerOTel({
  //   serviceName: 'coinrotator',
  //   traceExporter: new LangWatchExporter({
  //     apiKey: process.env.LANGWATCH_API_KEY
  //   })
  // })

  registerOTel({
    serviceName: "coinrotator",
    traceExporter: new LangfuseExporter(),
  });

  // // Initialize traceloop only for Edge runtimes
  // if (process.env.NEXT_RUNTIME === 'edge') {
  //   try {
  //     console.log('Initializing Traceloop for Edge runtime');
  //     const traceloop = require('@traceloop/node-server-sdk');
  //     traceloop.initialize({
  //       appName: "coinrotator",
  //       apiKey: process.env.TRACELOOP_API_KEY,
  //       baseUrl: process.env.TRACELOOP_BASE_URL,
  //       disableBatch: true,
  //       traceloopSyncEnabled: false,
  //     });
  //   } catch (error) {
  //     console.warn('Failed to initialize Traceloop:', error.message);
  //   }
  // }
}
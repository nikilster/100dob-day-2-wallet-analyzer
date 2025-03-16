import type { NextConfig } from "next";
import type { Configuration } from "webpack"; // Import Webpack types

const nextConfig: NextConfig = {
  /* config options here */

  webpack: (config: Configuration) => {
    if (config.externals) {
      config.externals.push("pino-pretty", "lokijs", "encoding");
    } else {
      config.externals = ["pino-pretty", "lokijs", "encoding"];
    }
    return config;
  },
  
};

export default nextConfig;

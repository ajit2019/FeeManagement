import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  turbopack: {
    // Avoid inferring workspace root from a parent lockfile (e.g. C:\Users\...\package-lock.json)
    root: __dirname,
  },
};

export default nextConfig;

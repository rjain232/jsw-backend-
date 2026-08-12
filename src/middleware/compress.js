const zlib = require("zlib");
const { pipeline } = require("stream");

const THRESHOLD_BYTES = 1024; // skip compression for responses smaller than 1KB

/**
 * Compression middleware — prefers Brotli, falls back to gzip.
 * Uses Node.js built-in zlib only, no native dependencies.
 */
const compress = (req, res, next) => {
  const acceptEncoding = req.headers["accept-encoding"] || "";

  const _write = res.write.bind(res);
  const _end = res.end.bind(res);
  const _setHeader = res.setHeader.bind(res);

  let compressor = null;
  let encoding = null;

  if (acceptEncoding.includes("br")) {
    encoding = "br";
    compressor = zlib.createBrotliCompress({
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 4,
      },
    });
  } else if (acceptEncoding.includes("gzip")) {
    encoding = "gzip";
    compressor = zlib.createGzip({
      level: zlib.constants.Z_DEFAULT_COMPRESSION,
    });
  }

  if (!compressor) return next();

  res.setHeader = (name, value) => {
    if (name.toLowerCase() === "content-length") return;
    _setHeader(name, value);
  };

  res.setHeader("Content-Encoding", encoding);
  res.setHeader("Vary", "Accept-Encoding");
  res.removeHeader("Content-Length");

  let headersSent = false;

  const flushHeaders = () => {
    if (!headersSent) {
      headersSent = true;
    }
  };

  compressor.on("data", (chunk) => {
    flushHeaders();
    _write(chunk);
  });

  compressor.on("end", () => {
    _end();
  });

  compressor.on("error", (err) => {
    console.error("[compress] error:", err.message);
    _end();
  });

  res.write = (chunk, encoding, callback) => {
    if (chunk) compressor.write(chunk);
    if (typeof encoding === "function") encoding();
    if (typeof callback === "function") callback();
    return true;
  };

  res.end = (chunk, encoding, callback) => {
    if (chunk) compressor.write(chunk);
    compressor.end();
    if (typeof encoding === "function") encoding();
    if (typeof callback === "function") callback();
  };

  next();
};

module.exports = compress;

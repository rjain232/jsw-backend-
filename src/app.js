
const express = require("express");
const fs = require("fs");
const path = require("path");
const compress = require("./middleware/compress");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const authRoutes = require("./routes/auth");
const accessRoutes = require("./routes/access");
const setupRoutes = require("./routes/setup");
const userRoutes = require("./routes/users");
const productionRoutes = require("./routes/production");
const hourlyProductionRoutes = require("./routes/hourlyProduction");
const productionOverviewRoutes = require("./routes/productionOverview");
const masterDataRoutes = require("./routes/masterData");
const countryRoutes = require("./routes/country");
const appConfig = require("./config/appConfig");
const lineVariantRoutes =require("./routes/lineVariant")
const annualGraphProductionRoutes=require("./routes/annualGraphProduction")
const detailedProductionRoutes=require("./routes/detailedProduction")
const alarmRoutes=require("./routes/alarm")
const cycleTimeRoutes=require("./routes/cycleTime")
const shiftSummaryRoutes=require("./routes/shiftSummary")
const oeeRoutes=require("./routes/oee")
const lineCycleTimeRoutes=require("./routes/lineCycleTime")
const lossesAnalysisRoutes=require("./routes/lossesAnalysis")
const mtbfMttrRoutes=require("./routes/mtbfMttr")
const robotHealthRoutes=require("./routes/robotHealth")
const robotSpotHitRateRoutes=require("./routes/robotSpotHitRate")
const robotStatusRoutes=require("./routes/robotStatus")
const partMarriageRoutes=require("./routes/partMarriage")
const tipChangeCountRoutes=require("./routes/tipChangeCount")
const dashboardRoutes = require("./routes/dashboard");
const lineBufferRoutes = require("./routes/lineBuffer");
const testRoutes = require("./routes/test");
const shiftRoutes = require("./routes/shift"); // Added this line


const app = express();

app.use(compress); // Brotli (br) + gzip via Node.js built-in zlib
app.use(express.json());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || appConfig.allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "connect-src": ["'self'", ...appConfig.allowedOrigins],
        "script-src": ["'self'", "'unsafe-inline'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:"],
        "font-src": ["'self'"],
      },
    },
  })
);
app.use(morgan("dev"));

// Serve frontend static files
const frontendCandidates = [
  path.resolve(__dirname, "..", "dist", "dist"),
  path.resolve(__dirname, "..", "..", "dist", "dist"),
  path.resolve(__dirname, "..", "..", "..", "dist", "dist"),
];
const frontendPath = frontendCandidates.find((candidate) => fs.existsSync(candidate)) || frontendCandidates[0];
app.use(express.static(frontendPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.get("/health", (req, res) => {
  res.send("API is running");
});

app.use("/api/setup", setupRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/access", accessRoutes);
app.use("/api/users", userRoutes);
app.use("/api/production", productionRoutes);
app.use("/api/production", hourlyProductionRoutes);
app.use("/api/production", productionOverviewRoutes);
app.use("/api/production",annualGraphProductionRoutes)
app.use("/api/production",detailedProductionRoutes)
app.use("/api/maintenance",tipChangeCountRoutes)
app.use("/api/alarm",alarmRoutes)
app.use("/api/cycle-time",cycleTimeRoutes)
app.use("/api/production",shiftSummaryRoutes)
app.use("/api/master", masterDataRoutes);
app.use("/api/countries", countryRoutes);
app.use("/api/master",lineVariantRoutes)
app.use("/api/oee",oeeRoutes)
app.use("/api/line-cycle-time",lineCycleTimeRoutes)
app.use("/api/losses-analysis",lossesAnalysisRoutes)
app.use("/api/mtbf-mttr",mtbfMttrRoutes)
app.use("/api/robot-health",robotHealthRoutes)
app.use("/api/robot-spot-hit-rate",robotSpotHitRateRoutes)
app.use("/api/robot-status",robotStatusRoutes)
app.use("/api/part-marriage",partMarriageRoutes)
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/line-buffer", lineBufferRoutes);
app.use("/api/test", testRoutes);
app.use("/api/shifts", shiftRoutes); // Added this line


// SPA fallback
app.use((req, res, next) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error("API Error:", err.message);
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? "Internal server error" : err.message;

  res.status(statusCode).json({ message });
});

module.exports = app;

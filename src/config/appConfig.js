const roles = {
  superadmin: "superadmin",
  admin: "admin",
  user: "user",
};

const sidebarPages = [
  { key: "overview", label: "Overview", path: "/overview", order: 10 },
  { key: "oee", label: "OEE", path: "/oee", order: 20 },
  {
    key: "robot-monitoring",
    label: "Robot Monitoring",
    path: "/robot-monitoring",
    order: 30,
  },
  {
    key: "production-control",
    label: "Production Control",
    path: "/production-control",
    order: 40,
  },
  { key: "maintenance", label: "Maintenance", path: "/maintenance", order: 50 },
  { key: "line-status", label: "Line Status", path: "/line-status", order: 60 },
  {
    key: "process-configurator",
    label: "Process Configurator",
    path: "/process-configurator",
    order: 70,
  },
  {
    key: "third-party-data",
    label: "Third Party Data",
    path: "/third-party-data",
    order: 80,
  },
  {
    key: "part-marriage",
    label: "Part Marriage",
    path: "/part-marriage",
    order: 90,
  },
  {
    key: "share-report",
    label: "Share Report",
    path: "/share-report",
    order: 100,
  },
  {
    key: "access-configuration",
    label: "Access Configuration",
    path: "/access-configuration",
    order: 120,
    adminOnly: true,
  },
  {
    key: "user-management",
    label: "User Management",
    path: "/user-management",
    order: 130,
    superAdminOnly: true,
  },
];

const roleGroups = {
  all: [roles.superadmin, roles.admin, roles.user],
  fullAccess: [roles.superadmin, roles.admin],
  adminAccess: [roles.superadmin, roles.admin],
  superAdminAccess: [roles.superadmin],
  assignableAccess: [roles.user],
};

const appConfig = {
  port: process.env.PORT || 8080,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: "1d",
  superAdminSetupKey: process.env.SUPERADMIN_SETUP_KEY,
  authCookieName: "jsw_auth",
  authCookieMaxAgeMs: 24 * 60 * 60 * 1000,
  allowedOrigins: [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:5000",
    "http://localhost:5000",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://127.0.0.1:8080",
    "http://localhost:8080",
  ],
  isProduction: process.env.NODE_ENV === "production",
  roles,
  roleGroups,
  sidebarPages,
  sidebarPageKeys: new Set(sidebarPages.map((page) => page.key)),
  assignableSidebarPageKeys: new Set(
    sidebarPages
      .filter((page) => !page.adminOnly && !page.superAdminOnly)
      .map((page) => page.key),
  ),
};

module.exports = appConfig;

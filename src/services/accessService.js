const { getPool, sql } = require("../config/db");
const appConfig = require("../config/appConfig");
const { sidebarPages, sidebarPageKeys, assignableSidebarPageKeys } = appConfig;

const ensureAccessTables = async () => {
  const pool = getPool();

  await pool.request().query(`
    IF OBJECT_ID('dbo.SidebarPages', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.SidebarPages (
        PageKey NVARCHAR(100) NOT NULL PRIMARY KEY,
        Label NVARCHAR(150) NOT NULL,
        Path NVARCHAR(250) NOT NULL,
        DisplayOrder INT NOT NULL DEFAULT 0,
        AdminOnly BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END;

    IF OBJECT_ID('dbo.UserPageAccess', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.UserPageAccess (
        UserId NVARCHAR(100) NOT NULL,
        PageKey NVARCHAR(100) NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_UserPageAccess PRIMARY KEY (UserId, PageKey),
        CONSTRAINT FK_UserPageAccess_SidebarPages
          FOREIGN KEY (PageKey) REFERENCES dbo.SidebarPages(PageKey)
          ON DELETE CASCADE
      );
    END;
  `);
};

const syncSidebarPages = async () => {
  const pool = getPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    await new sql.Request(transaction).query(`
      IF EXISTS (SELECT 1 FROM dbo.SidebarPages WHERE PageKey = 'maintainance')
      BEGIN
        UPDATE dbo.UserPageAccess
        SET PageKey = 'maintenance'
        WHERE PageKey = 'maintainance'
          AND NOT EXISTS (
            SELECT 1
            FROM dbo.UserPageAccess existingAccess
            WHERE existingAccess.UserId = dbo.UserPageAccess.UserId
              AND existingAccess.PageKey = 'maintenance'
          );

        DELETE FROM dbo.UserPageAccess
        WHERE PageKey = 'maintainance';

        UPDATE dbo.SidebarPages
        SET
          PageKey = 'maintenance',
          Label = 'Maintenance',
          Path = '/maintenance',
          UpdatedAt = SYSUTCDATETIME()
        WHERE PageKey = 'maintainance'
          AND NOT EXISTS (
            SELECT 1
            FROM dbo.SidebarPages
            WHERE PageKey = 'maintenance'
          );
      END;
    `);

    for (const page of sidebarPages) {
      await new sql.Request(transaction)
        .input("pageKey", sql.NVarChar(100), page.key)
        .input("label", sql.NVarChar(150), page.label)
        .input("path", sql.NVarChar(250), page.path)
        .input("displayOrder", sql.Int, page.order)
        .input("adminOnly", sql.Bit, Boolean(page.adminOnly)).query(`
          MERGE dbo.SidebarPages AS target
          USING (
            SELECT
              @pageKey AS PageKey,
              @label AS Label,
              @path AS Path,
              @displayOrder AS DisplayOrder,
              @adminOnly AS AdminOnly
          ) AS source
          ON target.PageKey = source.PageKey
          WHEN MATCHED THEN
            UPDATE SET
              Label = source.Label,
              Path = source.Path,
              DisplayOrder = source.DisplayOrder,
              AdminOnly = source.AdminOnly,
              UpdatedAt = SYSUTCDATETIME()
          WHEN NOT MATCHED THEN
            INSERT (PageKey, Label, Path, DisplayOrder, AdminOnly)
            VALUES (
              source.PageKey,
              source.Label,
              source.Path,
              source.DisplayOrder,
              source.AdminOnly
            );
        `);
    }

    const cleanupRequest = new sql.Request(transaction);
    const keyPlaceholders = sidebarPages.map((page, index) => {
      const paramName = `pageKey${index}`;
      cleanupRequest.input(paramName, sql.NVarChar(100), page.key);
      return `@${paramName}`;
    });

    await cleanupRequest.query(`
      DELETE FROM dbo.SidebarPages
      WHERE PageKey NOT IN (${keyPlaceholders.join(", ")})
    `);

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const initializeAccessConfiguration = async () => {
  await ensureAccessTables();
  await syncSidebarPages();
};

const mapPage = (record) => ({
  key: record.PageKey,
  label: record.Label,
  path: record.Path,
  order: record.DisplayOrder,
  adminOnly: Boolean(record.AdminOnly),
  assignable: !Boolean(record.AdminOnly),
});

const getAllPages = async () => {
  const result = await getPool().request().query(`
    SELECT PageKey, Label, Path, DisplayOrder, AdminOnly
    FROM dbo.SidebarPages
    ORDER BY DisplayOrder ASC, Label ASC
  `);

  return result.recordset.map(mapPage);
};

const getPagesForUser = async (userId, isAdmin = false) => {
  if (isAdmin) {
    return getAllPages();
  }

  const result = await getPool()
    .request()
    .input("userId", sql.NVarChar(100), String(userId)).query(`
      SELECT p.PageKey, p.Label, p.Path, p.DisplayOrder, p.AdminOnly
      FROM dbo.SidebarPages p
      INNER JOIN dbo.UserPageAccess access
        ON access.PageKey = p.PageKey
      WHERE access.UserId = @userId
        AND p.AdminOnly = 0
      ORDER BY p.DisplayOrder ASC, p.Label ASC
    `);

  return result.recordset.map(mapPage);
};

const validatePageKeys = (pageKeys) => {
  if (!Array.isArray(pageKeys)) {
    const error = new Error("pageKeys must be an array");
    error.statusCode = 400;
    throw error;
  }

  const uniquePageKeys = [...new Set(pageKeys.map((key) => String(key)))];
  const invalidPageKeys = uniquePageKeys.filter(
    (key) => !sidebarPageKeys.has(key),
  );
  const adminOnlyPageKeys = uniquePageKeys.filter(
    (key) => !assignableSidebarPageKeys.has(key),
  );

  if (invalidPageKeys.length > 0) {
    const error = new Error(`Invalid page keys: ${invalidPageKeys.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  if (adminOnlyPageKeys.length > 0) {
    const error = new Error(
      `Admin-only pages cannot be assigned: ${adminOnlyPageKeys.join(", ")}`,
    );
    error.statusCode = 400;
    throw error;
  }

  return uniquePageKeys;
};

const setPagesForUser = async (userId, pageKeys) => {
  const validatedPageKeys = validatePageKeys(pageKeys);
  const normalizedUserId = String(userId);
  const pool = getPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    await new sql.Request(transaction)
      .input("userId", sql.NVarChar(100), normalizedUserId)
      .query("DELETE FROM dbo.UserPageAccess WHERE UserId = @userId");

    for (const pageKey of validatedPageKeys) {
      await new sql.Request(transaction)
        .input("userId", sql.NVarChar(100), normalizedUserId)
        .input("pageKey", sql.NVarChar(100), pageKey).query(`
          INSERT INTO dbo.UserPageAccess (UserId, PageKey)
          VALUES (@userId, @pageKey)
        `);
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  return getPagesForUser(normalizedUserId);
};

module.exports = {
  initializeAccessConfiguration,
  getAllPages,
  getPagesForUser,
  setPagesForUser,
};

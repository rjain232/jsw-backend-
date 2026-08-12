const axios = require('axios');
const { getPool, sql } = require('../config/db');

const fetchAndStoreCountries = async () => {
  const graphqlQuery = {
    query: `
      query {
        countries {
          code
          name
          capital
          currency
          emoji
        }
      }
    `,
  };

  try {
    console.log('Fetching country data from GraphQL endpoint...');
    const response = await axios.post('https://countries.trevorblades.com/', graphqlQuery);
    const countries = response.data.data.countries;
    console.log(`Fetched ${countries.length} countries.`);

    if (!countries || countries.length === 0) {
      throw new Error('No country data returned from the API.');
    }

    const pool = getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // For safety, let's clear the table first to avoid duplicates on re-runs.
      const deleteRequest = new sql.Request(transaction);
      await deleteRequest.query('TRUNCATE TABLE dbo.Countries');
      console.log('dbo.Countries table truncated.');

      const table = new sql.Table('dbo.Countries');
      table.create = true; // This can be risky if schema is not exact. Let's assume the table exists as per user.
      table.columns.add('Code', sql.NVarChar(10), { nullable: false, primary: true });
      table.columns.add('Name', sql.NVarChar(100), { nullable: true });
      table.columns.add('Capital', sql.NVarChar(100), { nullable: true });
      table.columns.add('Currency', sql.NVarChar(50), { nullable: true });
      table.columns.add('Emoji', sql.NVarChar(50), { nullable: true });

      let insertedCount = 0;
      for (const country of countries) {
        if(country.code && country.name && country.capital && country.currency && country.emoji){
            table.rows.add(country.code, country.name, country.capital, country.currency, country.emoji);
            insertedCount++;
        }
      }
      
      if (insertedCount > 0) {
        const bulkRequest = new sql.Request(transaction);
        const bulkResult = await bulkRequest.bulk(table);
        console.log(`${bulkResult.rowsAffected} rows were inserted into dbo.Countries.`);
      }


      await transaction.commit();
      console.log('Country data insertion transaction committed.');

      // Verification step
      const verifyRequest = new sql.Request(pool);
      const result = await verifyRequest.query('SELECT COUNT(*) as count FROM dbo.Countries');
      const count = result.recordset[0].count;
      console.log(`Verification: Found ${count} rows in dbo.Countries.`);
      
      return { inserted: insertedCount, verified: count };

    } catch (err) {
      console.error('Error during database transaction:', err);
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('Failed to fetch and store country data:', error.message);
    if (error.response) {
      console.error('GraphQL API Response Error:', error.response.data);
    }
    throw error;
  }
};

module.exports = {
  fetchAndStoreCountries,
};

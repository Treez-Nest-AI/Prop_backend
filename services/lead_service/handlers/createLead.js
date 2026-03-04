const pool = require("../db");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type,Accept,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Requested-With,Origin",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ message: "CORS preflight" }),
      };
    }

    const body = JSON.parse(event.body);

    const { name, phone, propertyName, visitDate } = body;

    // ✅ Validation
    if (!name || !phone || !propertyName || !visitDate) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          message: "All fields are required",
        }),
      };
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          message: "Phone must be 10 digits",
        }),
      };
    }

    const today = new Date().toISOString().split("T")[0];
    if (visitDate < today) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          message: "Past dates are not allowed",
        }),
      };
    }

    // ✅ Insert with correct column names
    const result = await pool.query(
      `INSERT INTO leads (name, phone, property_name, lead_date)
       VALUES ($1, $2, $3, $4)
       RETURNING *;`,
      [name, phone, propertyName, visitDate]
    );

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Lead saved successfully",
        data: result.rows[0],
      }),
    };

  } catch (error) {
    console.error("Database Error:", error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Internal Server Error",
      }),
    };
  }
};
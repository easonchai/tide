import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { address } = req.query;

  if (!address || typeof address !== "string") {
    return res.status(400).json({ error: "Address parameter is required" });
  }

  const backendUrl = "http://localhost:3001";

  try {
    console.log(
      `=== Frontend API: Fetching positions for user address: ${address} ===`
    );
    console.log(`Backend URL: ${backendUrl}/markets/positions/user/${address}`);

    const response = await fetch(
      `${backendUrl}/markets/positions/user/${address}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`Backend response status: ${response.status}`);
    console.log(`Backend response ok: ${response.ok}`);

    if (!response.ok) {
      console.error(`Backend error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error("Backend error response:", errorText);
      return res.status(response.status).json({
        error: `Backend error: ${response.status} ${response.statusText}`,
        details: errorText,
      });
    }

    const data = await response.json();
    console.log("Backend response data:", data);
    console.log("Backend data type:", typeof data);
    console.log(
      "Backend data length:",
      Array.isArray(data) ? data.length : "Not an array"
    );

    return res.status(200).json(data);
  } catch (error) {
    console.error("=== Frontend API Error ===");
    console.error("Error:", error);
    console.error(
      "Error message:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return res.status(500).json({
      error: "Failed to fetch user positions",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

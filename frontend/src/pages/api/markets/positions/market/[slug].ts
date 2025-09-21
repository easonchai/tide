import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { slug } = req.query;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!slug || typeof slug !== "string") {
    return res.status(400).json({ error: "Slug parameter is required" });
  }

  const backendUrl = "http://localhost:3001";

  try {
    console.log(`Fetching positions for market slug: ${slug}`);

    const response = await fetch(
      `${backendUrl}/markets/positions/market/${slug}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`Backend response status: ${response.status}`);

    const data = await response.json();
    console.log("Backend response data:", data);

    res.status(response.status).json(data);
  } catch (error) {
    console.error("Market positions API Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

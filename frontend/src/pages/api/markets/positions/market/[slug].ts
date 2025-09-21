import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { slug } = req.query;

  // 디버깅을 위한 상세 로그
  console.log("=== Market Positions API Debug ===");
  console.log("Slug value:", slug);
  console.log("Slug type:", typeof slug);

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!slug || typeof slug !== "string") {
    return res.status(400).json({ error: "Slug parameter is required" });
  }

  const backendUrl = "http://localhost:3001";

  try {
    console.log(
      `=== Frontend API: Fetching positions for market slug: ${slug} ===`
    );
    console.log(`Backend URL: ${backendUrl}/markets/positions/market/${slug}`);

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
    console.log(`Backend response ok: ${response.ok}`);

    if (!response.ok) {
      console.error(`Backend error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error("Backend error response:", errorText);
    }

    const data = await response.json();
    console.log("Backend response data:", data);
    console.log("Backend data type:", typeof data);
    console.log(
      "Backend data length:",
      Array.isArray(data) ? data.length : "Not an array"
    );

    res.status(response.status).json(data);
  } catch (error) {
    console.error("=== Frontend API Error ===");
    console.error("Market positions API Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

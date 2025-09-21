import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("=== User API Handler Called ===");
  console.log("Method:", req.method);
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);

  if (req.method !== "POST") {
    console.log("Method not allowed:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const backendUrl = "http://localhost:3001";
  console.log("Backend URL:", backendUrl);

  try {
    console.log("Making fetch request to backend...");
    const response = await fetch(`${backendUrl}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    console.log("Backend response status:", response.status);
    console.log(
      "Backend response headers:",
      Object.fromEntries(response.headers.entries())
    );

    const data = await response.json();
    console.log("Backend response data:", data);

    console.log("Sending response to client:", response.status, data);
    res.status(response.status).json(data);
  } catch (error) {
    console.error("=== User API Error ===");
    console.error("Error type:", typeof error);
    console.error(
      "Error message:",
      error instanceof Error ? error.message : String(error)
    );
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : undefined
    );
    console.error("Full error object:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

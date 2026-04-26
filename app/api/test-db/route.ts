import { NextResponse } from "next/server";
import { DATABASE_NAME } from "@/lib/database";
import clientPromise from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET() {
  try {
    const client = await clientPromise;
    console.log("Using DB:", DATABASE_NAME);
    await client.db(DATABASE_NAME).command({ ping: 1 });

    return NextResponse.json(
      { success: true, message: "MongoDB Atlas connection successful" },
      { status: 200 },
    );
  } catch (error) {
    console.error("MongoDB Atlas connection failed:", error);
    return NextResponse.json(
      { success: false, error: "MongoDB Atlas connection failed" },
      { status: 500 },
    );
  }
}
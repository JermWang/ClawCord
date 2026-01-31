import { NextRequest, NextResponse } from "next/server";
import { getAutopostService } from "@/lib/clawcord/autopost-service";

const autopostService = getAutopostService();

export async function GET() {
  return NextResponse.json({
    running: autopostService.isRunning(),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  try {
    switch (action) {
      case "start":
        autopostService.start();
        return NextResponse.json({
          success: true,
          message: "Autopost service started",
          running: true,
        });

      case "stop":
        autopostService.stop();
        return NextResponse.json({
          success: true,
          message: "Autopost service stopped",
          running: false,
        });

      case "scan":
        // Manual scan trigger
        const result = await autopostService.scanAndNotify();
        return NextResponse.json({
          success: true,
          ...result,
        });

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: start, stop, or scan" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Autopost error:", error);
    return NextResponse.json(
      { error: "Autopost operation failed" },
      { status: 500 }
    );
  }
}

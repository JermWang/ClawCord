import { NextRequest, NextResponse } from "next/server";
import { generateBotInviteUrl } from "@/lib/clawcord/discord-oauth";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const redirectUri = searchParams.get("redirect");

  try {
    const clientId = process.env.DISCORD_APPLICATION_ID;
    
    if (!clientId) {
      return NextResponse.json(
        { error: "Discord Application ID not configured" },
        { status: 500 }
      );
    }

    const inviteUrl = generateBotInviteUrl({
      clientId,
      redirectUri: redirectUri || undefined,
    });

    // If redirect param is set, redirect directly
    if (redirectUri) {
      return NextResponse.redirect(inviteUrl);
    }

    return NextResponse.json({
      success: true,
      inviteUrl,
      instructions: [
        "1. Click the invite URL to add ClawCord to your server",
        "2. Select the server and authorize permissions",
        "3. Use /clawcord install in any channel to complete setup",
        "4. Configure your policy with /clawcord policy",
        "5. Enable autopost with /clawcord autopost enabled:true",
      ],
    });
  } catch (error) {
    console.error("Failed to generate invite URL:", error);
    return NextResponse.json(
      { error: "Failed to generate invite URL" },
      { status: 500 }
    );
  }
}

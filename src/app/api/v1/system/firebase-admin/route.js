import { adminAuth } from "@/lib/firebase/admin";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return Response.json(
      {
        success: false,
        message: "Not found.",
      },
      {
        status: 404,
      },
    );
  }

  try {
    await adminAuth.listUsers(1);

    return Response.json({
      success: true,
      data: {
        service: "firebase-admin",
        connected: true,
      },
    });
  } catch (error) {
    console.error("[Firebase Admin Health Check]", error);

    return Response.json(
      {
        success: false,
        message: "Firebase Admin connection failed.",
      },
      {
        status: 500,
      },
    );
  }
}

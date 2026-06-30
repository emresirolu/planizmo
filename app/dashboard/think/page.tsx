import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ThinkRoom from "@/components/daybook/ThinkRoom";

export default async function ThinkPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  return <ThinkRoom />;
}

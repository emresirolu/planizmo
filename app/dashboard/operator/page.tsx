import { redirect } from "next/navigation";
import { auth } from "@/auth";
import OperatorRoom from "@/components/daybook/OperatorRoom";

export default async function OperatorPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  return <OperatorRoom />;
}

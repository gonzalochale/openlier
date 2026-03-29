"use client";

import { LogOut } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  return (
    <DropdownMenuItem
      variant="destructive"
      onClick={() =>
        authClient.signOut({
          fetchOptions: { onSuccess: () => router.push("/") },
        })
      }
    >
      <LogOut />
      Sign out
    </DropdownMenuItem>
  );
}

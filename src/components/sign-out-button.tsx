import { signOut } from "@/lib/auth";
import { IconLogout } from "@/components/icons";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button type="submit" title="Sair" className="btn btn-ghost btn-sm px-2">
        <IconLogout size={16} />
      </button>
    </form>
  );
}

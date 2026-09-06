import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "TEAM";
    } & DefaultSession["user"];
  }

  interface User {
    role: "ADMIN" | "TEAM";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "TEAM";
  }
}

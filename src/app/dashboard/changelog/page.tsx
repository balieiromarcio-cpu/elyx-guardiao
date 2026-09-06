import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ChangelogPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const changes = await prisma.changeLog.findMany({ orderBy: { createdAt: "desc" }, take: 300 });

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Auditoria</p>
        <h1 className="h1 mt-1">Changelog</h1>
        <p className="lede mt-1">Toda mudança de fato — quem, quando, campo, valor antigo, valor novo, origem e aprovação. Nada aqui é editado ou apagado.</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Quando</th>
              <th className="px-3 py-2 font-medium">Entidade</th>
              <th className="px-3 py-2 font-medium">Campo</th>
              <th className="px-3 py-2 font-medium">De</th>
              <th className="px-3 py-2 font-medium">Para</th>
              <th className="px-3 py-2 font-medium">Origem</th>
              <th className="px-3 py-2 font-medium">Por</th>
              <th className="px-3 py-2 font-medium">Aprovado por</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((c) => (
              <tr key={c.id} className="border-b border-line/60">
                <td className="px-3 py-2 whitespace-nowrap text-xs text-muted">{c.createdAt.toLocaleString("pt-BR")}</td>
                <td className="px-3 py-2"><span className="badge badge-muted">{c.entity}</span></td>
                <td className="px-3 py-2">{c.field}</td>
                <td className="max-w-[200px] truncate px-3 py-2 text-muted" title={c.oldValue ?? ""}>{c.oldValue ?? "—"}</td>
                <td className="max-w-[200px] truncate px-3 py-2" title={c.newValue ?? ""}>{c.newValue ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{c.origin.toLowerCase()}</td>
                <td className="px-3 py-2 text-xs">{c.changedBy ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{c.approvedBy ?? "—"}</td>
              </tr>
            ))}
            {changes.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-xs text-muted">Nada registrado ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

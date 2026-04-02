import { cookies } from "next/headers";
import { readLandingContent } from "../lib/content";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_VALUE } from "../lib/admin-auth";
import AdminEditor from "./components/AdminEditor";
import "../page.css";
import "./admin.css";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminPage({ searchParams }: Props) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const isLoggedIn = cookieStore.get(ADMIN_SESSION_COOKIE)?.value === ADMIN_SESSION_VALUE;

  if (!isLoggedIn) {
    return (
      <main className="admin-wrap">
        <section className="admin-login-card">
          <h1>Admin Login</h1>
          <p className="admin-sub">/admin sahifasiga kirish uchun login va password kiriting.</p>
          {params.error === "login" && <p className="admin-err">Login yoki password noto'g'ri.</p>}

          <form className="admin-login-form" action="/admin/login" method="post">
            <label htmlFor="login">Login</label>
            <input id="login" name="login" placeholder="admin" required />

            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" placeholder="********" required />

            <button type="submit">Kirish</button>
          </form>
        </section>
      </main>
    );
  }

  const content = readLandingContent();
  return (
    <main className="admin-wrap">
      <AdminEditor initialContent={content} />
    </main>
  );
}

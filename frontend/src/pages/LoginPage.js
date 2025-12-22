import Layout from "../components/Layout";

// Point directly to the Spring Boot backend (port 8080)
const GOOGLE_AUTH_URL = "http://localhost:8080/oauth2/authorization/google";

export default function LoginPage() {
  return (
    <Layout hideNav>
      <div className="flex flex-col items-center justify-center h-[80vh] gap-10">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">שעות נוכחות</h1>
          <p className="text-slate-500 text-sm">
            דרך נוחה ופשוטה למעקב אחר משמרות ושכר, במיוחד לעובדי מחלקת ביטחון. 😉
          </p>
        </div>

        <div className="w-full space-y-4">
          <a
            href={GOOGLE_AUTH_URL}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary text-white py-3 text-sm font-medium shadow-soft"
          >
            <span>התחברות עם Google</span>
          </a>
        </div>
      </div>
    </Layout>
  );
}


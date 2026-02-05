import BottomNav from "./BottomNav";

export default function Layout({ children, hideNav = false }) {
  return (
    <div className="min-h-screen bg-skin-bg-secondary flex flex-col items-stretch">
      <main className="flex-1 pb-32">
        <div className="max-w-md mx-auto px-4 pt-6 pb-4">{children}</div>
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
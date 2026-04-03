import { Link, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="min-h-screen bg-dark-bg">
      <header className="border-b border-dark-border bg-dark-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 no-underline">
            <span className="text-2xl">&#9876;&#65039;</span>
            <h1 className="pixel-font text-accent-green text-sm md:text-base m-0">
              GitHub Battle
            </h1>
          </Link>
          <Link
            to="/create"
            className="pixel-font text-xs bg-accent-green/20 text-accent-green border border-accent-green/50 px-4 py-2 rounded hover:bg-accent-green/30 transition-colors no-underline"
          >
            + New Battle
          </Link>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

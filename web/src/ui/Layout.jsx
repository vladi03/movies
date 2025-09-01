import Header from './Header.jsx';
import Footer from './Footer.jsx';

export default function Layout({ children, search, onSearchChange }) {
  return (
    <div className="min-h-screen flex flex-col bg-base-100 text-base-content">
      <Header search={search} onSearchChange={onSearchChange} />
      <main className="flex-1 container mx-auto p-4">{children}</main>
      <Footer />
    </div>
  );
}

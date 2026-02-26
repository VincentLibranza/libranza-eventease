import "./globals.css";

export const metadata = {
  title: "EventEase | Manage Events Effortlessly",
  description: "A complete event management system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav className="bg-white shadow-md p-4 flex justify-between items-center px-10">
          <div className="text-2xl font-bold text-blue-600">EventEase</div>
          <div className="space-x-6">
            <a href="/" className="hover:text-blue-600">Home</a>
            <a href="/events" className="hover:text-blue-600">Events</a>
            <a href="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg">Login</a>
          </div>
        </nav>
        <main className="min-h-screen">{children}</main>
        <footer className="p-10 bg-gray-900 text-white text-center">
          &copy; 2023 EventEase System. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
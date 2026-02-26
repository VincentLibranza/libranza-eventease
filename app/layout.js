import "./globals.css";

export const metadata = {
  title: "EventEase",
  description: "AI Event Management",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
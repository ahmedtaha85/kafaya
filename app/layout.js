import "./globals.css";
export const metadata = { title: "KAFAYA BOUTIQUE", description: "Nidaamka maamulka alaabta" };
export default function RootLayout({ children }) {
  return (
    <html lang="so"><head>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Inter:wght@400;500;600&display=swap" />
    </head><body>{children}</body></html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aula de C# - Plataforma de Ensino",
  description: "Plataforma interativa para aulas de C#",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full" style={{ background: '#0d1117', color: '#e6edf3' }}>{children}</body>
    </html>
  );
}

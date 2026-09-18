import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal Clínico — Las Mellizas Perú S.A.C.",
  description: "Sistema Integral de Admisión, Historia Clínica Electrónica y Caja",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
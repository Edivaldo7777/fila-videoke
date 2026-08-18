import "./globals.css";

export const metadata = {
  title: "Fila Videokê",
  description: "Sistema de fila de videokê",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
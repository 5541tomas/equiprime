import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import WelcomeOffer from "@/components/WelcomeOffer";
import { STORE } from "@/lib/config";
import { getCategories } from "@/lib/catalog";
import { categoryTree } from "@/lib/catalog";

const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });
const body = Montserrat({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });

export const metadata: Metadata = {
  metadataBase: new URL(STORE.url),
  title: { default: "Equi Prime — Moda Equestre e Mimos para o Cavalo", template: "%s | Equi Prime" },
  description:
    "Moda equestre (Pomme, Maximilian Equestrian, Equestro) e mimos para o cavalo (Likit, Stud Muffins, Horslyx), além de equipamento e cuidados. Envios para Portugal, ilhas e Europa.",
  openGraph: { siteName: "Equi Prime", locale: "pt_PT", type: "website" },
  icons: { icon: "/brand/icon.png" },
};

export const revalidate = 300;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tree = categoryTree(await getCategories());
  return (
    <html lang="pt-PT" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen">
        <StoreProvider>
          <Header tree={tree} />
          <main>{children}</main>
          <Footer tree={tree} />
          <CartDrawer />
          <WelcomeOffer />
        </StoreProvider>
      </body>
    </html>
  );
}

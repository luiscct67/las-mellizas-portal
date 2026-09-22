import SplitLoginView from "@/components/auth/SplitLoginView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal Clínico — Las Mellizas Perú S.A.C.",
  description: "Consultorio Obstétrico Ecográfico. Acceso seguro al Portal Clínico y Financiero.",
};

export default function HomePage() {
  return <SplitLoginView />;
}
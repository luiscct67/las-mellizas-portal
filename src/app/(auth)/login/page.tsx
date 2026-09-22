import SplitLoginView from "@/components/auth/SplitLoginView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acceso Clínico — Las Mellizas Perú S.A.C.",
  description: "Autenticación segura Zero Trust para personal asistencial y administrativo.",
};

export default function LoginPage() {
  return <SplitLoginView />;
}
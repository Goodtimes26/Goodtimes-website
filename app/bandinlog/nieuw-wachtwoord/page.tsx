import type { Metadata } from "next";
import { ResetPassword } from "./ResetPassword";

export const metadata: Metadata = {
  title: "Nieuw wachtwoord | GoodTimes",
  robots: { index: false, follow: false },
};

export default function NewPasswordPage() {
  return <ResetPassword />;
}

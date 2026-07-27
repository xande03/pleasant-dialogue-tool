import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";

const MOBILE_MAX = 768;

export default function MobileOnlyGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

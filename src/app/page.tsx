import type { Metadata } from "next";
import { VillaExperience } from "@/components/villa/VillaExperience";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return <VillaExperience />;
}

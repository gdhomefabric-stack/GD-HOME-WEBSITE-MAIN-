import type { Metadata } from "next";
import { VillaExperience } from "@/components/villa/VillaExperience";

export const metadata: Metadata = {
  title: "The Villa in 3D",
  description:
    "Walk through eight rooms at eye level. Open and close the curtains, change fabric, colour, heading, length and lining, switch between daylight, sunset and night, and dress the beds in goose feather pillows.",
  alternates: { canonical: "/villa/" },
};

export default function VillaPage() {
  return <VillaExperience />;
}

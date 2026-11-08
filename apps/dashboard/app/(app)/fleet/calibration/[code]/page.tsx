"use client";

import { useParams } from "next/navigation";
import { CalibrationDetailPage } from "@/features/fleet/calibration-detail-page";

export default function Page() {
  const params = useParams<{ code: string }>();
  return <CalibrationDetailPage code={decodeURIComponent(params.code)} />;
}

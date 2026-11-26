import { Suspense } from "react";
import { TutorClient } from "@/components/TutorClient";
import { Spinner } from "@/components/ui";

export default function TutorPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <TutorClient />
    </Suspense>
  );
}

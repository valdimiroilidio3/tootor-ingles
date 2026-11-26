import { LessonRunner } from "@/components/LessonRunner";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LessonRunner id={id} />;
}

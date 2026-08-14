import GharsahLoader from "@/app/components/ui/GharsahLoader";

export default function Loading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <GharsahLoader size={112} />
    </div>
  );
}

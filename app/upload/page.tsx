import UploadForm from "@/components/UploadForm";

export default function UploadPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-1">Add CVs</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Upload one or more CVs (PDF or DOCX). Pick which role(s) to score each one against.
      </p>
      <UploadForm />
    </div>
  );
}

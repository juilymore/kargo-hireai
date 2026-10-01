import { getRubricCriteria } from "@/lib/rubric-weights";
import RubricTable from "@/components/RubricTable";

export default async function RubricsPage() {
  const criteria = await getRubricCriteria();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100">Scoring Rubric</h1>
        <p className="text-sm text-neutral-400">
          How much each criterion is worth, out of 100. Edit the points or the description, then
          Save — new scores will use these weights. JD criteria must total 40; Arjun-pattern
          criteria (excluding the B9 deduction) must total 60.
        </p>
      </div>
      <RubricTable initialCriteria={criteria} />
    </div>
  );
}

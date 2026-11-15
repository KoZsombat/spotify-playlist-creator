import { CreateWizard } from "@/components/create/create-wizard";

export const metadata = { title: "Create a playlist — Crate" };

export default function CreatePage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Creator</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Build a playlist from a sentence
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Four steps: the basics, a description in your own words, optional anchors,
          then review. Nothing is written to Spotify until you press publish.
        </p>
      </header>
      <CreateWizard />
    </div>
  );
}

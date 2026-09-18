import AppLayout from "@/components/layout/app-layout";

export default function ActivityDetailsPage({ params }: { params: { id: string } }) {
  return (
    <AppLayout platform="ngo">
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <h2 className="text-3xl font-bold tracking-tight">Activity {params.id}</h2>
        <p>Details for activity {params.id} go here.</p>
      </main>
    </AppLayout>
  );
}

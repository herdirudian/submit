import { getFormById } from "@/actions/form";
import FormBuilderContext from "@/components/FormBuilder/FormBuilderContext";
import { notFound } from "next/navigation";

export default async function BuilderPage({ params }: { params: { id: string } }) {
  const { id } = params;
  
  console.log(`[BUILDER] Rendering builder for form ID: ${id}`);
  
  try {
    const form = await getFormById(id);

    if (!form) {
      console.error(`[BUILDER] Form with ID ${id} not found or unauthorized`);
      notFound();
    }

    return <FormBuilderContext form={form} />;
  } catch (error) {
    console.error(`[BUILDER] Error rendering builder for ID ${id}:`, error);
    throw error; // Let Next.js handle it, but at least we have logs
  }
}

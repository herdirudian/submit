import { getFormById } from "@/actions/form";
import FormBuilderContext from "@/components/FormBuilder/FormBuilderContext";
import { notFound } from "next/navigation";

export default async function BuilderPage({ params }: { params: { id: string } }) {
  // Await params before accessing its properties
  const { id } = await params;
  
  const form = await getFormById(id);

  if (!form) {
    notFound();
  }

  return <FormBuilderContext form={form} />;
}

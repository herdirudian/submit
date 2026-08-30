import { getPollById } from "@/actions/poll";
import { notFound } from "next/navigation";
import PollBuilderContext from "@/components/PollBuilder/PollBuilderContext";

export default async function PollBuilderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    
    try {
        const poll = await getPollById(id);

        if (!poll) {
            notFound();
        }

        return <PollBuilderContext poll={poll} />;
    } catch (error) {
        console.error(`[POLL BUILDER] Error rendering builder for ID ${id}:`, error);
        notFound();
    }
}

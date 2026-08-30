import { getPollBySlug } from "@/actions/poll";
import { notFound } from "next/navigation";
import PublicPollRenderer from "@/components/PublicPollRenderer";

export default async function PublicPollPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    
    try {
        const poll = await getPollBySlug(slug);

        if (!poll) {
            notFound();
        }

        // We need to fetch settings for branding
        // But for now, let's just pass the poll
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-10">
                <div className="w-full max-w-4xl">
                    <PublicPollRenderer poll={poll as any} />
                </div>
            </div>
        );
    } catch (error) {
        console.error(`[PUBLIC POLL] Error rendering poll for slug ${slug}:`, error);
        notFound();
    }
}
